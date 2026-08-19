// PUT    /api/channels/{id}  -> edycja (w tym ręczny wpis current_views)
// DELETE /api/channels/{id}  -> usuwa kanał
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { updateChannel, deleteChannel } from "../_lib/db";
import { decorate } from "../_lib/compute";
import { applyCors, requireApiToken, parseBody, firstParam, wrap } from "../_lib/http";
import { buildUpdate } from "../_lib/validate";

export default wrap(async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!requireApiToken(req, res)) return;

  const id = Number(firstParam(req.query.id));
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Nieprawidłowe id." });
  }

  if (req.method === "PUT") {
    const built = buildUpdate(parseBody(req));
    if ("error" in built) return res.status(400).json({ error: built.error });

    const row = await updateChannel(id, built.data);
    if (!row) return res.status(404).json({ error: "Nie znaleziono kanału." });
    return res.status(200).json(decorate(row));
  }

  if (req.method === "DELETE") {
    const ok = await deleteChannel(id);
    if (!ok) return res.status(404).json({ error: "Nie znaleziono kanału." });
    return res.status(200).json({ ok: true, id });
  }

  res.setHeader("Allow", "PUT, DELETE, OPTIONS");
  return res.status(405).json({ error: "Metoda niedozwolona." });
});
