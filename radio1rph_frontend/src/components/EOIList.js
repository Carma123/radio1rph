// src/components/EOIList.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api"; // centralized API client
import "./EOIList.css";

/**
 * Admin EOI Panel (light, WCAG 2.1-friendly)
 * - Default view: pending + standby (PUBLIC /eois?status=...)
 * - Filter by training and status; search by volunteer/training
 * - Capacity-aware actions: Approve / Standby / Promote / Reject
 * - Uses /trainings/:id/capacity (approved/pending/standby/rejected)
 */

const EOIList = () => {
  const navigate = useNavigate();

  // data
  const [eois, setEois] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [capacityInfo, setCapacityInfo] = useState(null);

  // ui state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionBusyId, setActionBusyId] = useState(null);

  // a11y helpers
  const liveRef = useRef(null);
  const titleRef = useRef(null);
  const speak = (msg) => {
    setInfo(msg);
    if (liveRef.current) {
      // re-announce text
      liveRef.current.textContent = "";
      setTimeout(() => {
        if (liveRef.current) liveRef.current.textContent = msg;
      }, 10);
    }
  };

  const handle401AndRedirect = (where, err) => {
    console.warn(`[EOIList] 401 at ${where}`, err);
    api.auth.logout?.();
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    navigate(`/admin-login?next=${next}`);
  };

  const mergeArrays = (...arrs) =>
    arrs.reduce((acc, a) => acc.concat(Array.isArray(a) ? a : []), []);

  // ---------- Initial load ----------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // Trainings list (public)
        const trainingsRes = await api.getPublicTrainings();
        setTrainings(trainingsRes.data || []);

        // Default panel view: PENDING + STANDBY (PUBLIC /eois?status=...)
        const [pendingRes, standbyRes] = await Promise.all([
          api.getPublicEOIs({ status: "pending" }),
          api.getPublicEOIs({ status: "standby" }),
        ]);
        setEois(mergeArrays(pendingRes.data, standbyRes.data).filter(isPanelStatus));
      } catch (err) {
        console.error(err);
        setError("Unable to load trainings/EOIs.");
      } finally {
        setLoading(false);
        setTimeout(() => titleRef.current?.focus(), 0);
      }
    };
    load();
  }, []);

  // ---------- React to training filter ----------
  useEffect(() => {
    const fetchForTraining = async () => {
      setError("");
      setCapacityInfo(null);
      setInfo("");

      setLoading(true);
      try {
        if (!selectedTrainingId) {
          const [pendingRes, standbyRes] = await Promise.all([
            api.getPublicEOIs({ status: "pending" }),
            api.getPublicEOIs({ status: "standby" }),
          ]);
          setEois(mergeArrays(pendingRes.data, standbyRes.data).filter(isPanelStatus));
          setCapacityInfo(null);
        } else {
          // Public read + capacity
          const [eo, cap] = await Promise.all([
            api.getPublicEOIs({ training_id: selectedTrainingId }),
            api.getTrainingCapacity(selectedTrainingId),
          ]);
          setEois((eo.data || []).filter(isPanelStatus));
          setCapacityInfo(cap.data || null);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load EOIs for the selected training.");
      } finally {
        setLoading(false);
      }
    };
    fetchForTraining();
  }, [selectedTrainingId]);

  // ---------- Derived data ----------
  const selectedTraining = useMemo(
    () => trainings.find((t) => String(t.id) === String(selectedTrainingId)),
    [trainings, selectedTrainingId]
  );

  const filteredEOIs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (eois || []).filter((e) => {
      const matchesQ =
        !q ||
        (e.volunteer_name || "").toLowerCase().includes(q) ||
        (e.training_title || "").toLowerCase().includes(q);
      const matchesStatus = !statusFilter || (e.status || "") === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [eois, query, statusFilter]);

  // ---------- Actions (ADMIN; handle 401) ----------
  const refreshLists = async (tidMaybe) => {
    const tid = String(selectedTrainingId || tidMaybe || "");
    setLoading(true);
    setError("");
    try {
      if (!tid) {
        const [pendingRes, standbyRes] = await Promise.all([
          api.getPublicEOIs({ status: "pending" }),
          api.getPublicEOIs({ status: "standby" }),
        ]);
        setEois(mergeArrays(pendingRes.data, standbyRes.data).filter(isPanelStatus));
        setCapacityInfo(null);
      } else {
        const [eo, cap] = await Promise.all([
          api.getPublicEOIs({ training_id: tid }),
          api.getTrainingCapacity(tid),
        ]);
        setEois((eo.data || []).filter(isPanelStatus));
        setCapacityInfo(cap.data || null);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to refresh EOI list.");
    } finally {
      setLoading(false);
    }
  };

  const doApprove = async (eoi) => {
    if (!confirmDialog("Approve this EOI?")) return;
    setActionBusyId(eoi.id);
    speak("Approving…");
    try {
      const res = await api.approveEOI(eoi.id); // admin (API client)
      if (res?.data?.moved_to_standby) {
        speak("Capacity full: moved to Standby.");
      } else {
        speak("EOI approved.");
      }
      await refreshLists(eoi.training_id);
    } catch (err) {
      if (err?.response?.status === 401) return handle401AndRedirect("approveEOI", err);
      console.error(err);
      setError(err?.response?.data?.error || "Failed to approve EOI.");
      speak("Approve failed.");
    } finally {
      setActionBusyId(null);
    }
  };

  const doReject = async (eoi) => {
    if (!confirmDialog("Reject this EOI?")) return;
    setActionBusyId(eoi.id);
    speak("Rejecting…");
    try {
      await api.rejectEOI(eoi.id); // admin
      speak("EOI rejected.");
      await refreshLists(eoi.training_id);
    } catch (err) {
      if (err?.response?.status === 401) return handle401AndRedirect("rejectEOI", err);
      console.error(err);
      setError(err?.response?.data?.error || "Failed to reject EOI.");
      speak("Reject failed.");
    } finally {
      setActionBusyId(null);
    }
  };

  const doStandby = async (eoi) => {
    if (!confirmDialog("Move this EOI to Standby?")) return;
    setActionBusyId(eoi.id);
    speak("Moving to standby…");
    try {
      await api.moveEOIToStandby(eoi.id); // admin
      speak("EOI moved to Standby.");
      await refreshLists(eoi.training_id);
    } catch (err) {
      if (err?.response?.status === 401) return handle401AndRedirect("standbyEOI", err);
      console.error(err);
      setError(err?.response?.data?.error || "Failed to move EOI to Standby.");
      speak("Move to standby failed.");
    } finally {
      setActionBusyId(null);
    }
  };

  const doPromote = async (eoi) => {
    if (!confirmDialog("Promote this standby to Approved?")) return;
    setActionBusyId(eoi.id);
    speak("Promoting…");
    try {
      await api.promoteEOI(eoi.id); // admin
      speak("EOI promoted to Approved.");
      await refreshLists(eoi.training_id);
    } catch (err) {
      if (err?.response?.status === 401) return handle401AndRedirect("promoteEOI", err);
      console.error(err);
      setError(err?.response?.data?.error || "Failed to promote EOI.");
      speak("Promote failed.");
    } finally {
      setActionBusyId(null);
    }
  };

  // ---------- CSV Export (current filtered rows) ----------
  const exportCSV = () => {
    const rows = [
      ["Volunteer Name", "Training", "Status", "Submitted At", "Volunteer Email", "Volunteer Phone"],
      ...filteredEOIs.map((e) => [
        e.volunteer_name || "",
        e.training_title || "",
        e.status || "",
        e.submitted_at || "",
        e.volunteer_email || "",
        e.volunteer_phone || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const namePart = selectedTraining?.title ? selectedTraining.title.replace(/[^\w\-]+/g, "_") : "eoi";
    a.href = url;
    a.download = `EOIs_${namePart}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    speak("CSV downloaded.");
  };

  // ---------- Capacity numbers ----------
  const capacity = capacityInfo?.capacity ?? selectedTraining?.capacity ?? null;
  const approvedCount = capacityInfo?.approved ?? null;
  const pendingCount = capacityInfo?.pending ?? 0;
  const standbyCount = capacityInfo?.standby ?? 0;

  return (
    <main className="eoi" aria-labelledby="eoi-title">
      {/* live region for updates */}
      <div ref={liveRef} className="sr-live" aria-live="polite" aria-atomic="true" />

      <header className="eoi__header">
        <div className="eoi__title-wrap">
          <h1 id="eoi-title" className="eoi__title" tabIndex={-1} ref={titleRef}>
            Expression of Interest — Panel
          </h1>
          <p className="eoi__subtitle">
            Manage incoming EOIs across trainings. Use filters, then approve, standby, or reject.
          </p>
        </div>

        <div className="eoi__toolbar" role="group" aria-label="Filters">
          <label className="sr-only" htmlFor="trainingFilter">Filter by training</label>
          <select
            id="trainingFilter"
            aria-label="Filter by training"
            className="sel"
            value={selectedTrainingId}
            onChange={(e) => setSelectedTrainingId(e.target.value)}
          >
            <option value="">All trainings</option>
            {trainings.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} {t.start_date ? `(${t.start_date})` : ""}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="statusFilter">Filter by status</label>
          <select
            id="statusFilter"
            aria-label="Filter by status"
            className="sel"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="standby">Standby</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <label className="sr-only" htmlFor="searchEOI">Search EOIs</label>
          <input
            id="searchEOI"
            type="search"
            className="input"
            placeholder="🔍 Search volunteer or training…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search EOIs by volunteer or training"
          />

          <div className="toolbar__spacer" />

          <button className="btn ghost" onClick={() => refreshLists()} aria-label="Refresh list">
            🔄 Refresh
          </button>
          <button
            className="btn primary"
            onClick={exportCSV}
            aria-label="Download current list as CSV"
          >
            ⬇️ Download CSV
          </button>
        </div>
      </header>

      {/* Capacity bar when a training is selected */}
      {selectedTrainingId && (
        <CapacityBar
          title={selectedTraining?.title}
          capacity={capacity}
          approvedCount={approvedCount ?? 0}
          pendingCount={pendingCount}
          standbyCount={standbyCount}
        />
      )}

      {error && (
        <div className="msg msg--error" role="alert" aria-live="assertive">
          ❗ {error}
        </div>
      )}
      {info && (
        <div className="msg msg--info" role="status" aria-live="polite">
          ℹ️ {info}
        </div>
      )}

      {loading ? (
        <p className="loading" aria-live="polite">Loading EOIs…</p>
      ) : filteredEOIs.length === 0 ? (
        <p className="empty">No EOIs found.</p>
      ) : (
        <div className="table-wrap" tabIndex={0} aria-label="EOI results">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Volunteer</th>
                <th scope="col">Training</th>
                <th scope="col">Submitted</th>
                <th scope="col">Status</th>
                <th scope="col" className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEOIs.map((eoi) => (
                <tr key={eoi.id}>
                  <td>{eoi.volunteer_name || "—"}</td>
                  <td>
                    <div className="td-training">
                      <div className="td-title">{eoi.training_title || "—"}</div>
                      {String(selectedTrainingId || "") !== String(eoi.training_id || "") && (
                        <small className="muted">(ID: {eoi.training_id})</small>
                      )}
                    </div>
                  </td>
                  <td>{formatLocal(eoi.submitted_at)}</td>
                  <td className={`td-status ${eoi.status}`}>
                    <span className={`badge ${eoi.status || ""}`}>{humanize(eoi.status)}</span>
                  </td>
                  <td className="td-actions">
                    <EOIActions
                      eoi={eoi}
                      busy={actionBusyId === eoi.id}
                      onApprove={() => doApprove(eoi)}
                      onReject={() => doReject(eoi)}
                      onStandby={() => doStandby(eoi)}
                      onPromote={() => doPromote(eoi)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="table-hint" role="note">Tip: On small screens you can scroll the table horizontally.</p>
        </div>
      )}
    </main>
  );
};

// ---------- Subcomponents ----------

const EOIActions = ({ eoi, busy, onApprove, onReject, onStandby, onPromote }) => {
  const s = (eoi.status || "").toLowerCase();

  if (s === "pending") {
    return (
      <div className="row-actions">
        <button className="btn success" onClick={onApprove} disabled={busy} aria-label="Approve EOI">
          {busy ? "…" : "✅ Approve"}
        </button>
        <button className="btn warn" onClick={onStandby} disabled={busy} aria-label="Move to Standby">
          {busy ? "…" : "⏸️ Standby"}
        </button>
        <button className="btn danger" onClick={onReject} disabled={busy} aria-label="Reject EOI">
          {busy ? "…" : "🗑️ Reject"}
        </button>
      </div>
    );
  }

  if (s === "standby") {
    return (
      <div className="row-actions">
        <button className="btn primary" onClick={onPromote} disabled={busy} aria-label="Promote from Standby">
          {busy ? "…" : "⬆️ Promote"}
        </button>
        <button className="btn danger" onClick={onReject} disabled={busy} aria-label="Reject EOI">
          {busy ? "…" : "🗑️ Reject"}
        </button>
      </div>
    );
  }

  if (s === "approved") {
    return (
      <div className="row-actions">
        <button className="btn warn" onClick={onStandby} disabled={busy} aria-label="Move Approved to Standby">
          {busy ? "…" : "⏸️ Move to Standby"}
        </button>
        <button className="btn danger" onClick={onReject} disabled={busy} aria-label="Reject EOI">
          {busy ? "…" : "🗑️ Reject"}
        </button>
      </div>
    );
  }

  return <span className="muted">No actions</span>;
};

const CapacityBar = ({ title, capacity, approvedCount, pendingCount, standbyCount }) => {
  const hasCap = Number(capacity) > 0;
  const total = hasCap ? Number(capacity) : null;
  const pct = hasCap && total ? Math.min(100, Math.round((approvedCount / total) * 100)) : null;

  return (
    <section className="cap" aria-live="polite">
      <div className="cap__row">
        <div className="cap__text">
          <strong className="cap__title">{title || "Selected training"}</strong>
          <div className="cap__meta">
            {hasCap ? (
              <>
                Approved: <b>{approvedCount}</b> / {total} &nbsp;•&nbsp; Pending: <b>{pendingCount}</b> &nbsp;•&nbsp; Standby: <b>{standbyCount}</b>
              </>
            ) : (
              <>
                Approved: <b>{approvedCount}</b> &nbsp;•&nbsp; Pending: <b>{pendingCount}</b> &nbsp;•&nbsp; Standby: <b>{standbyCount}</b> &nbsp;•&nbsp; <i>Unlimited capacity</i>
              </>
            )}
          </div>
        </div>

        {hasCap && (
          <div
            className="cap__bar"
            role="progressbar"
            aria-label="Approved seats"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={approvedCount}
          >
            <div className="cap__fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </section>
  );
};

// ---------- Utils ----------
function formatLocal(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function humanize(s) {
  if (!s) return "—";
  return String(s)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPanelStatus(e) {
  const s = (e.status || "").toLowerCase();
  return ["pending", "standby", "approved", "rejected", "cancelled"].includes(s);
}

function confirmDialog(message) {
  // eslint-disable-next-line no-alert
  return window.confirm(message);
}

export default EOIList;
