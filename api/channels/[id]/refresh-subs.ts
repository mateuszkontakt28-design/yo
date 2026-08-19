// POST /api/channels/{id}/refresh-subs
// v1: auto-suby są WYŁĄCZONE dopóki nie ustawisz YOUTUBE_API_KEY w env.
// Logika jest już w pełni napisana — wystarczy dodać klucz Data API i youtube_channel_id kanału,
// żeby zadziałała bez zmian w kodzie.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getChannel, updateChannel } from "../../_lib/db";
import { decorate } from "../../_lib/compute";
import { applyCors, requireApiToken, firstParam, wrap } from "../../_lib/http";

export default wrap(async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!requireApiToken(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Metoda niedozwolona." });
  }

  const id = Number(firstParam(req.query.id));
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Nieprawidłowe id." });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    // v1 ręczne: brak klucza => auto-suby nieaktywne.
    return res.status(501).json({
      error:
        "Auto-suby wyłączone. Ustaw YOUTUBE_API_KEY w zmiennych środowiskowych, aby aktywować odświeżanie subów.",
    });
  }

  // Pobierz kanał, sprawdź youtube_channel_id.
  const channel = await getChannel(id);
  if (!channel) return res.status(404).json({ error: "Nie znaleziono kanału." });

  if (!channel.youtube_channel_id) {
    return res
      .status(400)
      .json({ error: "Kanał nie ma youtube_channel_id — ustaw go, żeby pobierać suby." });
  }

  // YouTube Data API v3: channels.list?part=statistics
  const url =
    `https://www.googleapis.com/youtube/v3/channels?part=statistics` +
    `&id=${encodeURIComponent(channel.youtube_channel_id)}&key=${encodeURIComponent(apiKey)}`;

  let subs: number;
  try {
    const ytRes = await fetch(url);
    if (!ytRes.ok) {
      const text = await ytRes.text();
      return res.status(502).json({ error: `YouTube API błąd ${ytRes.status}: ${text.slice(0, 200)}` });
    }
    const json = (await ytRes.json()) as {
      items?: Array<{ statistics?: { subscriberCount?: string } }>;
    };
    const count = json.items?.[0]?.statistics?.subscriberCount;
    if (count === undefined) {
      return res.status(404).json({ error: "YouTube API nie zwróciło statystyk dla tego kanału." });
    }
    subs = Number(count);
  } catch (e) {
    return res.status(502).json({ error: `Błąd połączenia z YouTube API: ${(e as Error).message}` });
  }

  const updated = await updateChannel(id, {
    current_subs: subs,
    subs_updated_at: new Date().toISOString(),
  });
  if (!updated) return res.status(404).json({ error: "Nie znaleziono kanału." });

  return res.status(200).json(decorate(updated));
});
