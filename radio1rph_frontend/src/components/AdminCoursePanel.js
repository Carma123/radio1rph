// src/components/AdminCoursePanel.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import api from "../services/api";
import "./AdminCoursePanel.css";

const RESULT_OPTIONS = [
  { value: "competent", label: "Competent" },
  { value: "not_yet_competent", label: "Not Yet Competent" },
  { value: "not_assessed", label: "Not Assessed" },
  { value: "participated", label: "Participated" },
];

const ISSUED_BY = [
  { value: "inhouse", label: "In-House" },
  { value: "external", label: "External Training Org" },
];

/* ==== Protected file opener (ADMIN) ===================================== */
const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

function absoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function openProtectedAdminFile(path, suggestedName = "file") {
  try {
    const url = absoluteUrl(path);
    if (!url) return;
    const adminToken = localStorage.getItem("access_token"); // admin access token key
    const res = await fetch(url, {
      method: "GET",
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
      credentials: "omit",
    });

    if (!res.ok) {
      // If unauthorized, send to admin login with return
      if (res.status === 401) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.assign(`/admin-login?next=${next}`);
        return;
      }
      const text = await res.text().catch(() => "");
      throw new Error(`Download failed (${res.status}) ${text}`.trim());
    }

    const blob = await res.blob();
    const filename =
      (res.headers.get("content-disposition")?.match(/filename="?([^"]+)"?/)?.[1]) ||
      suggestedName;

    const blobUrl = URL.createObjectURL(blob);
    const newTab = window.open(blobUrl, "_blank", "noopener,noreferrer");
    if (!newTab) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (e) {
    console.error("openProtectedAdminFile error:", e);
    alert("Couldn’t open the file. You may need to log in again, or the file path is invalid.");
  }
}
/* ======================================================================= */

