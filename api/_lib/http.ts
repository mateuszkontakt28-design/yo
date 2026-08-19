// Pomocniki HTTP: CORS, auth (token dla CRUD, key dla widgetu), parsowanie body.
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Owija handler tak, że żaden wyjątek nie crashuje funkcji (FUNCTION_INVOCATION_FAILED),
// tylko zwraca czytelny JSON 500 z komunikatem — ułatwia diagnozę.
export function wrap(
  fn: (req: VercelRequest, res: VercelResponse) => Promise<unknown> | unknown
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      await fn(req, res);
    } catch (e) {
      const err = e as Error;
      if (!res.headersSent) {
        res.status(500).json({
          error: err?.message || String(e),
          where: "handler",
        });
      }
    }
  };
}

// Dashboard i /api są zwykle na tej samej domenie Vercela (same-origin, CORS zbędny),
// ale gdy dashboard stoi osobno — pozwalamy na *. Endpointy CRUD i tak chroni token.
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true; // obsłużone (preflight)
  }
  return false;
}

// Prosty bearer-token dla CRUD API. Zwraca true jeśli OK, w przeciwnym razie odpowiada 401.
export function requireApiToken(req: VercelRequest, res: VercelResponse): boolean {
  const expected = process.env.API_TOKEN;
  if (!expected) {
    // Brak tokenu w env = błąd konfiguracji, nie wpuszczamy.
    res.status(500).json({ error: "API_TOKEN nie ustawiony na serwerze." });
    return false;
  }
  const header = req.headers.authorization || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (provided !== expected) {
    res.status(401).json({ error: "Brak autoryzacji." });
    return false;
  }
  return true;
}

// Statyczny klucz w query dla publicznego /api/widget.
export function requireWidgetKey(req: VercelRequest, res: VercelResponse): boolean {
  const expected = process.env.WIDGET_KEY;
  if (!expected) {
    res.status(500).json({ error: "WIDGET_KEY nie ustawiony na serwerze." });
    return false;
  }
  const key = firstParam(req.query.key);
  if (key !== expected) {
    res.status(401).json({ error: "Nieprawidłowy klucz." });
    return false;
  }
  return true;
}

export function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

// Body w Vercel bywa stringiem lub obiektem — normalizujemy do obiektu.
export function parseBody(req: VercelRequest): Record<string, unknown> {
  const b = req.body;
  if (!b) return {};
  if (typeof b === "string") {
    try {
      return JSON.parse(b) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof b === "object") return b as Record<string, unknown>;
  return {};
}
