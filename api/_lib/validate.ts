// Walidacja i budowa payloadów zapisu dla tabeli channels.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function int(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

// Zbuduj payload do INSERT. Zwraca { error } albo { data }.
export function buildInsert(
  body: Record<string, unknown>
): { error: string } | { data: Record<string, unknown> } {
  const name = str(body.name);
  if (!name) return { error: "Pole 'name' jest wymagane." };

  const target_date = str(body.target_date);
  if (!target_date || !DATE_RE.test(target_date)) {
    return { error: "Pole 'target_date' (YYYY-MM-DD) jest wymagane." };
  }

  const start_date = str(body.start_date);
  if (start_date && !DATE_RE.test(start_date)) {
    return { error: "'start_date' musi być w formacie YYYY-MM-DD." };
  }

  const data: Record<string, unknown> = {
    name,
    niche: str(body.niche),
    handle: str(body.handle),
    youtube_channel_id: str(body.youtube_channel_id),
    target_date,
  };
  if (start_date) data.start_date = start_date;

  const sub_goal = int(body.sub_goal);
  if (sub_goal !== null) data.sub_goal = sub_goal;
  const view_goal = int(body.view_goal);
  if (view_goal !== null) data.view_goal = view_goal;
  const current_subs = int(body.current_subs);
  if (current_subs !== null) data.current_subs = current_subs;
  const current_views = int(body.current_views);
  if (current_views !== null) data.current_views = current_views;

  return { data };
}

// Zbuduj payload do UPDATE (tylko obecne pola). Gdy dochodzi current_views -> stempluj views_updated_at.
export function buildUpdate(
  body: Record<string, unknown>
): { error: string } | { data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};

  if ("name" in body) {
    const name = str(body.name);
    if (!name) return { error: "'name' nie może być puste." };
    data.name = name;
  }
  if ("niche" in body) data.niche = str(body.niche);
  if ("handle" in body) data.handle = str(body.handle);
  if ("youtube_channel_id" in body) data.youtube_channel_id = str(body.youtube_channel_id);

  for (const key of ["start_date", "target_date"] as const) {
    if (key in body) {
      const d = str(body[key]);
      if (!d || !DATE_RE.test(d)) return { error: `'${key}' musi być w formacie YYYY-MM-DD.` };
      data[key] = d;
    }
  }

  for (const key of ["sub_goal", "view_goal", "current_subs"] as const) {
    if (key in body) {
      const n = int(body[key]);
      if (n === null) return { error: `'${key}' musi być liczbą.` };
      data[key] = n;
    }
  }

  // Ręczny wpis rolling-90d views -> stempel czasu.
  if ("current_views" in body) {
    const n = int(body.current_views);
    if (n === null) return { error: "'current_views' musi być liczbą." };
    data.current_views = n;
    data.views_updated_at = new Date().toISOString();
  }

  if (Object.keys(data).length === 0) {
    return { error: "Brak pól do aktualizacji." };
  }
  return { data };
}
