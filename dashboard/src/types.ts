export type Pace = "green" | "orange" | "red";

export interface Channel {
  id: number;
  name: string;
  niche: string | null;
  handle: string | null;
  youtube_channel_id: string | null;
  sub_goal: number;
  view_goal: number;
  start_date: string;
  target_date: string;
  current_subs: number;
  current_views: number;
  subs_updated_at: string | null;
  views_updated_at: string | null;
  created_at: string;
  updated_at: string;
  // policzone przez API
  days_left: number;
  days_total: number;
  pct_subs: number;
  pct_views: number;
  completion_pct: number;
  elapsed_pct: number;
  pace: Pace;
  overdue: boolean;
}

// Pola formularza (create/edit).
export interface ChannelFormData {
  name: string;
  niche: string;
  handle: string;
  youtube_channel_id: string;
  sub_goal: number;
  view_goal: number;
  start_date: string;
  target_date: string;
  current_subs: number;
  current_views: number;
}
