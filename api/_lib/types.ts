// Współdzielone typy backendu.

export type Pace = "green" | "orange" | "red";

// Wiersz tabeli `channels` (kształt z Supabase).
export interface ChannelRow {
  id: number;
  name: string;
  niche: string | null;
  handle: string | null;
  youtube_channel_id: string | null;
  sub_goal: number;
  view_goal: number;
  start_date: string; // YYYY-MM-DD
  target_date: string; // YYYY-MM-DD
  current_subs: number;
  current_views: number;
  subs_updated_at: string | null;
  views_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

// Pola policzone po stronie API i doklejane do wiersza.
export interface ComputedFields {
  days_left: number; // >= 0 (przycięte)
  days_total: number;
  pct_subs: number; // 0..100
  pct_views: number; // 0..100
  completion_pct: number; // min(pct_subs, pct_views)
  elapsed_pct: number; // 0..100
  pace: Pace;
  overdue: boolean;
}

export type Channel = ChannelRow & ComputedFields;

// Odchudzony JSON dla widgetu Scriptable.
export interface WidgetPayload {
  name: string;
  days_left: number;
  completion_pct: number;
  pct_subs: number;
  pct_views: number;
  pace: Pace;
}
