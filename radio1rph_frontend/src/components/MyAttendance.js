// src/components/MyAttendance.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";

const MyAttendance = () => {
  const { volunteerId } = useParams(); // must match route
  const navigate = useNavigate();

  // State
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [liveMsg, setLiveMsg] = useState("");
  const [initializing, setInitializing] = useState(true);

  // Refs for better focus management
  const h1Ref = useRef(null);
  const alertRef = useRef(null);

  // --- Accessibility-first CSS (scoped) ---
  useEffect(() => {
    const ID = "my-attendance-a11y-css";
    if (document.getElementById(ID)) return;
    const css = `
:root{
  --bg:#f8fafc; --ink:#0f172a; --muted:#475569;
  --card:#ffffff; --border:#e5e7eb; --shadow:0 10px 24px rgba(0,0,0,.08);
  --primary:#1d4ed8; --primary-ink:#ffffff; /* blue-700 -> good contrast on white text */
  --danger:#b91c1c; --danger-ink:#ffffff;   /* red-700  -> good contrast on white text */
  --focus:#2563eb; /* blue-600 */
  --row-stripe:#f1f5f9;
}

.myatt-wrap{max-width:960px;margin:0 auto;padding:16px;background:var(--bg);color:var(--ink)}
.myatt-actions{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}
.btn{
  border:1px solid transparent;border-radius:12px;min-height:44px;
  padding:10px 14px;font-weight:800;cursor:pointer;
  box-shadow:0 1px 0 rgba(0,0,0,.04);transition:transform .05s ease, box-shadow .12s ease;
}
.btn:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
.btn:active{transform:translateY(0)}
.btn:hover{transform:translateY(-1px)}
.btn[disabled]{opacity:.65;cursor:not-allowed}
.btn-primary{background:var(--primary);color:var(--primary-ink)}
.btn-danger{background:var(--danger);color:var(--danger-ink)}
.btn-dark{background:#111827;color:#fff}

.card{background:var(--card);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow)}
.card-pad{padding:16px}

.table-wrap{border:1px solid var(--border);border-radius:12px;overflow-x:auto;background:#fff}
.table{width:100%;border-collapse:collapse;min-width:720px}
.table caption{caption-side:top;text-align:left;font-weight:700;padding:12px 14px}
.table thead th{background:#fbfdff}
.th,.td{padding:12px 14px;border-bottom:1px solid var(--border);text-align:left;vertical-align:middle}
.table tbody tr:nth-child(odd){background:var(--row-stripe)}

.kbd{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;background:#111827;color:#fff;border-radius:6px;padding:2px 6px}

.alert{
  padding:12px 14px;border-radius:12px;margin:8px 0;
  border:1px solid #fecaca;background:#fef2f2;color:#7f1d1d;
}

.skip-link{
  position:absolute;left:-999px;top:auto;width:1px;height:1px;overflow:hidden;
}
.skip-link:focus{left:16px;top:10px;width:auto;height:auto;z-index:1000;background:#111827;color:#fff;padding:8px 12px;border-radius:8px}

a.link-btn{display:inline-flex;align-items:center;gap:8px;text-decoration:none}

.status-pill{
  display:inline-flex;align-items:center;gap:6px;background:#ecfdf5;color:#065f46;
  border:1px solid #bbf7d0;border-radius:999px;padding:2px 8px;font-weight:700
}

@media (prefers-reduced-motion: reduce){
  .btn{transition:none}
}
`;
    const tag = document.createElement("style");
    tag.id = ID;
    tag.appendChild(document.createTextNode(css));
    document.head.appendChild(tag);
  }, []);

  // Utilities
  const fmt = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    // Accessible, locale-aware string + machine-readable datetime attribute where used
    return d.toLocaleString();
  };
  const getDuration = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return "—";
    const diffMs = new Date(clockOut) - new Date(clockIn);
    const hrs = Math.floor(diffMs / 36e5);
    const mins = Math.floor((diffMs % 36e5) / 6e4);
    return `${hrs}h ${mins}m`;
  };

  const openSession = useMemo(
    () => rows.find((r) => r.clock_in && !r.clock_out) || null,
    [rows]
  );

  const load = async (volId) => {
    setBusy(true);
    setError("");
    try {
      const [vRes, aRes] = await Promise.all([
        api.getVolunteerById(volId),
        api.getAttendanceByVolunteer(volId),
      ]);
      setMe(vRes.data);
      const list = Array.isArray(aRes.data) ? aRes.data.slice() : [];
      list.sort((a, b) => new Date(b.clock_in || 0) - new Date(a.clock_in || 0));
      setRows(list);
      setLiveMsg("Attendance loaded.");
    } catch (e) {
      console.error(e);
      setError("Couldn’t load your attendance.");
      // Move focus to the alert for screen readers
      setTimeout(() => alertRef.current?.focus(), 0);
    } finally {
      setBusy(false);
      setInitializing(false);
    }
  };

  // Init + route guard
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("volunteer") || "null");
    if (!stored?.volunteer_id) {
      navigate("/volunteer-login", { replace: true });
      return;
    }
    const myId = String(stored.volunteer_id);

    // If URL param exists but doesn't match logged-in user, correct it
    if (volunteerId && volunteerId !== myId) {
      navigate(`/volunteers/${myId}/attendance`, { replace: true });
      return;
    }

    setMe(stored);
    load(myId);

    // Put focus on the page title for context on first render
    setTimeout(() => h1Ref.current?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volunteerId]);

  const handleClockIn = async () => {
    if (!me?.volunteer_id) return;
    setBusy(true);
    setLiveMsg("");
    try {
      await api.clockIn(me.volunteer_id); // POST { volunteer_id }
      await load(me.volunteer_id);
      setLiveMsg("You are now clocked in.");
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.error || "Failed to clock in.");
      setTimeout(() => alertRef.current?.focus(), 0);
    } finally {
      setBusy(false);
    }
  };

  const handleClockOut = async () => {
    if (!me?.volunteer_id) return;
    setBusy(true);
    setLiveMsg("");
    try {
      await api.clockOut(me.volunteer_id); // POST { volunteer_id }
      await load(me.volunteer_id);
      setLiveMsg("You are now clocked out.");
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.error || "Failed to clock out.");
      setTimeout(() => alertRef.current?.focus(), 0);
    } finally {
      setBusy(false);
    }
  };

  if (initializing) {
    return (
      <main className="myatt-wrap" aria-busy="true" aria-live="polite">
        Loading…
      </main>
    );
  }

  if (!me) return null;

  const tableId = "attendance-table";
  const captionId = "attendance-caption";
  const hintId = "attendance-hint";

  return (
    <>
      {/* Skip to content (helps keyboard users) */}
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      {/* Live region for subtle status updates */}
      <div role="status" aria-live="polite" className="sr-only">
        {liveMsg}
      </div>

      <main
        id="main"
        className="myatt-wrap"
        aria-busy={busy ? "true" : "false"}
        aria-describedby={error ? "page-error" : undefined}
      >
        <header className="card card-pad" style={{ marginBottom: 12 }}>
          <h1
            ref={h1Ref}
            tabIndex={-1}
            style={{ margin: 0, fontSize: "1.6rem", lineHeight: 1.2 }}
          >
            My Attendance
          </h1>
          <p style={{ marginTop: 8, color: "var(--muted)" }}>
            <strong>{me.name}</strong>{" "}
            <span aria-hidden="true">•</span>{" "}
            <strong>ID:</strong> {me.volunteer_id}{" "}
            <span aria-hidden="true">•</span>{" "}
            <strong>Email:</strong> {me.email}
          </p>
        </header>

        {error && (
          <div
            id="page-error"
            ref={alertRef}
            className="alert"
            role="alert"
            tabIndex={-1}
            aria-live="assertive"
          >
            {error}
          </div>
        )}

        <div className="myatt-actions" role="group" aria-label="Attendance actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleClockIn}
            disabled={busy || !!openSession}
            aria-disabled={busy || !!openSession ? "true" : "false"}
            aria-label="Clock in"
          >
            {/* decorative emoji hidden from AT */}
            <span aria-hidden="true">🟢</span> Clock In
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={handleClockOut}
            disabled={busy || !openSession}
            aria-disabled={busy || !openSession ? "true" : "false"}
            aria-label="Clock out"
          >
            <span aria-hidden="true">🔴</span> Clock Out
          </button>

          <Link
            to="/volunteer/dashboard"
            className="btn btn-dark a link-btn"
            aria-label="Back to volunteer dashboard"
          >
            <span aria-hidden="true">←</span> Back to Dashboard
          </Link>
        </div>

        <section
          className="card card-pad"
          aria-labelledby={captionId}
          aria-describedby={hintId}
        >
          <div className="table-wrap">
            <table id={tableId} className="table">
              <caption id={captionId}>Your attendance sessions</caption>
              <thead>
                <tr>
                  <th scope="col" className="th">Clock In</th>
                  <th scope="col" className="th">Clock Out</th>
                  <th scope="col" className="th">Duration</th>
                  <th scope="col" className="th">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="td" colSpan={4} style={{ textAlign: "center", color: "var(--muted)" }}>
                      No attendance records yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const isOpen = r.clock_in && !r.clock_out;
                    return (
                      <tr key={r.id}>
                        <td className="td">
                          {r.clock_in ? (
                            <time dateTime={new Date(r.clock_in).toISOString()}>
                              {fmt(r.clock_in)}
                            </time>
                          ) : "—"}
                        </td>
                        <td className="td">
                          {r.clock_out ? (
                            <time dateTime={new Date(r.clock_out).toISOString()}>
                              {fmt(r.clock_out)}
                            </time>
                          ) : "—"}
                        </td>
                        <td className="td">{getDuration(r.clock_in, r.clock_out)}</td>
                        <td className="td">
                          {isOpen ? (
                            <span className="status-pill">
                              <span aria-hidden="true">🟢</span>
                              <span>Open session</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p id={hintId} style={{ margin: "10px 4px 0", color: "var(--muted)" }}>
            Hint: On small screens, this table scrolls horizontally. Use the{" "}
            <span className="kbd">Tab</span> key to move through focusable elements.
          </p>
        </section>
      </main>
    </>
  );
};

export default MyAttendance;
