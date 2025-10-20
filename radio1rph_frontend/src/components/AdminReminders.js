// src/components/AdminReminders.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";

/**
 * Admin Reminders (WCAG 2.1)
 * - High contrast + visible focus
 * - Semantic landmarks + ARIA
 * - Live region announcements
 * - Keyboard-friendly controls
 * - Type filter + search
 */

const AdminReminders = () => {
  // data
  const [items, setItems] = useState([]);
  // ui
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // live capacity map: { [trainingId]: { approved, capacity } }
  const [capacityMap, setCapacityMap] = useState({});
  const [capBusy, setCapBusy] = useState(false);

  // a11y refs
  const liveRef = useRef(null);
  const titleRef = useRef(null);

  // --- live announcer
  const speak = (text) => {
    setMsg(text);
    if (liveRef.current) {
      liveRef.current.textContent = "";
      setTimeout(() => {
        if (liveRef.current) liveRef.current.textContent = text;
      }, 10);
    }
  };

  // --- load reminders
  const loadReminders = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.getAdminNotifications();
      const arr = Array.isArray(res.data) ? res.data : [];
      setItems(arr);
      speak(`Loaded ${arr.length} reminder${arr.length === 1 ? "" : "s"}.`);
    } catch (e) {
      console.error(e);
      setErr("Failed to load reminders.");
      speak("Failed to load reminders.");
    } finally {
      setLoading(false);
    }
  };

  // --- load live capacity for all trainings present in reminders
  const loadCapacitiesForReminders = async (reminders) => {
    const ids = Array.from(
      new Set(
        (reminders || [])
          .map((n) => n?.meta?.training_id)
          .filter((v) => Number.isFinite(v))
      )
    );
    if (ids.length === 0) {
      setCapacityMap({});
      return;
    }
    setCapBusy(true);
    try {
      const pairs = await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await api.getTrainingCapacity(id);
            const data = res?.data || {};
            return [id, { approved: Number(data.approved ?? 0), capacity: data.capacity ?? null }];
          } catch (e) {
            console.warn("Capacity fetch failed for training", id, e?.response?.status || e);
            return [id, { approved: null, capacity: null }];
          }
        })
      );
      const map = Object.fromEntries(pairs);
      setCapacityMap(map);
    } finally {
      setCapBusy(false);
    }
  };

  useEffect(() => {
    loadReminders();
    setTimeout(() => titleRef.current?.focus(), 0);
  }, []);

  // when reminders change, refresh live capacities
  useEffect(() => {
    loadCapacitiesForReminders(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // --- actions
  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      speak("Reminder marked as read.");
    } catch (e) {
      console.error(e);
      setErr("Failed to mark reminder as read.");
      speak("Failed to mark reminder as read.");
    }
  };

  const markAll = async () => {
    const unread = items.filter((x) => !x.read_at);
    for (const n of unread) {
      // eslint-disable-next-line no-await-in-loop
      await markRead(n.id);
    }
    speak("All reminders marked as read.");
  };

  const runTrainingScan = async () => {
    try {
      setLoading(true);
      await api.runTrainingReminderScan();
      speak("Training reminder scan triggered.");
      await loadReminders();
    } catch (e) {
      console.error(e);
      setErr("Could not trigger training reminder scan.");
      speak("Could not trigger training reminder scan.");
    } finally {
      setLoading(false);
    }
  };

  // --- filters / search
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((n) => {
      const matchesType =
        typeFilter === "all" ? true : String(n.type || "").toLowerCase() === typeFilter;
      const hay = `${n.title || ""} ${n.body || ""} ${n.type || ""} ${n?.meta?.training_id || ""}`.toLowerCase();
      const matchesQ = !needle || hay.includes(needle);
      return matchesType && matchesQ;
    });
  }, [items, q, typeFilter]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [filtered]
  );

  const unreadCount = items.filter((x) => !x.read_at).length;

  // live capacity snippet renderer
  const renderCapacity = (n) => {
    const id = n?.meta?.training_id;
    if (!Number.isFinite(id)) return null;
    const cap = capacityMap[id];
    if (!cap) return null;

    const hasApproved = typeof cap.approved === "number";
    const hasCapacity = cap.capacity != null;

    if (!hasApproved && !hasCapacity) return null;

    return (
      <div className="rem__livecap" aria-live="polite">
        {capBusy ? "Checking latest approvals…" : (
          <>
            <strong>Current approvals:</strong>{" "}
            {hasApproved ? cap.approved : "—"}
            {hasCapacity && <> / Capacity: {cap.capacity}</>}
          </>
        )}
      </div>
    );
  };

  // ---- PATCH BODY: replace "Approved volunteers: X" with live X (if we have it)
  const renderBodyWithLiveApprovals = (n) => {
    if (!n?.body) return null;
    const tId = n?.meta?.training_id;
    const live = Number.isFinite(tId) ? capacityMap[tId]?.approved : undefined;
    if (typeof live === "number") {
      const patched = n.body.replace(/(Approved\s+volunteers:\s*)\d+/i, `$1${live}`);
      return <p className="rem__body">{patched}</p>;
    }
    return <p className="rem__body">{n.body}</p>;
  };

  return (
    <main className="rem__main" aria-labelledby="rem-title" role="main">
      {/* Skip link for keyboarders */}
      <a className="rem__skip" href="#rem-content">Skip to reminders</a>

      {/* live region */}
      <div
        ref={liveRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      <header className="rem__header" role="banner">
        <div className="rem__header-titles">
          <h1 id="rem-title" tabIndex={-1} ref={titleRef}>
            Admin Reminders
          </h1>
          <p id="rem-desc">
            Review and manage automated reminders like upcoming training notices and qualification alerts.
          </p>
        </div>
        <div className="rem__toolbar" role="group" aria-label="Actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => { await loadReminders(); }}
            disabled={loading}
            aria-label="Refresh reminders"
          >
            🔄 Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={runTrainingScan}
            disabled={loading}
            aria-label="Run training start reminder scan"
          >
            🚀 Run Training Scan
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={markAll}
            disabled={unreadCount === 0 || loading}
            aria-label="Mark all unread reminders as read"
          >
            ✅ Mark All Read
          </button>
        </div>
      </header>

      {/* Controls */}
      <section className="rem__controls" aria-labelledby="rem-controls-title">
        <h2 id="rem-controls-title" className="sr-only">Filters</h2>
        <div className="rem__filters">
          <div className="field">
            <label htmlFor="rem-type">Filter by type</label>
            <select
              id="rem-type"
              className="sel"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All types</option>
              <option value="training_start">Training Start</option>
              <option value="qualification_expiry_t90_admin">Qualification Expiry (T-90)</option>
              <option value="qualification_expiry_t14_admin">Qualification Expiry (T-14)</option>
              <option value="qualification_expired_admin">Qualification Expired</option>
              {/* component accepts arbitrary types too */}
            </select>
          </div>

          <div className="field field--grow">
            <label htmlFor="rem-search">Search reminders</label>
            <input
              id="rem-search"
              type="search"
              className="input"
              placeholder="Search by title, body, type, or training ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-describedby="rem-search-help"
            />
            <small id="rem-search-help" className="muted">
              Tip: Try a training ID or the word “upcoming”.
            </small>
          </div>
        </div>
      </section>

      {/* Status messages */}
      {err && (
        <div className="msg msg--error" role="alert">
          ❗ {err}
        </div>
      )}
      {msg && (
        <div className="msg msg--info" role="status" aria-live="polite">
          ℹ️ {msg}
        </div>
      )}
      {loading && (
        <div className="msg msg--note" role="status" aria-live="polite">
          Loading…
        </div>
      )}

      {/* Content */}
      <section id="rem-content" className="rem__content" aria-labelledby="rem-list-title">
        <h2 id="rem-list-title" className="sr-only">Reminders</h2>

        {!loading && sorted.length === 0 && (
          <p className="empty" role="note">No reminders found.</p>
        )}

        <ul className="rem__list" role="list">
          {sorted.map((n) => (
            <li
              key={n.id}
              className={`rem__item ${n.read_at ? "is-read" : "is-unread"}`}
              tabIndex={0}
              aria-label={`${n.title || "Reminder"} ${n.read_at ? "(read)" : "(unread)"}`}
            >
              <header className="rem__item-header">
                <h3 className="rem__item-title">{n.title || "Untitled reminder"}</h3>
                <div className="rem__meta">
                  <span className="pill" aria-label="Reminder type">
                    {humanize(n.type) || "General"}
                  </span>
                  {n.meta?.training_id != null && (
                    <span className="muted">
                      • Training&nbsp;#<strong>{n.meta.training_id}</strong>
                    </span>
                  )}
                </div>
              </header>

              {/* PATCHED: body text shows live approvals */}
              {renderBodyWithLiveApprovals(n)}

              {/* LIVE capacity (current approvals / capacity) */}
              {renderCapacity(n)}

              <footer className="rem__item-footer">
                <time
                  dateTime={safeISO(n.created_at)}
                  title={new Date(n.created_at).toLocaleString()}
                >
                  {formatWhen(n.created_at)}
                </time>

                {!n.read_at ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => markRead(n.id)}
                    aria-label="Mark this reminder as read"
                  >
                    Mark Read
                  </button>
                ) : (
                  <span className="muted" aria-label="This reminder is read">Read</span>
                )}
              </footer>
            </li>
          ))}
        </ul>
      </section>

      {/* Styles */}
      <style>{css}</style>
    </main>
  );
};

