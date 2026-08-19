import type { Channel, ChannelFormData } from "./types";

const BASE = (import.meta.env.VITE_API_BASE as string) || "/api";
const TOKEN = (import.meta.env.VITE_API_TOKEN as string) || "";

function headers(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (TOKEN) h["Authorization"] = `Bearer ${TOKEN}`;
  return h;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Błąd ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  list(): Promise<Channel[]> {
    return fetch(`${BASE}/channels`, { headers: headers() }).then(handle<Channel[]>);
  },

  create(data: ChannelFormData): Promise<Channel> {
    return fetch(`${BASE}/channels`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(data),
    }).then(handle<Channel>);
  },

  update(id: number, data: Partial<ChannelFormData>): Promise<Channel> {
    return fetch(`${BASE}/channels/${id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(data),
    }).then(handle<Channel>);
  },

  remove(id: number): Promise<{ ok: boolean; id: number }> {
    return fetch(`${BASE}/channels/${id}`, {
      method: "DELETE",
      headers: headers(),
    }).then(handle<{ ok: boolean; id: number }>);
  },

  refreshSubs(id: number): Promise<Channel> {
    return fetch(`${BASE}/channels/${id}/refresh-subs`, {
      method: "POST",
      headers: headers(),
    }).then(handle<Channel>);
  },
};
