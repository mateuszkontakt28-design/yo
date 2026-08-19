// Klient Supabase z service_role key. Używać WYŁĄCZNIE w funkcjach serverless (nigdy w przeglądarce).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "Brak SUPABASE_URL lub SUPABASE_SERVICE_KEY w zmiennych środowiskowych."
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export const CHANNELS_TABLE = "channels";
