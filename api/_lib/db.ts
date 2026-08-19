// Dostęp do bazy przez Supabase REST API (PostgREST) — bez zależności npm.
// Service key omija RLS. `fetch` jest globalny na Node 18+ (Vercel).
import type { ChannelRow } from "./types";

function cfg() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("Brak SUPABASE_URL lub SUPABASE_SERVICE_KEY w zmiennych środowiskowych.");
  }
  return { url: url.replace(/\/+$/, ""), key };
}

function headers(key: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function fail(res: Response): Promise<never> {
  let msg = `Supabase ${res.status}`;
  try {
    const j = (await res.json()) as Record<string, unknown>;
    msg = (j.message as string) || (j.error as string) || (j.hint as string) || JSON.stringify(j);
  } catch {
    /* ignore */
  }
  throw new Error(msg);
}

export async function listChannels(): Promise<ChannelRow[]> {
  const { url, key } = cfg();
  const res = await fetch(`${url}/rest/v1/channels?select=*&order=id.asc`, {
    headers: headers(key),
  });
  if (!res.ok) return fail(res);
  return (await res.json()) as ChannelRow[];
}

export async function getChannel(id: number): Promise<ChannelRow | null> {
  const { url, key } = cfg();
  const res = await fetch(`${url}/rest/v1/channels?select=*&id=eq.${id}`, {
    headers: headers(key),
  });
  if (!res.ok) return fail(res);
  const rows = (await res.json()) as ChannelRow[];
  return rows[0] ?? null;
}

export async function insertChannel(data: Record<string, unknown>): Promise<ChannelRow> {
  const { url, key } = cfg();
  const res = await fetch(`${url}/rest/v1/channels`, {
    method: "POST",
    headers: headers(key, { Prefer: "return=representation" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) return fail(res);
  const rows = (await res.json()) as ChannelRow[];
  return rows[0];
}

export async function updateChannel(
  id: number,
  data: Record<string, unknown>
): Promise<ChannelRow | null> {
  const { url, key } = cfg();
  const res = await fetch(`${url}/rest/v1/channels?id=eq.${id}`, {
    method: "PATCH",
    headers: headers(key, { Prefer: "return=representation" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) return fail(res);
  const rows = (await res.json()) as ChannelRow[];
  return rows[0] ?? null;
}

export async function deleteChannel(id: number): Promise<boolean> {
  const { url, key } = cfg();
  const res = await fetch(`${url}/rest/v1/channels?id=eq.${id}`, {
    method: "DELETE",
    headers: headers(key, { Prefer: "return=representation" }),
  });
  if (!res.ok) return fail(res);
  const rows = (await res.json()) as ChannelRow[];
  return rows.length > 0;
}
