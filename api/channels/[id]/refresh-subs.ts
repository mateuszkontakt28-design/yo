// POST /api/channels/{id}/refresh-subs
// v1: auto-suby są WYŁĄCZONE dopóki nie ustawisz YOUTUBE_API_KEY w env.
// Logika jest już w pełni napisana — wystarczy dodać klucz Data API i youtube_channel_id kanału,
// żeby zadziałała bez zmian w kodzie.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabase, CHANNELS_TABLE } from "../../_lib/supabase";
import { decorate } from "../../_lib/compute";
import { applyCors, requireApiToken, firstParam } from "../../_lib/http";
import type { ChannelRow } from "../../_lib/types";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const supabase = getSupabase();

  // Pobierz kanał, sprawdź youtube_channel_id.
  const { data: row, error: fetchErr } = await supabase
    .from(CHANNELS_TABLE)
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !row) return res.status(404).json({ error: "Nie znaleziono kanału." });

  const channel = row as ChannelRow;
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

  const { data: updated, error: updErr } = await supabase
    .from(CHANNELS_TABLE)
    .update({ current_subs: subs, subs_updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (updErr) return res.status(500).json({ error: updErr.message });

  return res.status(200).json(decorate(updated as ChannelRow));
}
