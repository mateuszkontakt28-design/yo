import { useState } from "react";
import type { Channel, ChannelFormData } from "../types";

interface Props {
  initial?: Channel | null;
  onSubmit: (data: ChannelFormData) => Promise<void>;
  onCancel: () => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function toForm(c?: Channel | null): ChannelFormData {
  return {
    name: c?.name ?? "",
    niche: c?.niche ?? "",
    handle: c?.handle ?? "",
    youtube_channel_id: c?.youtube_channel_id ?? "",
    sub_goal: c?.sub_goal ?? 1000,
    view_goal: c?.view_goal ?? 10_000_000,
    start_date: c?.start_date ?? todayISO(),
    target_date: c?.target_date ?? "",
    current_subs: c?.current_subs ?? 0,
    current_views: c?.current_views ?? 0,
  };
}

export function ChannelForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<ChannelFormData>(toForm(initial));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isEdit = !!initial;

  function set<K extends keyof ChannelFormData>(key: K, value: ChannelFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setErr("Nazwa jest wymagana.");
    if (!form.target_date) return setErr("Data docelowa jest wymagana.");
    setErr(null);
    setBusy(true);
    try {
      await onSubmit(form);
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{isEdit ? "Edytuj kanał" : "Nowy kanał"}</h2>

        <label>
          Nazwa *
          <input value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        </label>

        <div className="row">
          <label>
            Nisza
            <input value={form.niche} onChange={(e) => set("niche", e.target.value)} />
          </label>
          <label>
            Handle
            <input
              placeholder="@KanalXYZ"
              value={form.handle}
              onChange={(e) => set("handle", e.target.value)}
            />
          </label>
        </div>

        <label>
          YouTube Channel ID <span className="hint">(do auto-subów, opcjonalnie)</span>
          <input
            placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
            value={form.youtube_channel_id}
            onChange={(e) => set("youtube_channel_id", e.target.value)}
          />
        </label>

        <div className="row">
          <label>
            Cel subów
            <input
              type="number"
              min={0}
              value={form.sub_goal}
              onChange={(e) => set("sub_goal", Number(e.target.value))}
            />
          </label>
          <label>
            Cel wyświetleń (90d)
            <input
              type="number"
              min={0}
              value={form.view_goal}
              onChange={(e) => set("view_goal", Number(e.target.value))}
            />
          </label>
        </div>

        <div className="row">
          <label>
            Data startu
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => set("start_date", e.target.value)}
            />
          </label>
          <label>
            Data docelowa *
            <input
              type="date"
              value={form.target_date}
              onChange={(e) => set("target_date", e.target.value)}
            />
          </label>
        </div>

        <div className="row">
          <label>
            Aktualne suby
            <input
              type="number"
              min={0}
              value={form.current_subs}
              onChange={(e) => set("current_subs", Number(e.target.value))}
            />
          </label>
          <label>
            Aktualne views (90d)
            <input
              type="number"
              min={0}
              value={form.current_views}
              onChange={(e) => set("current_views", Number(e.target.value))}
            />
          </label>
        </div>

        {err && <p className="card-err">{err}</p>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel}>
            Anuluj
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Zapisywanie…" : isEdit ? "Zapisz zmiany" : "Dodaj kanał"}
          </button>
        </div>
      </form>
    </div>
  );
}
