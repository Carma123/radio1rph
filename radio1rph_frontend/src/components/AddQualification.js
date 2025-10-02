import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";

/* ---------------- Helpers ---------------- */
const safeParseVolunteer = () => {
  try {
    const raw = localStorage.getItem("volunteer");
    if (!raw || raw === "undefined" || raw === "null") return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const sanitizeId = (v) => {
  if (v === undefined || v === null) return null;
  if (v === "undefined" || v === "null" || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const AddQualification = () => {
  const [volunteerId, setVolunteerId] = useState(null);
  const [volunteer, setVolunteer] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [mode, setMode] = useState("upload"); // "upload" | "link"
  const [documentFile, setDocumentFile] = useState(null);
  const [documentURL, setDocumentURL] = useState("");
  const [loadingTrainings, setLoadingTrainings] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  // Resolve volunteerId from ?id= or localStorage
  useEffect(() => {
    const qp = new URLSearchParams(location.search);
    const fromQuery = sanitizeId(qp.get("id"));
    const fromStorage = sanitizeId(
      safeParseVolunteer()?.volunteer_id ?? safeParseVolunteer()?.id
    );
    setVolunteerId(fromQuery ?? fromStorage);
  }, [location.search]);

  // Fetch volunteer + trainings once we have a valid id
  useEffect(() => {
    const load = async () => {
      if (!volunteerId) return;
      try {
        const [vRes, tRes] = await Promise.all([
          api.getVolunteerById(volunteerId),
          api.getTrainings(),
        ]);
        setVolunteer(vRes.data);
        setTrainings(Array.isArray(tRes.data) ? tRes.data : []);
      } catch (err) {
        console.error("Load error:", err);
        alert("Failed to load volunteer/trainings.");
      } finally {
        setLoadingTrainings(false);
      }
    };
    load();
  }, [volunteerId]);

  const handleFileChange = (file) => setDocumentFile(file);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const volId =
      sanitizeId(volunteer?.id) ?? sanitizeId(volunteer?.volunteer_id);
    const trainingId = sanitizeId(selectedTraining);

    if (!volId) {
      alert("Volunteer not resolved. Please reopen from the dashboard.");
      return;
    }
    if (!trainingId || !issueDate) {
      alert("Please select a training and issue date.");
      return;
    }

    try {
      if (mode === "upload") {
        if (!documentFile) {
          alert("Please upload a file (PDF/JPG/PNG).");
          return;
        }
        const formData = new FormData();
        formData.append("volunteer_id", String(volId));
        formData.append("training_id", String(trainingId));
        formData.append("issue_date", issueDate);
        if (expiryDate) formData.append("expiry_date", expiryDate);
        formData.append("document", documentFile);
        await api.addQualification(formData); // multipart
      } else {
        if (!documentURL.trim()) {
          alert("Please paste a document link.");
          return;
        }
        await api.addQualification({
          volunteer_id: volId,
          training_id: trainingId,
          issue_date: issueDate,
          expiry_date: expiryDate || null,
          document_url: documentURL.trim(),
        }); // JSON
      }

      alert("Qualification assigned successfully!");
      navigate(`/volunteers/${volId}/qualifications`);
    } catch (error) {
      console.error("Error assigning qualification:", error);
      const msg = error?.response?.data?.error || "Failed to assign qualification.";
      alert(msg);
    }
  };

  /* ---------- Early guards ---------- */
  if (!volunteerId) {
    return (
      <main className="container">
        <h2 className="heading">Assign Qualification</h2>
        <p role="alert">
          Volunteer not resolved. Open this page from the dashboard or include{" "}
          <code>?id=VOLUNTEER_ID</code>.
        </p>
        <button className="btn" onClick={() => navigate("/volunteer/dashboard")}>
          Go to Dashboard
        </button>
      </main>
    );
  }

  if (!volunteer) return <p className="container">Loading volunteer data...</p>;
  if (loadingTrainings) return <p className="container">Loading trainings...</p>;

  return (
    <main className="container">
      <h2 tabIndex="0" className="heading">
        Assign Qualification to {volunteer.name}
      </h2>

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

      <form onSubmit={handleSubmit} className="form">
        {/* Training selection */}
        <div className="form-group">
          <label htmlFor="training">Training</label>
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

        {/* Issue date */}
        <div className="form-group">
          <label htmlFor="issueDate">Issue Date</label>
          <input
            type="date"
            id="issueDate"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
          />
        </div>

        {/* Expiry date */}
        <div className="form-group">
          <label htmlFor="expiryDate">Expiry Date (optional)</label>
          <input
            type="date"
            id="expiryDate"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
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
                onChange={(e) => handleFileChange(e.target.files[0])}
                style={{ display: "none" }}
              />
              <div
                className="drop-text"
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              >
                {documentFile ? documentFile.name : "Drag & drop file here or click to upload"}
              </div>
            </div>

            {/* Preview */}
            {documentFile && (
              <div className="preview">
                {documentFile.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(documentFile)}
                    alt="Preview"
                    className="preview-img"
                  />
                ) : (
                  <p className="preview-text">{documentFile.name}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="form-group">
            <label htmlFor="docUrl">Document URL</label>
            <input
              type="url"
              id="docUrl"
              placeholder="https://drive.google.com/..."
              value={documentURL}
              onChange={(e) => setDocumentURL(e.target.value)}
              required
            />
            <small className="hint">
              Accepts Google Drive, SharePoint, or any accessible URL. Ensure appropriate
              sharing permissions.
            </small>
          </div>
        )}

        <button type="submit" className="btn">Assign Qualification</button>
      </form>

      {/* --- Styles --- */}
      <style>{`
        .container { padding: 1rem; max-width: 680px; margin: 0 auto; font-family: Arial, sans-serif; }
        .heading { font-size: 1.75rem; margin-bottom: 1rem; text-align: center; }
        .segmented { display: inline-flex; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; margin: .5rem 0 1rem; }
        .seg-btn { padding: .5rem .9rem; background: #f8fafc; border: 0; cursor: pointer; font-weight: 600; }
        .seg-btn.active { background: #0f172a; color: #fff; }
        .form { display: flex; flex-direction: column; gap: 1rem; }
        .form-group { display: flex; flex-direction: column; }
        label { margin-bottom: 0.5rem; font-weight: 600; }
        select, input[type="date"], input[type="url"] {
          padding: 0.55rem; font-size: 1rem; border: 1px solid #cbd5e1; border-radius: 8px; transition: border-color 0.2s;
        }
        select:focus, input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, .15); }
        .drop-zone { padding: 1rem; border: 2px dashed #cbd5e1; border-radius: 8px; text-align: center; cursor: pointer; transition: .2s; }
        .drop-zone.active { border-color: #2563eb; background-color: #f0f7ff; }
        .drop-text { font-size: 0.95rem; color: #334155; }
        .preview { margin-top: 0.5rem; }
        .preview-img { max-width: 100%; max-height: 220px; border-radius: 6px; }
        .preview-text { font-size: 0.9rem; color: #0f172a; font-weight: 500; }
        .hint { color: #475569; margin-top: .3rem; }
        .btn { padding: 0.75rem 1.25rem; background-color: #0f172a; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600; }
        .btn:hover, .btn:focus { background-color: #1e293b; outline: none; }
        @media (max-width: 480px) {
          .container { padding: .75rem; }
          .heading { font-size: 1.5rem; }
        }
      `}</style>
    </main>
  );
};

export default AddQualification;
