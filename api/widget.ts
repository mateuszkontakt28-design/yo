// GET /api/widget?key=SECRET&channel={id|next}
// Publiczny endpoint dla widgetu Scriptable. Chroniony statycznym kluczem w query.
// Zwraca odchudzony JSON. channel=next => rotacja po kanałach wg bieżącej minuty.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabase, CHANNELS_TABLE } from "./_lib/supabase";
import { decorate } from "./_lib/compute";
import { applyCors, requireWidgetKey, firstParam, wrap } from "./_lib/http";
import type { ChannelRow, WidgetPayload } from "./_lib/types";

export default wrap(async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!requireWidgetKey(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Metoda niedozwolona." });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(CHANNELS_TABLE)
    .select("*")
    .order("id", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });

  const rows = (data as ChannelRow[]) ?? [];
  if (rows.length === 0) return res.status(404).json({ error: "Brak kanałów." });

  const channelParam = (firstParam(req.query.channel) || "next").toLowerCase();

  let picked: ChannelRow | undefined;
  if (channelParam === "next" || channelParam === "") {
    // Rotacja: indeks z bieżącej minuty, żeby widget cyklował po kanałach.
    const minute = Math.floor(Date.now() / 60_000);
    picked = rows[minute % rows.length];
  } else {
    const id = Number(channelParam);
    picked = Number.isFinite(id) ? rows.find((r) => r.id === id) : undefined;
  }

  if (!picked) return res.status(404).json({ error: "Nie znaleziono kanału." });

  const c = decorate(picked);
  const payload: WidgetPayload = {
    name: c.name,
    days_left: c.days_left,
    completion_pct: c.completion_pct,
    pct_subs: c.pct_subs,
    pct_views: c.pct_views,
    pace: c.pace,
  };

  // Krótki cache na brzegu, żeby nie bić bazy przy każdym odświeżeniu widgetu.
  res.setHeader("Cache-Control", "public, max-age=30, s-maxage=30");
  return res.status(200).json(payload);
});