const AdminCoursePanel = () => {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [training, setTraining] = useState(null);
  const [eois, setEois] = useState([]);
  const [capacity, setCapacity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [savingResultId, setSavingResultId] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [announce, setAnnounce] = useState("");

  // NEW: training results state (indexed by volunteer_id)
  const [resultsByVol, setResultsByVol] = useState({});
  const [editOpen, setEditOpen] = useState({}); // { [volunteer_id]: boolean }
  const [formByVol, setFormByVol] = useState({}); // { [volunteer_id]: {...fields} }
  const [certFiles, setCertFiles] = useState({}); // { [volunteer_id]: File|null }
  const [evidFiles, setEvidFiles] = useState({}); // { [volunteer_id]: File|null }

  const pageTitleRef = useRef(null);
  const liveRegionRef = useRef(null);

  // 🔐 make sure admin Authorization header is attached from storage
  useEffect(() => {
    api.touchAdminAuth();
  }, []);

  const speak = (msg) => {
    setAnnounce(msg);
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = "";
      setTimeout(() => {
        if (liveRegionRef.current) liveRegionRef.current.textContent = msg;
      }, 10);
    }
  };

  const loadResults = async (tid) => {
    try {
      api.touchAdminAuth(); // ensure admin header before admin-only GET
      const res = await api.getTrainingResults(tid);
      const rows = Array.isArray(res.data) ? res.data : [];
      const byVol = {};
      const forms = {};
      rows.forEach((r) => {
        byVol[r.volunteer_id] = r;
        forms[r.volunteer_id] = {
          result: r.result || "not_assessed",
          issued_by: r.issued_by || "inhouse",
          assessor_name: r.assessor_name || "",
          date_assessed: r.date_assessed || "",
          notes: r.notes || "",
          next_opportunity: r.next_opportunity || "",
        };
      });
      setResultsByVol(byVol);
      setFormByVol((prev) => ({ ...prev, ...forms }));
    } catch (err) {
      // Silent: panel should still work without results
      console.warn("Failed to load training results:", err);
    }
  };

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [tRes, eoiRes] = await Promise.all([
        api.getTrainingById(trainingId),
        api.getPublicEOIs({ training_id: trainingId }),
      ]);
      setTraining(tRes.data);
      const list = Array.isArray(eoiRes.data) ? eoiRes.data : [];
      setEois(list);

      try {
        const capRes = await api.getTrainingCapacity(trainingId);
        setCapacity({
          capacity: capRes.data?.capacity ?? null,
          approved_count: capRes.data?.approved ?? 0,
          standby_count: capRes.data?.standby ?? 0,
          pending_count: capRes.data?.pending ?? 0,
        });
      } catch {
        const approved = list.filter((e) => e.status === "approved").length;
        const standby = list.filter((e) => e.status === "standby").length;
        const pending = list.filter((e) => e.status === "pending").length;
        setCapacity({
          capacity: null,
          approved_count: approved,
          standby_count: standby,
          pending_count: pending,
        });
      }

      // Load results after EOIs so we can map by approved volunteers
      await loadResults(trainingId);
    } catch (err) {
      console.error(err);
      setError("Failed to load course panel.");
    } finally {
      setLoading(false);
      setTimeout(() => pageTitleRef.current?.focus(), 0);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = eois.filter((e) => {
      if (!q) return true;
      return (
        (e.volunteer_name && e.volunteer_name.toLowerCase().includes(q)) ||
        (e.training_title && e.training_title.toLowerCase().includes(q))
      );
    });
    return {
      pending: list.filter((e) => e.status === "pending"),
      approved: list.filter((e) => e.status === "approved"),
      standby: list.filter((e) => e.status === "standby"),
      rejected: list.filter((e) => e.status === "rejected"),
    };
  }, [eois, query]);

  const seatsLeft = useMemo(() => {
    if (!capacity || capacity.capacity == null) return Infinity;
    const approved = capacity.approved_count ?? grouped.approved.length ?? 0;
    return Math.max(capacity.capacity - approved, 0);
  }, [capacity, grouped.approved.length]);

  const doAction = async (fn, id, label) => {
    setBusyId(id);
    speak(`${label} started`);
    try {
      api.touchAdminAuth();
      await fn(id);
      speak(`${label} successful`);
      await refresh();
    } catch (err) {
      console.error(`Failed to ${label}:`, err);
      speak(`${label} failed`);
      alert(`Failed to ${label}. ${err?.response?.data?.error || err.message}`);
      if (err?.response?.status === 401) {
        const next = encodeURIComponent(location.pathname);
        navigate(`/admin-login?next=${next}`);
      }
    } finally {
      setBusyId(null);
    }
  };

  const approve = (id) => doAction(api.approveEOI, id, "Approve");
  const reject = (id) => doAction(api.rejectEOI, id, "Reject");
  const standby = (id) => doAction(api.moveEOIToStandby, id, "Standby");
  const promote = (id) => doAction(api.promoteEOI, id, "Promote");

  const fillSeats = async () => {
    if (!grouped.pending.length) return;
    if (seatsLeft <= 0 || seatsLeft === Infinity) return;
    const sorted = [...grouped.pending].sort(
      (a, b) => new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0)
    );
    const picks = sorted.slice(0, seatsLeft);
    for (const p of picks) {
      // eslint-disable-next-line no-await-in-loop
      await approve(p.id);
    }
  };

  const exportCSV = () => {
    const onlyApproved = grouped.approved;
    if (!onlyApproved.length) {
      alert("No approved volunteers to export.");
      return;
    }
    const header = [
      "Volunteer Name",
      "Volunteer ID",
      "Training",
      "Training ID",
      "Status",
      "Submitted At",
    ];
    const rows = onlyApproved.map((e) => [
      e.volunteer_name || "",
      e.volunteer_id || "",
      e.training_title || training?.title || "",
      e.training_id || trainingId || "",
      e.status || "",
      e.submitted_at || "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = (training?.title || `training-${trainingId}`).replace(/[^\w\- ]+/g, "");
    a.href = url;
    a.download = `Approved_Roster_${safeTitle}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ---- Results form helpers ----
  const toggleEdit = (volId) => {
    setEditOpen((prev) => ({ ...prev, [volId]: !prev[volId] }));
    // Initialize form when opening if no entry yet
    if (!editOpen[volId] && !formByVol[volId]) {
      setFormByVol((prev) => ({
        ...prev,
        [volId]: {
          result: "not_assessed",
          issued_by: "inhouse",
          assessor_name: "",
          date_assessed: new Date().toISOString().slice(0, 10),
          notes: "",
          next_opportunity: "",
        },
      }));
    }
  };

  const updateForm = (volId, patch) => {
    setFormByVol((prev) => ({ ...prev, [volId]: { ...(prev[volId] || {}), ...patch } }));
  };

  const onPickCert = (volId, file) => {
    setCertFiles((p) => ({ ...p, [volId]: file || null }));
  };
  const onPickEvidence = (volId, file) => {
    setEvidFiles((p) => ({ ...p, [volId]: file || null }));
  };

  const saveResult = async (volunteerId) => {
    const f = formByVol[volunteerId];
    if (!f) return;

    setSavingResultId(volunteerId);
    speak("Saving training result");
    try {
      api.touchAdminAuth(); // ensure admin header before POST/PUT
      const existing = resultsByVol[volunteerId];
      const hasFiles = !!certFiles[volunteerId] || !!evidFiles[volunteerId];

      if (existing) {
        if (hasFiles) {
          // Upload through update endpoint with FormData
          const fd = new FormData();
          if (f.result) fd.append("result", f.result);
          if (f.issued_by) fd.append("issued_by", f.issued_by);
          if (f.assessor_name != null) fd.append("assessor_name", f.assessor_name);
          if (f.date_assessed) fd.append("date_assessed", f.date_assessed);
          if (f.notes != null) fd.append("notes", f.notes);
          if (f.next_opportunity) fd.append("next_opportunity", f.next_opportunity);
          if (certFiles[volunteerId]) fd.append("certificate", certFiles[volunteerId]);
          if (evidFiles[volunteerId]) fd.append("evidence", evidFiles[volunteerId]);
          await api.updateTrainingResult(existing.id, fd);
        } else {
          await api.updateTrainingResult(existing.id, {
            result: f.result,
            issued_by: f.issued_by,
            assessor_name: f.assessor_name,
            date_assessed: f.date_assessed,
            notes: f.notes,
            next_opportunity: f.next_opportunity || null,
          });
        }
      } else {
        if (hasFiles) {
          const fd = new FormData();
          fd.append("volunteer_id", String(volunteerId));
          fd.append("training_id", String(trainingId));
          fd.append("result", f.result);
          fd.append("issued_by", f.issued_by || "inhouse");
          if (f.assessor_name) fd.append("assessor_name", f.assessor_name);
          if (f.date_assessed) fd.append("date_assessed", f.date_assessed);
          if (f.notes) fd.append("notes", f.notes);
          if (f.next_opportunity) fd.append("next_opportunity", f.next_opportunity);
          if (certFiles[volunteerId]) fd.append("certificate", certFiles[volunteerId]);
          if (evidFiles[volunteerId]) fd.append("evidence", evidFiles[volunteerId]);
          await api.createTrainingResult(fd);
        } else {
          await api.createTrainingResult({
            volunteer_id: volunteerId,
            training_id: Number(trainingId),
            result: f.result,
            issued_by: f.issued_by || "inhouse",
            assessor_name: f.assessor_name || null,
            date_assessed: f.date_assessed || null,
            notes: f.notes || null,
            next_opportunity: f.next_opportunity || null,
          });
        }
      }

      speak("Result saved");
      // Clear local files after save
      setCertFiles((p) => ({ ...p, [volunteerId]: null }));
      setEvidFiles((p) => ({ ...p, [volunteerId]: null }));
      // Reload results only (faster)
      await loadResults(trainingId);
    } catch (err) {
      console.error("Save result failed:", err);
      alert(`Failed to save result. ${err?.response?.data?.error || err.message}`);
      if (err?.response?.status === 401) {
        const next = encodeURIComponent(location.pathname);
        navigate(`/admin-login?next=${next}`);
      }
      speak("Save result failed");
    } finally {
      setSavingResultId(null);
    }
  };

  const cap = capacity?.capacity ?? null;

  if (loading) {
    return (
      <main className="panel">
        <p className="muted">Loading course panel…</p>
      </main>
    );
  }
  if (error) {
    return (
      <main className="panel">
        <p className="error">{error}</p>
      </main>
    );
  }

  return (
    <main className="panel" aria-labelledby="panel-title">
      <div ref={liveRegionRef} className="sr-live" aria-live="polite" aria-atomic="true" />

      {/* Header */}
      <header className="panel-header" role="banner">
        <div className="title-block">
          <h1 id="panel-title" ref={pageTitleRef} tabIndex={-1} className="title">
            {training?.title || "Training"}
          </h1>
        </div>
        <div className="header-actions">
          <button className="btn ghost" onClick={refresh} aria-label="Refresh panel">
            🔄 Refresh
          </button>
          <button
            className="btn outline"
            onClick={exportCSV}
            aria-label="Export approved roster as CSV"
            title="Export approved roster as CSV"
          >
            📥 Export Approved CSV
          </button>
        </div>
      </header>

      {/* Stats */}
      <section className="stats" aria-label="Capacity and counts">
        <Stat label="Capacity" value={cap ?? "No limit"} />
        <Stat label="Approved" value={capacity?.approved_count ?? 0} />
        <Stat label="Standby" value={capacity?.standby_count ?? 0} />
        <Stat label="Pending" value={capacity?.pending_count ?? 0} />
        <Stat label="Seats Left" value={seatsLeft === Infinity ? "—" : seatsLeft} />
      </section>

      {/* Tools */}
      <div className="toolbar" role="search">
        <label htmlFor="panel-search" className="sr-only">Search volunteer or training</label>
        <input
          id="panel-search"
          type="search"
          className="input"
          placeholder="🔍 Search volunteer or training…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="toolbar-actions">
          <button
            className="btn success"
            onClick={fillSeats}
            disabled={seatsLeft <= 0 || grouped.pending.length === 0}
            aria-disabled={seatsLeft <= 0 || grouped.pending.length === 0}
            title={seatsLeft === Infinity ? "Capacity not set" : seatsLeft <= 0 ? "No seats left" : "Fill remaining seats"}
          >
            👥 Fill Seats
          </button>
        </div>
      </div>

      {/* Sections */}
      <EOISection
        title="Pending"
        items={grouped.pending}
        empty="No pending EOIs."
        actions={(e) => (
          <div className="row-actions">
            <button className="btn primary" onClick={() => approve(e.id)} disabled={busyId === e.id || seatsLeft === 0} aria-label="Approve EOI">
              ✅ Approve
            </button>
            <button className="btn warn" onClick={() => standby(e.id)} disabled={busyId === e.id} aria-label="Move EOI to standby">
              ⏸️ Standby
            </button>
            <button className="btn danger" onClick={() => reject(e.id)} disabled={busyId === e.id} aria-label="Reject EOI">
              ❌ Reject
            </button>
          </div>
        )}
      />

      <EOISection
        title="Standby"
        items={grouped.standby}
        empty="No standby EOIs."
        actions={(e) => (
          <div className="row-actions">
            <button className="btn primary" onClick={() => promote(e.id)} disabled={busyId === e.id || seatsLeft === 0} aria-label="Promote standby to approved">
              ⬆️ Promote
            </button>
            <button className="btn danger" onClick={() => reject(e.id)} disabled={busyId === e.id} aria-label="Reject EOI">
              ❌ Reject
            </button>
          </div>
        )}
      />

      <EOISection
        title="Approved (Roster)"
        items={grouped.approved}
        empty="No approved EOIs yet."
        actions={(e) => (
          <div className="row-actions">
            <Link to={`/volunteers/${e.volunteer_id}/qualifications`} className="btn ghost" aria-label={`View qualifications for ${e.volunteer_name || "volunteer"}`}>
              📄 View Qualifications
            </Link>

            <button
              className="btn outline"
              onClick={() => toggleEdit(e.volunteer_id)}
              aria-expanded={!!editOpen[e.volunteer_id]}
              aria-controls={`result-editor-${e.volunteer_id}`}
            >
              📝 {editOpen[e.volunteer_id] ? "Hide Result" : "Record Result"}
            </button>
          </div>
        )}
        extraRenderer={(e) => {
          const volId = e.volunteer_id;
          const existing = resultsByVol[volId];
          const f = formByVol[volId] || {};
          return (
            <ResultEditor
              id={`result-editor-${volId}`}
              open={!!editOpen[volId]}
              volunteerName={e.volunteer_name || `#${volId}`}
              trainingTitle={training?.title || ""}
              form={f}
              existing={existing}
              saving={savingResultId === volId}
              onChange={(patch) => updateForm(volId, patch)}
              onPickCert={(file) => onPickCert(volId, file)}
              onPickEvidence={(file) => onPickEvidence(volId, file)}
              onSave={() => saveResult(volId)}
            />
          );
        }}
      />

      <EOISection
        title="Rejected"
        items={grouped.rejected}
        empty="No rejected EOIs."
        actions={() => null}
      />
    </main>
  );
};

