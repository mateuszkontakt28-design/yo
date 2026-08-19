// GET  /api/channels        -> lista kanałów z policzonymi polami
// POST /api/channels        -> tworzy kanał
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listChannels, insertChannel } from "../_lib/db";
import { decorate } from "../_lib/compute";
import { applyCors, requireApiToken, parseBody, wrap } from "../_lib/http";
import { buildInsert } from "../_lib/validate";

export default wrap(async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!requireApiToken(req, res)) return;

  if (req.method === "GET") {
    const rows = await listChannels();
    return res.status(200).json(rows.map(decorate));
  }

  if (req.method === "POST") {
    const built = buildInsert(parseBody(req));
    if ("error" in built) return res.status(400).json({ error: built.error });

    const row = await insertChannel(built.data);
    return res.status(201).json(decorate(row));
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  return res.status(405).json({ error: "Metoda niedozwolona." });
});
