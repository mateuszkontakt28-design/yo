// GET  /api/channels        -> lista kanałów z policzonymi polami
// POST /api/channels        -> tworzy kanał
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabase, CHANNELS_TABLE } from "../_lib/supabase";
import { decorate } from "../_lib/compute";
import { applyCors, requireApiToken, parseBody, wrap } from "../_lib/http";
import { buildInsert } from "../_lib/validate";
import type { ChannelRow } from "../_lib/types";

export default wrap(async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!requireApiToken(req, res)) return;

  const supabase = getSupabase();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from(CHANNELS_TABLE)
      .select("*")
      .order("id", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json((data as ChannelRow[]).map(decorate));
  }

  if (req.method === "POST") {
    const built = buildInsert(parseBody(req));
    if ("error" in built) return res.status(400).json({ error: built.error });

    const { data, error } = await supabase
      .from(CHANNELS_TABLE)
      .insert(built.data)
      .select("*")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(decorate(data as ChannelRow));
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  return res.status(405).json({ error: "Metoda niedozwolona." });
});
