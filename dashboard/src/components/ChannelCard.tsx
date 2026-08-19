import { useState } from "react";
import type { Channel } from "../types";
import { ProgressBar } from "./ProgressBar";
import { timeAgo, PACE_LABEL } from "../utils";

interface Props {
  channel: Channel;
  onEdit: (c: Channel) => void;
  onDelete: (c: Channel) => void;
  onRefreshSubs: (c: Channel) => Promise<void>;
  onUpdateViews: (c: Channel, views: number) => Promise<void>;
}

export function ChannelCard({ channel, onEdit, onDelete, onRefreshSubs, onUpdateViews }: Props) {
  const [viewsInput, setViewsInput] = useState("");
  const [busy, setBusy] = useState<null | "subs" | "views">(null);
  const [err, setErr] = useState<string | null>(null);

  async function saveViews(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(viewsInput.replace(/\s/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      setErr("Podaj poprawną liczbę wyświetleń.");
      return;
    }
    setErr(null);
    setBusy("views");
    try {
      await onUpdateViews(channel, Math.trunc(n));
      setViewsInput("");
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function refresh() {
    setErr(null);
    setBusy("subs");
    try {
      await onRefreshSubs(channel);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className={`card pace-${channel.pace}`}>
      <header className="card-head">
        <div>
          <h2 className="card-name">{channel.name}</h2>
          <div className="card-meta">
            {channel.niche && <span className="tag">{channel.niche}</span>}
            {channel.handle && <span className="handle">{channel.handle}</span>}
          </div>
        </div>
        <span className={`badge badge-${channel.pace}`}>{PACE_LABEL[channel.pace]}</span>
      </header>

      <div className="countdown">
        {channel.overdue ? (
          <>
            <span className="cd-num">po terminie</span>
          </>
        ) : (
          <>
            <span className="cd-num">{channel.days_left}</span>
            <span className="cd-unit">dni do celu</span>
          </>
        )}
      </div>

      <div className="bars">
        <ProgressBar
          label="Suby"
          pct={channel.pct_subs}
          current={channel.current_subs}
          goal={channel.sub_goal}
          tone="subs"
        />
        <ProgressBar
          label="Wyświetlenia (90d)"
          pct={channel.pct_views}
          current={channel.current_views}
          goal={channel.view_goal}
          tone="views"
        />
      </div>

      <div className="updated">
        <span>views zaktualizowane: {timeAgo(channel.views_updated_at)}</span>
        <span>suby: {timeAgo(channel.subs_updated_at)}</span>
      </div>

      <form className="quick-views" onSubmit={saveViews}>
        <input
          inputMode="numeric"
          placeholder="Wpisz views z YT Studio…"
          value={viewsInput}
          onChange={(e) => setViewsInput(e.target.value)}
          aria-label="Zaktualizuj wyświetlenia"
        />
        <button type="submit" disabled={busy === "views" || viewsInput === ""}>
          {busy === "views" ? "…" : "Zapisz views"}
        </button>
      </form>

      {err && <p className="card-err">{err}</p>}

      <footer className="card-actions">
        <button className="btn" onClick={() => onEdit(channel)}>
          Edytuj
        </button>
        <button className="btn" onClick={refresh} disabled={busy === "subs"}>
          {busy === "subs" ? "…" : "Odśwież suby"}
        </button>
        <button className="btn btn-danger" onClick={() => onDelete(channel)}>
          Usuń
        </button>
      </footer>
    </article>
  );
}
