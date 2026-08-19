// Logika liczenia postępu monetyzacji. Zwracamy policzone pola razem z wierszem.
import type { ChannelRow, Channel, ComputedFields, Pace } from "./types";

const MS_PER_DAY = 86_400_000;

// YYYY-MM-DD -> UTC midnight (ms). Liczymy na dobach UTC, żeby wynik nie zależał od strefy serwera.
function dayFromDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function todayUTC(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function computeFields(row: ChannelRow): ComputedFields {
  const today = todayUTC();
  const target = dayFromDateStr(row.target_date);
  const start = dayFromDateStr(row.start_date);

  // days_left = ceil((target - today) / dzień). Doby UTC są całkowite, więc to po prostu różnica dób.
  const daysLeftRaw = Math.round((target - today) / MS_PER_DAY);
  const overdue = daysLeftRaw <= 0;
  const days_left = Math.max(0, daysLeftRaw);

  // days_total >= 1, żeby uniknąć dzielenia przez zero.
  const days_total = Math.max(1, Math.round((target - start) / MS_PER_DAY));

  const pct_subs =
    row.sub_goal > 0 ? clamp((row.current_subs / row.sub_goal) * 100, 0, 100) : 100;
  const pct_views =
    row.view_goal > 0 ? clamp((row.current_views / row.view_goal) * 100, 0, 100) : 100;

  // Trzeba spełnić OBA progi -> słabszy decyduje.
  const completion_pct = Math.min(pct_subs, pct_views);

  // Ile % czasu już minęło.
  const elapsed_pct = clamp(((days_total - daysLeftRaw) / days_total) * 100, 0, 100);

  const pace = computePace(completion_pct, elapsed_pct, overdue);

  return {
    days_left,
    days_total,
    pct_subs: Math.round(pct_subs),
    pct_views: Math.round(pct_views),
    completion_pct: Math.round(completion_pct),
    elapsed_pct: Math.round(elapsed_pct),
    pace,
    overdue,
  };
}

function computePace(completion: number, elapsed: number, overdue: boolean): Pace {
  if (completion >= 100) return "green"; // cel osiągnięty
  if (overdue) return "red"; // po terminie i niedokończone
  const behind = elapsed - completion; // dodatnie = zostajemy w tyle
  if (behind <= 0) return "green"; // completion >= elapsed
  if (behind <= 15) return "orange"; // w tyle o <= 15 pp
  return "red";
}

export function decorate(row: ChannelRow): Channel {
  return { ...row, ...computeFields(row) };
}
