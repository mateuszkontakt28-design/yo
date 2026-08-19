// PUT    /api/channels/{id}  -> edycja (w tym ręczny wpis current_views)
// DELETE /api/channels/{id}  -> usuwa kanał
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabase, CHANNELS_TABLE } from "../_lib/supabase";
import { decorate } from "../_lib/compute";
import { applyCors, requireApiToken, parseBody, firstParam, wrap } from "../_lib/http";
import { buildUpdate } from "../_lib/validate";
import type { ChannelRow } from "../_lib/types";

export default wrap(async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!requireApiToken(req, res)) return;

  const id = Number(firstParam(req.query.id));
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Nieprawidłowe id." });
  }

  const supabase = getSupabase();

  if (req.method === "PUT") {
    const built = buildUpdate(parseBody(req));
    if ("error" in built) return res.status(400).json({ error: built.error });

    const { data, error } = await supabase
      .from(CHANNELS_TABLE)
      .update(built.data)
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ error: "Nie znaleziono kanału." });
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(decorate(data as ChannelRow));
  }

  if (req.method === "DELETE") {
    const { data, error } = await supabase
      .from(CHANNELS_TABLE)
      .delete()
      .eq("id", id)
      .select("id");
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: "Nie znaleziono kanału." });
    return res.status(200).json({ ok: true, id });
  }

  res.setHeader("Allow", "PUT, DELETE, OPTIONS");
  return res.status(405).json({ error: "Metoda niedozwolona." });
});
