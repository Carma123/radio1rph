// src/components/VolunteerAddQualification.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import api from "../services/api";

/* ---------------- Helpers ---------------- */
const safeVolunteer = () => {
  try {
    const raw = localStorage.getItem("volunteer");
    if (!raw || raw === "undefined" || raw === "null") return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const parseIntish = (v) => {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "" || s === "null" || s === "undefined" || s === "none") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const isPdfUrl = (u = "") => /\.pdf($|\?)/i.test(u);
const isImgUrl = (u = "") => /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(u);

const VolunteerAddQualification = () => {
  const { volunteerId: volunteerIdParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Support edit mode via ?edit=ID
  const qs = new URLSearchParams(location.search);
  const editId = parseIntish(qs.get("edit"));

  // Resolve volunteer id from: URL param -> navigation state -> localStorage
  const navStateVolId = parseIntish(location.state?.volunteerId);
  const storageVol = safeVolunteer();
  const resolvedVolunteerId =
    parseIntish(volunteerIdParam) ??
    navStateVolId ??
    parseIntish(storageVol?.volunteer_id);

  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [mode, setMode] = useState("upload"); // 'upload' | 'link'

  const [documentFile, setDocumentFile] = useState(null);
  const [documentURL, setDocumentURL] = useState("");
  const [currentDocPath, setCurrentDocPath] = useState(""); // for edit: already saved file/link

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  // Debug hook (optional)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("VolunteerAddQualification mount", { resolvedVolunteerId, editId });
  }, [resolvedVolunteerId, editId]);

  // Load trainings and (if edit) existing qualification
  useEffect(() => {
    if (!resolvedVolunteerId) return;
    (async () => {
      try {
        const [trn, myQuals] = await Promise.all([
          api.getTrainings(),
          editId ? api.getQualificationsByVolunteer(resolvedVolunteerId) : Promise.resolve({ data: [] }),
        ]);
        setTrainings(trn.data || []);
        if (editId) {
          const q = (myQuals.data || []).find((x) => x.id === editId);
          if (q) {
            setSelectedTraining(q.training_id ? String(q.training_id) : "");
            setIssueDate(q.issue_date || "");
            setExpiryDate(q.expiry_date || "");
            setCurrentDocPath(q.document_path || q.document_url || "");
          }
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load data.");
      }
    })();
  }, [editId, resolvedVolunteerId]);

  /* ---------- Form handlers ---------- */
  const handleFileChange = (file) => setDocumentFile(file || null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const trainingId = parseIntish(selectedTraining);
      if (!resolvedVolunteerId) {
        setError("Volunteer not resolved. Please log in again.");
        return;
      }
      if (!trainingId || !issueDate) {
        setError("Please select a training and an issue date.");
        return;
      }

      if (editId) {
        // UPDATE existing qualification
        if (mode === "upload") {
          if (!documentFile) {
            await api.updateQualification(editId, {
              volunteer_id: resolvedVolunteerId,
              training_id: trainingId,
              issue_date: issueDate,
              expiry_date: expiryDate || null,
            });
          } else {
            const fd = new FormData();
            fd.append("volunteer_id", String(resolvedVolunteerId));
            fd.append("training_id", String(trainingId));
            fd.append("issue_date", issueDate);
            if (expiryDate) fd.append("expiry_date", expiryDate);
            fd.append("document", documentFile);
            await api.updateQualification(editId, fd);
          }
        } else {
          await api.updateQualification(editId, {
            volunteer_id: resolvedVolunteerId,
            training_id: trainingId,
            issue_date: issueDate,
            expiry_date: expiryDate || null,
            document_url: documentURL.trim() || currentDocPath || null,
          });
        }
      } else {
        // CREATE new qualification
        if (mode === "upload") {
          if (!documentFile) {
            setError("Please upload a file (PDF/JPG/PNG) or switch to link mode.");
            return;
          }
          const fd = new FormData();
          fd.append("volunteer_id", String(resolvedVolunteerId));
          fd.append("training_id", String(trainingId));
          fd.append("issue_date", issueDate);
          if (expiryDate) fd.append("expiry_date", expiryDate);
          fd.append("document", documentFile);
          await api.addQualification(fd);
        } else {
          if (!documentURL.trim()) {
            setError("Please paste a document URL or switch to upload mode.");
            return;
          }
          await api.addQualification({
            volunteer_id: resolvedVolunteerId,
            training_id: trainingId,
            issue_date: issueDate,
            expiry_date: expiryDate || null,
            document_url: documentURL.trim(),
          });
        }
      }

      navigate(`/volunteers/${resolvedVolunteerId}/qualifications`);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || "Failed to save qualification. Please try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = useMemo(() => {
    return !!resolvedVolunteerId && !!selectedTraining && !!issueDate && !busy;
  }, [resolvedVolunteerId, selectedTraining, issueDate, busy]);

  /* ---------- Early guards ---------- */
  if (!resolvedVolunteerId) {
    return (
      <main className="container">
        <h2 className="heading">My Qualification</h2>
        <div className="alert alert-error" role="alert">
          ❗ Volunteer not resolved. Please log in again.
        </div>
        <button className="btn ghost" onClick={() => navigate("/volunteer-login")}>
          Go to Login
        </button>
      </main>
    );
  }

  /* ---------- UI ---------- */
  return (
    <main className="container">
      <header className="page-head">
        <h2 tabIndex="0" className="heading">
          {editId ? "Edit My Qualification" : "Add My Qualification"}
        </h2>
        <div className="crumbs">
          <Link to={`/volunteer/dashboard`} className="crumb">Dashboard</Link>
          <span aria-hidden="true">›</span>
          <Link to={`/volunteers/${resolvedVolunteerId}/qualifications`} className="crumb">My Qualifications</Link>
          <span aria-hidden="true">›</span>
          <span className="crumb active">{editId ? "Edit" : "Add"}</span>
        </div>
      </header>

      {error && <div className="alert alert-error" role="alert">❗ {error}</div>}

      {/* Mode toggle */}
      <div className="segmented" role="tablist" aria-label="Attachment mode">
        <button
          role="tab"
          aria-selected={mode === "upload"}
          className={`seg-btn ${mode === "upload" ? "active" : ""}`}
          onClick={() => setMode("upload")}
          type="button"
        >
          Upload file
        </button>
        <button
          role="tab"
          aria-selected={mode === "link"}
          className={`seg-btn ${mode === "link" ? "active" : ""}`}
          onClick={() => setMode("link")}
          type="button"
        >
          Paste link
        </button>
      </div>

      <form onSubmit={onSubmit} className="form" noValidate>
        {/* Training selection */}
        <div className="form-group">
          <label htmlFor="training">Training <span className="req">*</span></label>
          <select
            id="training"
            value={String(selectedTraining)}
            onChange={(e) => setSelectedTraining(e.target.value)}
            required
          >
            <option value="">Select a training</option>
            {trainings.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="issueDate">Issue Date <span className="req">*</span></label>
            <input
              type="date"
              id="issueDate"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="expiryDate">Expiry Date (optional)</label>
            <input
              type="date"
              id="expiryDate"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
        </div>

        {/* Attachment area */}
        {mode === "upload" ? (
          <>
            <div
              className={`form-group drop-zone ${dragActive ? "active" : ""}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <label className="mb8">Certificate / Document (PDF, JPG, PNG)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
                style={{ display: "none" }}
              />
              <div
                className="drop-text"
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                aria-label="Choose a file to upload"
              >
                {documentFile ? documentFile.name : "Drag & drop file here or click to upload"}
              </div>
            </div>

            {/* Preview for newly selected file */}
            {documentFile && (
              <div className="preview">
                {documentFile.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(documentFile)}
                    alt="Preview"
                    className="preview-img"
                  />
                ) : (
                  <p className="preview-text">Selected file: {documentFile.name}</p>
                )}
              </div>
            )}

            {/* Existing doc info in edit mode */}
            {!documentFile && editId && currentDocPath && (
              <div className="current-doc hint">
                Current document:{" "}
                <a href={currentDocPath} target="_blank" rel="noopener noreferrer" className="link">
                  View
                </a>
                . Uploading a new file will replace it.
              </div>
            )}
          </>
        ) : (
          <div className="form-group">
            <label htmlFor="docUrl">Document URL <span className="req">*</span></label>
            <input
              type="url"
              id="docUrl"
              placeholder="https://drive.google.com/..."
              value={documentURL}
              onChange={(e) => setDocumentURL(e.target.value)}
              required
            />
            <small className="hint">
              Accepts Google Drive, SharePoint, or any accessible URL. Ensure appropriate sharing permissions.
            </small>

            {/* Simple URL preview */}
            {!!documentURL && (
              <div className="url-preview">
                <strong>Preview:</strong>
                <div className="url-preview-body">
                  {isPdfUrl(documentURL) ? (
                    <iframe title="PDF preview" src={documentURL} className="iframe" />
                  ) : isImgUrl(documentURL) ? (
                    <img src={documentURL} alt="Document preview" className="preview-img" />
                  ) : (
                    <a href={documentURL} className="link" target="_blank" rel="noopener noreferrer">
                      Open link
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Existing doc info in edit mode */}
            {editId && currentDocPath && (
              <div className="current-doc hint">
                Current document:{" "}
                <a href={currentDocPath} target="_blank" rel="noopener noreferrer" className="link">
                  View
                </a>
                . Pasting a new link will replace it.
              </div>
            )}
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="btn primary"
            disabled={!canSubmit}
            aria-busy={busy ? "true" : "false"}
          >
            {busy ? "Saving…" : editId ? "Save changes" : "Add qualification"}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => navigate(`/volunteers/${resolvedVolunteerId}/qualifications`)}
          >
            Cancel
          </button>
        </div>
      </form>

      {/* --- Styles --- */}
      <style>{`
        :root {
          --bg: #f8fafc;
          --text: #0f172a;
          --muted: #475569;
          --card: #ffffff;
          --border: #e5e7eb;
          --focus: #2563eb;
          --primary: #2563eb;
          --danger: #dc2626;
          --shadow: 0 10px 24px rgba(0,0,0,.08);
        }
        .container { padding: 16px; max-width: 780px; margin: 0 auto; color: var(--text); }
        .page-head { display:flex; flex-direction:column; gap:6px; align-items:flex-start; }
        .heading { font-size: 1.8rem; margin: 0.2rem 0 0.4rem; }
        .crumbs{ display:flex; align-items:center; gap:8px; color: var(--muted); font-size:.95rem; }
        .crumb{ color: var(--muted); text-decoration: underline; }
        .crumb.active{ text-decoration: none; color: var(--text); }

        .alert{ padding:12px 14px; border-radius:12px; margin:10px 0; border:1px solid var(--border); background:#fff; box-shadow: var(--shadow); }
        .alert-error{ background:#fef2f2; color:#7F1D1D; border:1px solid #fecaca; }

        .segmented { display: inline-flex; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; margin: .75rem 0 1rem; }
        .seg-btn { padding: .5rem .9rem; background: #f8fafc; border: 0; cursor: pointer; font-weight: 700; }
        .seg-btn.active { background: #0f172a; color: #fff; }

        .form { display: flex; flex-direction: column; gap: 1rem; background: var(--card); padding:16px; border:1px solid var(--border); border-radius:16px; box-shadow: var(--shadow); }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }

        label { font-weight: 700; }
        .req { color: var(--danger); }
        select, input[type="date"], input[type="url"] {
          padding: 10px; font-size: 1rem; border: 1px solid #cbd5e1; border-radius: 10px; transition: border-color 0.2s, box-shadow .2s;
          background: #fff;
        }
        select:focus, input:focus {
          outline: none; border-color: var(--focus); box-shadow: 0 0 0 2px rgba(37, 99, 235, .15);
        }

        .drop-zone { padding: 1rem; border: 2px dashed #cbd5e1; border-radius: 12px; text-align: center; cursor: pointer; transition: .2s; background:#fbfdff; }
        .drop-zone.active { border-color: var(--focus); background-color: #f0f7ff; }
        .drop-text { font-size: 0.95rem; color: #334155; user-select: none; }
        .mb8{ margin-bottom: 8px; }

        .preview { margin-top: 8px; }
        .preview-img { max-width: 100%; max-height: 260px; border-radius: 10px; border:1px solid var(--border); background:#fff; }
        .preview-text { font-size: .95rem; color:#0f172a; font-weight: 600; }

        .url-preview{ margin-top: 10px; }
        .url-preview-body{ border:1px solid var(--border); border-radius: 12px; padding: 8px; background:#fbfdff; }
        .iframe{ width:100%; height:420px; border:0; background:#111; border-radius:10px; }

        .current-doc { margin-top: 6px; }
        .hint { color: var(--muted); font-size: .92rem; }
        .link { color: var(--focus); text-decoration: underline; }

        .form-actions{ display:flex; gap:10px; flex-wrap:wrap; }
        .btn{ border:1px solid transparent; padding:12px 16px; border-radius:10px; cursor:pointer; transition:transform .04s ease, box-shadow .12s ease; 
              box-shadow:0 1px 0 rgba(0,0,0,.04); min-height:44px; font-weight:800; display:inline-flex; align-items:center; gap:8px; color:#fff; }
        .btn:hover { transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        .btn:focus-visible { outline:3px solid var(--focus); outline-offset:2px; }
        .btn.primary { background: var(--primary); color:#fff; }
        .btn.ghost { background:#0f172a; color:#fff; }

        @media (max-width: 480px) {
          .container { padding: .75rem; }
          .heading { font-size: 1.5rem; }
        }
      `}</style>
    </main>
  );
};

export default VolunteerAddQualification;
