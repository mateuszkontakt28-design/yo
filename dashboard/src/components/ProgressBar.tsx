import { fmtFull } from "../utils";

interface Props {
  label: string;
  pct: number; // 0..100
  current: number;
  goal: number;
  tone: "subs" | "views";
}

export function ProgressBar({ label, pct, current, goal, tone }: Props) {
  return (
    <div className="pb">
      <div className="pb-head">
        <span className="pb-label">{label}</span>
        <span className="pb-nums">
          <strong>{pct}%</strong> · {fmtFull(current)}/{fmtFull(goal)}
        </span>
      </div>
      <div className="pb-track">
        <div
          className={`pb-fill pb-${tone}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}
