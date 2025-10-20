// src/components/TrainingResultsAdmin.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

/**
 * Admin screen to create & manage Training Results (Sections 8 & 9).
 * - If route has :trainingId it locks to that training; otherwise shows a picker.
 * - Accessible (WCAG 2.1): correct labels, focus management, aria-live, min 44px targets.
 * - Responsive table (card layout on small screens).
 */
const TrainingResultsAdmin = () => {
  const { trainingId: paramTrainingId } = useParams();
  const navigate = useNavigate();

  // data
  const [trainings, setTrainings] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [results, setResults] = useState([]);

  // selection / ui
  const [trainingId, setTrainingId] = useState(paramTrainingId || "");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [live, setLive] = useState("");
  const liveRef = useRef(null);
  const h1Ref = useRef(null);

  // form (create)
  const [form, setForm] = useState({
    volunteer_id: "",
    result: "competent",
    issued_by: "inhouse",
    assessor_name: "",
    date_assessed: "",
    next_opportunity: "",
    notes: "",
    certificate: null,
    evidence: null,
  });

  // simple inline edit per-row (result + next_opportunity + notes)
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({
    result: "",
    issued_by: "",
    assessor_name: "",
    date_assessed: "",
    next_opportunity: "",
    notes: "",
  });

  /* ---------- a11y helpers ---------- */
  const speak = (msg) => {
    setLive(msg);
    if (liveRef.current) {
      // force updates even on same string
      liveRef.current.textContent = "";
      setTimeout(() => {
        if (liveRef.current) liveRef.current.textContent = msg;
      }, 10);
    }
  };

  /* ---------- load data ---------- */
  const loadBase = async (tid) => {
    setLoading(true);
    setError("");
    try {
      const [tRes, vRes] = await Promise.all([api.getTrainings(), api.getVolunteers()]);
      setTrainings(Array.isArray(tRes.data) ? tRes.data : []);
      setVolunteers(Array.isArray(vRes.data) ? vRes.data : []);
      if (tid || paramTrainingId) {
        await loadResults(tid || paramTrainingId);
      } else {
        setResults([]);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
      setTimeout(() => h1Ref.current?.focus(), 0);
    }
  };

  const loadResults = async (tid) => {
    if (!tid) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.getTrainingResults(tid);
      setResults(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setError("Failed to load training results.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadBase(paramTrainingId || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramTrainingId]);

  /* ---------- computed ---------- */
  const selectedTraining = useMemo(
    () => trainings.find((t) => String(t.id) === String(trainingId)) || null,
    [trainings, trainingId]
  );

  /* ---------- handlers ---------- */
  const onPickTraining = async (e) => {
    const tid = e.target.value;
    setTrainingId(tid);
    setEditId(null);
    setForm((f) => ({ ...f, volunteer_id: "" }));
    await loadResults(tid);
  };

  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (files?.length) {
      setForm((f) => ({ ...f, [name]: files[0] }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const validCreate = () => {
    if (!trainingId) return "Please select a training.";
    if (!form.volunteer_id) return "Please choose a volunteer.";
    if (!form.result) return "Please select a result.";
    return "";
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    const v = validCreate();
    if (v) {
      setError(v);
      return;
    }

    setError("");
    setBusy(true);
    try {
      // Prefer FormData if any file present
      const hasFiles = form.certificate || form.evidence;
      if (hasFiles) {
        const fd = new FormData();
        fd.append("volunteer_id", form.volunteer_id);
        fd.append("training_id", trainingId);
        fd.append("result", form.result);
        fd.append("issued_by", form.issued_by || "inhouse");
        if (form.assessor_name) fd.append("assessor_name", form.assessor_name);
        if (form.date_assessed) fd.append("date_assessed", form.date_assessed);
        if (form.next_opportunity) fd.append("next_opportunity", form.next_opportunity);
        if (form.notes) fd.append("notes", form.notes);
        if (form.certificate) fd.append("certificate", form.certificate);
        if (form.evidence) fd.append("evidence", form.evidence);

        await api.createTrainingResult(fd);
      } else {
        await api.createTrainingResult({
          volunteer_id: Number(form.volunteer_id),
          training_id: Number(trainingId),
          result: form.result,
          issued_by: form.issued_by || "inhouse",
          assessor_name: form.assessor_name || null,
          date_assessed: form.date_assessed || null,
          next_opportunity: form.next_opportunity || null,
          notes: form.notes || null,
        });
      }

      speak("Training result created.");
      // reset minimal bits but keep training selection
      setForm({
        volunteer_id: "",
        result: "competent",
        issued_by: "inhouse",
        assessor_name: "",
        date_assessed: "",
        next_opportunity: "",
        notes: "",
        certificate: null,
        evidence: null,
      });
      await loadResults(trainingId);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to create result.";
      setError(msg);
      speak("Failed to create result.");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (row) => {
    setEditId(row.id);
    setEdit({
      result: row.result,
      issued_by: row.issued_by || "inhouse",
      assessor_name: row.assessor_name || "",
      date_assessed: (row.date_assessed || "").slice(0, 10),
      next_opportunity: (row.next_opportunity || "").slice(0, 10),
      notes: row.notes || "",
    });
  };

  const saveEdit = async (rowId) => {
    setBusy(true);
    setError("");
    try {
      await api.updateTrainingResult(rowId, {
        result: edit.result,
        issued_by: edit.issued_by || "inhouse",
        assessor_name: edit.assessor_name || null,
        date_assessed: edit.date_assessed || null,
        next_opportunity: edit.next_opportunity || null,
        notes: edit.notes || null,
      });
      speak("Result updated.");
      setEditId(null);
      await loadResults(trainingId);
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.error || e?.response?.data?.message || "Failed to update result.";
      setError(msg);
      speak("Failed to update result.");
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async (rowId, kind, file) => {
    if (!file) return;
    setBusy(true);
    try {
      if (kind === "certificate") {
        await api.uploadTrainingResultCertificate(rowId, file);
      } else {
        await api.uploadTrainingResultEvidence(rowId, file);
      }
      speak(`${kind === "certificate" ? "Certificate" : "Evidence"} uploaded.`);
      await loadResults(trainingId);
    } catch (e) {
      console.error(e);
      setError(`Failed to upload ${kind}.`);
      speak(`Failed to upload ${kind}.`);
    } finally {
      setBusy(false);
    }
  };

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");

  /* ---------- UI ---------- */
  if (loading) {
    return <p style={{ padding: 16 }}>Loading results…</p>;
  }

  return (
    <div className="tr-admin wrap">
      {/* SR live region */}
      <div className="sr-live" aria-live="polite" aria-atomic="true" ref={liveRef}>
        {live}
      </div>

      {/* Local styles (kept scoped) */}
      <StyleBlock />

      <header className="tr-header">
        <h1 ref={h1Ref} tabIndex={-1} className="tr-title">
          Training Results (Admin)
        </h1>

        {!paramTrainingId && (
          <div className="picker">
            <label htmlFor="tr-training" className="lbl">
              Select training:
            </label>
            <select
              id="tr-training"
              className="input"
              value={trainingId}
              onChange={onPickTraining}
              aria-describedby="tr-training-hint"
            >
              <option value="">— choose —</option>
              {trainings.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} {t.start_date ? `(${t.start_date})` : ""}
                </option>
              ))}
            </select>
            <div id="tr-training-hint" className="hint">
              Pick a course to view / add results.
            </div>
          </div>
        )}

        {paramTrainingId && selectedTraining && (
          <div className="info-pill" role="note">
            Managing: <strong>{selectedTraining.title}</strong>{" "}
            <span className="muted">({fmtDate(selectedTraining.start_date)} – {fmtDate(selectedTraining.end_date)})</span>
            <button
              className="btn ghost"
              style={{ marginLeft: 8 }}
              onClick={() => navigate(`/admin/trainings/${selectedTraining.id}/panel`)}
            >
              📊 Open Course Panel
            </button>
          </div>
        )}
      </header>

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      {/* Create form */}
      <section className="card" aria-labelledby="create-h">
        <h2 id="create-h" className="card-title">
          ➕ Record a result
        </h2>
        <form className="grid" onSubmit={submitCreate}>
          <div className="col">
            <label htmlFor="f-vol" className="lbl">
              Volunteer <span aria-hidden="true">*</span>
            </label>
            <select
              id="f-vol"
              name="volunteer_id"
              className="input"
              value={form.volunteer_id}
              onChange={onChange}
              required
              aria-required="true"
              disabled={!trainingId}
            >
              <option value="">— choose —</option>
              {volunteers.map((v) => (
                <option key={v.volunteer_id} value={v.volunteer_id}>
                  {v.name} ({v.email})
                </option>
              ))}
            </select>
            {!trainingId && (
              <div className="hint">Select a training first to enable this list.</div>
            )}
          </div>

          <div className="col">
            <label htmlFor="f-result" className="lbl">
              Result <span aria-hidden="true">*</span>
            </label>
            <select
              id="f-result"
              name="result"
              className="input"
              value={form.result}
              onChange={onChange}
              required
              aria-required="true"
            >
              <option value="competent">Competent</option>
              <option value="participated">Participated</option>
              <option value="did_not_attend">Did Not Attend</option>
              <option value="not_yet_competent">Not Yet Competent</option>
              <option value="not_assessed">Not Assessed</option>
            </select>
          </div>

          <div className="col">
            <label htmlFor="f-issued" className="lbl">
              Issued by
            </label>
            <select
              id="f-issued"
              name="issued_by"
              className="input"
              value={form.issued_by}
              onChange={onChange}
            >
              <option value="inhouse">In-house</option>
              <option value="external">External</option>
            </select>
          </div>

          <div className="col">
            <label htmlFor="f-assessor" className="lbl">
              Assessor name
            </label>
            <input
              id="f-assessor"
              name="assessor_name"
              className="input"
              type="text"
              value={form.assessor_name}
              onChange={onChange}
              placeholder="e.g., Jane Doe"
            />
          </div>

          <div className="col">
            <label htmlFor="f-date" className="lbl">
              Date assessed
            </label>
            <input
              id="f-date"
              name="date_assessed"
              className="input"
              type="date"
              value={form.date_assessed}
              onChange={onChange}
            />
          </div>

          <div className="col">
            <label htmlFor="f-next" className="lbl">
              Next opportunity (if NYC)
            </label>
            <input
              id="f-next"
              name="next_opportunity"
              className="input"
              type="date"
              value={form.next_opportunity}
              onChange={onChange}
            />
          </div>

          <div className="row">
            <label htmlFor="f-notes" className="lbl">
              Notes
            </label>
            <textarea
              id="f-notes"
              name="notes"
              className="input"
              value={form.notes}
              onChange={onChange}
              rows={3}
              placeholder="Optional notes for context"
            />
          </div>

          <div className="col">
            <label htmlFor="f-cert" className="lbl">
              Certificate (PDF/PNG/JPG)
            </label>
            <input
              id="f-cert"
              name="certificate"
              className="input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={onChange}
            />
          </div>

          <div className="col">
            <label htmlFor="f-evid" className="lbl">
              Evidence (PDF/PNG/JPG)
            </label>
            <input
              id="f-evid"
              name="evidence"
              className="input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={onChange}
            />
          </div>

          <div className="actions">
            <button
              className="btn primary"
              type="submit"
              disabled={!trainingId || busy}
              aria-disabled={!trainingId || busy}
              aria-busy={busy ? "true" : "false"}
            >
              {busy ? "Saving…" : "Save Result"}
            </button>
          </div>
        </form>
      </section>

      {/* List */}
      <section className="card" aria-labelledby="list-h">
        <h2 id="list-h" className="card-title">
          📋 Recorded results
        </h2>

        {!trainingId ? (
          <p className="muted">Pick a training to view its results.</p>
        ) : results.length === 0 ? (
          <p className="muted">No results recorded yet.</p>
        ) : (
          <div className="table-wrap" role="region" aria-label="Training results table">
            <table className="table">
              <thead>
                <tr>
                  <th>Volunteer</th>
                  <th>Result</th>
                  <th>Assessed / Next</th>
                  <th>Docs</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Volunteer">
                      <div className="cell-strong">
                        #{r.volunteer_id}
                      </div>
                      <div className="muted">{r.training_title || `Training #${r.training_id}`}</div>
                    </td>

                    <td data-label="Result">
                      {editId === r.id ? (
                        <div className="edit-block">
                          <label className="sr-only" htmlFor={`ed-result-${r.id}`}>Result</label>
                          <select
                            id={`ed-result-${r.id}`}
                            className="input"
                            value={edit.result}
                            onChange={(e) => setEdit((s) => ({ ...s, result: e.target.value }))}
                          >
                            <option value="competent">Competent</option>
                            <option value="participated">Participated</option>
                            <option value="did_not_attend">Did Not Attend</option>
                            <option value="not_yet_competent">Not Yet Competent</option>
                            <option value="not_assessed">Not Assessed</option>
                          </select>

                          <label className="sr-only" htmlFor={`ed-issued-${r.id}`}>Issued by</label>
                          <select
                            id={`ed-issued-${r.id}`}
                            className="input"
                            value={edit.issued_by}
                            onChange={(e) => setEdit((s) => ({ ...s, issued_by: e.target.value }))}
                          >
                            <option value="inhouse">In-house</option>
                            <option value="external">External</option>
                          </select>

                          <label className="sr-only" htmlFor={`ed-assessor-${r.id}`}>Assessor</label>
                          <input
                            id={`ed-assessor-${r.id}`}
                            className="input"
                            type="text"
                            value={edit.assessor_name}
                            onChange={(e) => setEdit((s) => ({ ...s, assessor_name: e.target.value }))}
                            placeholder="Assessor name"
                          />
                        </div>
                      ) : (
                        <span className={`badge ${badgeClass(r.result)}`}>{prettyResult(r.result)}</span>
                      )}
                    </td>

                    <td data-label="Assessed / Next">
                      {editId === r.id ? (
                        <div className="edit-block">
                          <label className="sr-only" htmlFor={`ed-date-${r.id}`}>Date assessed</label>
                          <input
                            id={`ed-date-${r.id}`}
                            className="input"
                            type="date"
                            value={edit.date_assessed}
                            onChange={(e) => setEdit((s) => ({ ...s, date_assessed: e.target.value }))}
                          />
                          <label className="sr-only" htmlFor={`ed-next-${r.id}`}>Next opportunity</label>
                          <input
                            id={`ed-next-${r.id}`}
                            className="input"
                            type="date"
                            value={edit.next_opportunity}
                            onChange={(e) => setEdit((s) => ({ ...s, next_opportunity: e.target.value }))}
                          />
                          <label className="sr-only" htmlFor={`ed-notes-${r.id}`}>Notes</label>
                          <textarea
                            id={`ed-notes-${r.id}`}
                            className="input"
                            rows={2}
                            value={edit.notes}
                            onChange={(e) => setEdit((s) => ({ ...s, notes: e.target.value }))}
                            placeholder="Notes"
                          />
                        </div>
                      ) : (
                        <>
                          <div><strong>Assessed:</strong> {fmtDate(r.date_assessed)}</div>
                          <div><strong>Next:</strong> {fmtDate(r.next_opportunity)}</div>
                          {r.notes && <div className="muted">“{r.notes}”</div>}
                        </>
                      )}
                    </td>

                    <td data-label="Docs">
                      <div className="doc-row">
                        <div>
                          <strong>Cert:</strong>{" "}
                          {r.certificate_path ? (
                            <a href={r.certificate_path} className="link" target="_blank" rel="noreferrer">
                              View
                            </a>
                          ) : (
                            <em className="muted">none</em>
                          )}
                        </div>
                        <label className="btn outline" aria-label="Upload certificate">
                          Upload
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="file"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadFile(r.id, "certificate", f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>

                      <div className="doc-row">
                        <div>
                          <strong>Evidence:</strong>{" "}
                          {r.evidence_path ? (
                            <a href={r.evidence_path} className="link" target="_blank" rel="noreferrer">
                              View
                            </a>
                          ) : (
                            <em className="muted">none</em>
                          )}
                        </div>
                        <label className="btn outline" aria-label="Upload evidence">
                          Upload
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="file"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadFile(r.id, "evidence", f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </td>

                    <td className="actions col-actions" data-label="Actions">
                      {editId === r.id ? (
                        <>
                          <button
                            className="btn success"
                            onClick={() => saveEdit(r.id)}
                            disabled={busy}
                            aria-busy={busy ? "true" : "false"}
                          >
                            💾 Save
                          </button>
                          <button className="btn ghost" onClick={() => setEditId(null)}>
                            ✖ Cancel
                          </button>
                        </>
                      ) : (
                        <button className="btn primary" onClick={() => openEdit(r)}>
                          ✎ Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="table-hint">Tip: On small screens, the table becomes cards. Scroll horizontally if needed.</p>
          </div>
        )}
      </section>
    </div>
  );
};

/* ----------- helpers ----------- */
const prettyResult = (v) =>
  v === "not_yet_competent"
    ? "Not Yet Competent"
    : v === "not_assessed"
    ? "Not Assessed"
    : v === "did_not_attend"
    ? "Did Not Attend"
    : v.charAt(0).toUpperCase() + v.slice(1);

const badgeClass = (v) => {
  switch (v) {
    case "competent":
      return "bdg-ok";
    case "participated":
      return "bdg-info";
    case "did_not_attend":
      return "bdg-danger";
    case "not_yet_competent":
      return "bdg-warn";
    case "not_assessed":
    default:
      return "bdg-neutral";
  }
};

/* ----------- styles ----------- */
const StyleBlock = () => (
  <style>{`
  :root{
    --bg:#f8fafc; --card:#fff; --border:#e5e7eb; --text:#0f172a; --muted:#64748b;
    --focus:#2563eb; --shadow:0 10px 24px rgba(0,0,0,.08);
    --primary:#2563eb; --success:#16a34a; --warn:#d97706; --danger:#dc2626;
  }
  .wrap{max-width:1120px;margin:0 auto;padding:16px;background:var(--bg);color:var(--text);}
  .sr-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
  .tr-header{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}
  .tr-title{margin:0;font-size:1.6rem}
  .picker{display:flex;flex-direction:column;gap:6px;max-width:420px}
  .info-pill{background:#eef2ff;border:1px solid #c7d2fe;border-radius:999px;padding:8px 12px;display:inline-flex;align-items:center;gap:6px}
  .muted{color:var(--muted)}
  .lbl{font-weight:600;margin-bottom:4px;display:block}
  .hint{font-size:.85rem;color:var(--muted)}
  .input{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;outline:none}
  .input:focus{border-color:var(--focus);box-shadow:0 0 0 3px rgba(37,99,235,.25)}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:10px 14px;
       border-radius:10px;border:1px solid transparent;cursor:pointer;font-weight:800}
  .btn.primary{background:var(--primary);color:#fff}
  .btn.success{background:var(--success);color:#fff}
  .btn.outline{background:#fff;border:1px solid var(--border);color:var(--text);position:relative;overflow:hidden}
  .btn.ghost{background:#0f172a;color:#fff}
  .alert.error{background:#fef2f2;color:#7f1d1d;border:1px solid #fecaca;border-radius:10px;padding:10px 12px;margin:8px 0}
  .card{background:var(--card);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);padding:14px;margin-bottom:14px}
  .card-title{margin:0 0 8px 0;font-size:1.15rem}
  .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px;align-items:flex-start}
  .col{grid-column:span 6}
  .row{grid-column:1 / -1}
  .actions{grid-column:1 / -1;display:flex;gap:8px;flex-wrap:wrap}
  @media (max-width:900px){ .col{grid-column:1/-1} }
  .table-wrap{border:1px solid var(--border);border-radius:12px;overflow-x:auto}
  .table{width:100%;border-collapse:collapse;min-width:840px}
  .table th,.table td{padding:10px 12px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
  .table thead th{background:#fbfdff;font-weight:600}
  .table-hint{font-size:.9rem;color:var(--muted);padding:10px 12px}
  .col-actions{white-space:nowrap;width:1%}
  .cell-strong{font-weight:700}
  .badge{display:inline-block;padding:4px 8px;border-radius:999px;border:1px solid #e2e8f0;font-weight:600}
  .bdg-ok{background:#ecfdf5;color:#065f46;border-color:#a7f3d0}
  .bdg-info{background:#eff6ff;color:#1e40af;border-color:#bfdbfe}
  .bdg-warn{background:#fefce8;color:#713f12;border-color:#fde68a}
  .bdg-neutral{background:#f1f5f9;color:#475569;border-color:#e2e8f0}
  .bdg-danger{background:#fef2f2;color:#7f1d1d;border-color:#fecaca}
  .doc-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
  .file{position:absolute;inset:0;opacity:0;cursor:pointer}
  .link{color:var(--primary);text-decoration:underline}
  .edit-block{display:grid;gap:8px}
`}</style>
);

export default TrainingResultsAdmin;