function Stat({ label, value }) {
  return (
    <div className="stat" role="group" aria-label={label}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

const EOISection = ({ title, items, actions, extraRenderer, empty }) => (
  <section className="section" aria-labelledby={`${title}-h`}>
    <div className="section-head">
      <h2 id={`${title}-h`} className="section-title">{title}</h2>
      <p className="section-sub">Manage EOIs in the {title.split(" ")[0].toLowerCase()} list.</p>
    </div>

    {items.length === 0 ? (
      <p className="muted">{empty}</p>
    ) : (
      <div className="table-wrap">
        <table className="table" aria-label={`${title} EOIs`}>
          <thead>
            <tr>
              <th scope="col">Volunteer</th>
              <th scope="col">Submitted</th>
              <th scope="col">Status</th>
              <th scope="col" className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <React.Fragment key={e.id}>
                <tr>
                  <td data-label="Volunteer">{e.volunteer_name || `#${e.volunteer_id}`}</td>
                  <td data-label="Submitted">
                    {e.submitted_at ? new Date(e.submitted_at).toLocaleString() : "—"}
                  </td>
                  <td data-label="Status">
                    <span className={`badge ${e.status}`}>{e.status}</span>
                  </td>
                  <td data-label="Actions" className="actions-cell">{actions(e)}</td>
                </tr>
                {extraRenderer ? (
                  <tr className="row-extra">
                    <td colSpan={4}>
                      {extraRenderer(e)}
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

function ResultEditor({
  id,
  open,
  volunteerName,
  trainingTitle,
  form,
  existing,
  saving,
  onChange,
  onPickCert,
  onPickEvidence,
  onSave,
}) {
  if (!open) return null;

  const badge = existing?.result ? (
    <span className={`badge result ${existing.result}`}>{pretty(existing.result)}</span>
  ) : <span className="badge result not_assessed">No Result</span>;

  return (
    <div id={id} className="result-editor" role="region" aria-label={`Record result for ${volunteerName}`}>
      <div className="result-header">
        <div className="result-title">
          <strong>{volunteerName}</strong> — <em>{trainingTitle}</em> {badge}
        </div>

        {/* SECURE: open certificate/evidence with admin token */}
        {existing?.certificate_path ? (
          <button
            type="button"
            className="link"
            onClick={() => openProtectedAdminFile(existing.certificate_path, `certificate-${existing.id || ""}.pdf`)}
            aria-label="Open certificate"
            title="Open certificate"
          >
            📎 Certificate
          </button>
        ) : null}
        {existing?.evidence_path ? (
          <button
            type="button"
            className="link"
            onClick={() => openProtectedAdminFile(existing.evidence_path, `evidence-${existing.id || ""}`)}
            aria-label="Open evidence"
            title="Open evidence"
            style={{ marginLeft: 12 }}
          >
            📨 Evidence
          </button>
        ) : null}
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor={`${id}-result`}>Result</label>
          <select
            id={`${id}-result`}
            className="input"
            value={form.result || "not_assessed"}
            onChange={(e) => onChange({ result: e.target.value })}
          >
            {RESULT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor={`${id}-issued`}>Issued By</label>
          <select
            id={`${id}-issued`}
            className="input"
            value={form.issued_by || "inhouse"}
            onChange={(e) => onChange({ issued_by: e.target.value })}
          >
            {ISSUED_BY.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor={`${id}-assessor`}>Assessor Name</label>
          <input
            id={`${id}-assessor`}
            className="input"
            placeholder="Trainer / Assessor"
            value={form.assessor_name || ""}
            onChange={(e) => onChange({ assessor_name: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor={`${id}-assessed`}>Date Assessed</label>
          <input
            id={`${id}-assessed`}
            type="date"
            className="input"
            value={form.date_assessed || ""}
            onChange={(e) => onChange({ date_assessed: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor={`${id}-next`}>Next Opportunity (for NYC)</label>
          <input
            id={`${id}-next`}
            type="date"
            className="input"
            value={form.next_opportunity || ""}
            onChange={(e) => onChange({ next_opportunity: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor={`${id}-notes`}>Notes</label>
          <textarea
            id={`${id}-notes`}
            className="input"
            rows={2}
            placeholder="Optional notes"
            value={form.notes || ""}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor={`${id}-cert`}>Certificate (PDF/JPG/PNG)</label>
          <input
            id={`${id}-cert`}
            type="file"
            className="input"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => onPickCert(e.target.files?.[0] || null)}
          />
        </div>

        <div className="field">
          <label htmlFor={`${id}-evid`}>Evidence (email/letter PDF)</label>
          <input
            id={`${id}-evid`}
            type="file"
            className="input"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => onPickEvidence(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <div className="actions">
        <button
          className="btn primary"
          onClick={onSave}
          disabled={saving}
          aria-busy={saving ? "true" : "false"}
        >
          {saving ? "Saving…" : existing ? "Update Result" : "Save Result"}
        </button>
      </div>
    </div>
  );
}

function pretty(v) {
  switch (v) {
    case "competent": return "Competent";
    case "not_yet_competent": return "Not Yet Competent";
    case "not_assessed": return "Not Assessed";
    case "participated": return "Participated";
    default: return v;
  }
}

export default AdminCoursePanel;
