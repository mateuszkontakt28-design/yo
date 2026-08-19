import { useEffect, useState, useCallback } from "react";
import type { Channel, ChannelFormData } from "./types";
import { api } from "./api";
import { ChannelCard } from "./components/ChannelCard";
import { ChannelForm } from "./components/ChannelForm";

export function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Channel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setChannels(await api.list());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Podmień jeden kanał w stanie (po edycji/odświeżeniu), bez pełnego reloadu.
  function replace(updated: Channel) {
    setChannels((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));
  }

  async function handleSubmit(data: ChannelFormData) {
    if (editing) {
      const updated = await api.update(editing.id, data);
      replace(updated);
    } else {
      const created = await api.create(data);
      setChannels((cs) => [...cs, created]);
    }
    setFormOpen(false);
    setEditing(null);
  }

  async function handleDelete(c: Channel) {
    if (!confirm(`Usunąć kanał „${c.name}"? Tej operacji nie da się cofnąć.`)) return;
    await api.remove(c.id);
    setChannels((cs) => cs.filter((x) => x.id !== c.id));
  }

  async function handleRefreshSubs(c: Channel) {
    const updated = await api.refreshSubs(c.id);
    replace(updated);
  }

  async function handleUpdateViews(c: Channel, views: number) {
    const updated = await api.update(c.id, { current_views: views });
    replace(updated);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>YT Monetization Tracker</h1>
          <p className="sub">Shorts: 1000 subów + 10 mln wyświetleń w oknie 90 dni</p>
        </div>
        <div className="topbar-actions">
          <button className="btn" onClick={load} title="Odśwież listę">
            ↻
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Dodaj kanał
          </button>
        </div>
      </header>

      {error && (
        <div className="banner banner-err">
          {error} <button onClick={load}>spróbuj ponownie</button>
        </div>
      )}

      {loading ? (
        <p className="empty">Ładowanie…</p>
      ) : channels.length === 0 ? (
        <div className="empty">
          <p>Brak kanałów. Dodaj pierwszy, żeby zacząć śledzić postęp.</p>
        </div>
      ) : (
        <main className="grid">
          {channels.map((c) => (
            <ChannelCard
              key={c.id}
              channel={c}
              onEdit={(ch) => {
                setEditing(ch);
                setFormOpen(true);
              }}
              onDelete={handleDelete}
              onRefreshSubs={handleRefreshSubs}
              onUpdateViews={handleUpdateViews}
            />
          ))}
        </main>
      )}

      {formOpen && (
        <ChannelForm
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