export default AdminReminders;

/* ---------- helpers ---------- */

function safeISO(v) {
  try {
    const d = new Date(v);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  } catch {
    return "";
  }
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000; // seconds
    if (diff < 60) return "just now";
    if (diff < 3600) {
      const m = Math.floor(diff / 60);
      return `${m} min${m === 1 ? "" : "s"} ago`;
    }
    if (diff < 86400) {
      const h = Math.floor(diff / 3600);
      return `${h} hour${h === 1 ? "" : "s"} ago`;
    }
    return d.toLocaleString();
  } catch {
    return String(iso);
  }
}

function humanize(s) {
  if (!s) return "";
  return String(s)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ---------- Refined vibrant card-style UI ---------- */
const css = `
.rem__main {
  --bg: #f8fafc;
  --text: #111827;
  --muted: #475569;
  --primary: #2563eb;
  --secondary: #facc15;
  --success: #16a34a;
  --surface: #ffffff;
  --ring: #60a5fa;
  background: var(--bg);
  color: var(--text);
  padding: 1.2rem;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

/* Toolbar */
.rem__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.btn {
  appearance: none;
  border: none;
  border-radius: 10px;
  padding: 0.55rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform .1s ease, box-shadow .15s ease;
  color: #fff;
}
.btn:hover:not(:disabled) { transform: translateY(-1px); }
.btn:active:not(:disabled) { transform: translateY(0); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-primary { background: var(--primary); }
.btn-primary:hover { background: #1d4ed8; }
.btn-secondary { background: var(--secondary); color: #111; }
.btn-secondary:hover { background: #eab308; color: #fff; }
.btn-success { background: var(--success); }
.btn-success:hover { background: #15803d; }
.btn-ghost { background: #e2e8f0; color: #111; }
.btn-ghost:hover { background: #cbd5e1; }

.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px #fff, 0 0 0 5px var(--ring);
}

/* Filter + Search layout */
.rem__controls {
  margin-top: 1.1rem;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 0.9rem;
}
.rem__filters {
  display: grid;
  gap: 0.75rem;
}
@media (min-width: 720px) {
  .rem__filters { grid-template-columns: 250px 1fr; }
}
.field label { font-weight: 600; }
.sel, .input {
  width: 100%;
  border-radius: 10px;
  border: 2px solid #d1d5db;
  background: #fff;
  padding: 0.55rem 0.75rem;
  font-size: 0.95rem;
}
.sel:focus-visible, .input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px #fff, 0 0 0 5px var(--ring);
}

/* Messages */
.msg {
  margin-top: .8rem;
  border-radius: 10px;
  padding: .6rem .9rem;
  font-weight: 500;
}
.msg--error { background: #fee2e2; color: #7f1d1d; }
.msg--info  { background: #e0f2fe; color: #1e3a8a; }
.msg--note  { background: #dcfce7; color: #065f46; }

/* Card List */
.rem__content { margin-top: 1rem; }
.rem__list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 1rem;
}
.rem__item {
  background: var(--surface);
  border: 1px solid #e5e7eb;
  border-left: 6px solid var(--primary);
  border-radius: 16px;
  box-shadow: 0 4px 10px rgba(0,0,0,.05);
  padding: 1rem 1.25rem;
  transition: transform .15s ease, box-shadow .15s ease;
}
.rem__item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,.08);
}
.rem__item.is-read {
  border-left-color: #94a3b8;
  opacity: .9;
}
.rem__item-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
}
.rem__item-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #111827;
}
.rem__meta {
  display: flex;
  align-items: center;
  gap: .5rem;
  font-size: .9rem;
  color: var(--muted);
}
.pill {
  background: var(--primary);
  color: #fff;
  padding: .2rem .5rem;
  border-radius: 999px;
  font-size: .8rem;
}
.rem__body {
  margin: .5rem 0;
  color: #1e293b;
}

/* live capacity row */
.rem__livecap {
  margin: .35rem 0 .15rem 0;
  font-size: .92rem;
  color: #0f172a;
}

.rem__item-footer {
  margin-top: .4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: .9rem;
}
.rem__item-footer time {
  color: #64748b;
}
.rem__item-footer .btn-ghost {
  background: #3b82f6;
  color: #fff;
  font-size: .85rem;
  padding: .35rem .7rem;
  border-radius: 8px;
}
.rem__item-footer .btn-ghost:hover {
  background: #2563eb;
}

/* Focus outline on cards */
.rem__item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px var(--ring);
}

/* Light shadow */
@media (prefers-color-scheme: dark) {
  .rem__main { --bg: #0f172a; --text: #f1f5f9; --surface: #1e293b; }
  .rem__item { background: var(--surface); border-color: #334155; }
}
`;
