// Formatowanie liczb: 730 -> "730", 1250000 -> "1,25 mln", 10000000 -> "10 mln".
export function fmtNum(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m.toFixed(m >= 10 ? 0 : 2).replace(".", ",")} mln`;
  }
  if (n >= 10_000) {
    const k = n / 1000;
    return `${k.toFixed(k >= 100 ? 0 : 1).replace(".", ",")} tys`;
  }
  return new Intl.NumberFormat("pl-PL").format(n);
}

// Pełna liczba z separatorami: 730000 -> "730 000".
export function fmtFull(n: number): string {
  return new Intl.NumberFormat("pl-PL").format(n);
}

// "2h temu" / "wczoraj" / "za chwilę" z ISO timestamp.
export function timeAgo(iso: string | null): string {
  if (!iso) return "nigdy";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (diff < 0) return "za chwilę";
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "przed chwilą";
  if (min < 60) return `${min} min temu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h temu`;
  const d = Math.floor(h / 24);
  if (d === 1) return "wczoraj";
  if (d < 30) return `${d} dni temu`;
  const mo = Math.floor(d / 30);
  return `${mo} mies. temu`;
}

export const PACE_LABEL: Record<string, string> = {
  green: "na czas",
  orange: "lekko w tyle",
  red: "zagrożone",
};
