
// src/components/QualificationsList.js
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../services/api";

/** File helpers */
const ext = (p = "") => (p.split(".").pop() || "").toLowerCase();
const isImageExt = (p) => ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext(p));
const isPdfExt = (p) => ext(p) === "pdf";

/** API base + auth helpers for protected downloads */
const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";
const absoluteUrl = (path) =>
  (/^https?:\/\//i.test(path) ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`);
const getActiveAccessToken = () =>
  localStorage.getItem("access_token") || localStorage.getItem("vol_access_token");

/** Helpers to resolve volunteer id robustly */
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

const QualificationsList = () => {
  const { volunteerId: volunteerIdParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [volunteerId, setVolunteerId] = useState(null);
  const [volunteer, setVolunteer] = useState(null);
  const [qualifications, setQualifications] = useState([]);
  const [trainingsMap, setTrainingsMap] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Reminders
  const [reminders, setReminders] = useState([]);
  const [remBusy, setRemBusy] = useState(false);
  const [remNote, setRemNote] = useState("");

  // Inline preview state
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(""); // blob or public URL
  const [previewKind, setPreviewKind] = useState("other"); // 'image' | 'pdf' | 'other'
  const [downloadName, setDownloadName] = useState("document");
  const lastBlobUrlRef = useRef(null); // for revoking object URLs

  // Resolve ID from :volunteerId OR ?id= OR localStorage
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const fromQuery = sanitizeId(qs.get("id"));
    const fromParam = sanitizeId(volunteerIdParam);
    const fromStorage = sanitizeId(safeParseVolunteer()?.volunteer_id);
    setVolunteerId(fromParam ?? fromQuery ?? fromStorage);
  }, [volunteerIdParam, location.search]);

  useEffect(() => {
    const load = async () => {
      if (!volunteerId) {
        setLoading(false);
        setMessage("Volunteer not resolved. Please go back to the dashboard and try again.");
        return;
      }
      setLoading(true);
      setMessage("");
      try {
        // NOTE: api.getQualificationsByVolunteer() does not exist in your api.js.
        // We fetch all and filter client-side by volunteerId.
        const [volRes, qualRes, trnRes] = await Promise.all([
          api.getVolunteerById(volunteerId),
          api.getQualifications(),
          api.getTrainings(),
        ]);

        setVolunteer(volRes.data);

        const allQuals = Array.isArray(qualRes.data) ? qualRes.data : [];
        setQualifications(allQuals.filter((q) => Number(q.volunteer_id) === Number(volunteerId)));

        const map = {};
        (trnRes.data || []).forEach((t) => (map[t.id] = t.title));
        setTrainingsMap(map);
      } catch (err) {
        console.error("Error loading qualifications:", err);
        setMessage("Failed to load qualifications. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [volunteerId]);

  // Load reminders for this volunteer
  useEffect(() => {
    if (!volunteerId) return;
    api
      .getQualificationReminders(volunteerId)
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : [];
        // Support both shapes:
        // 1) /qualifications/reminders/:id → { message }
        // 2) /volunteers/:id/notifications → { title, body }
        const normalized = items.map((n) => {
          if (n.message) return n;
          const message = n.title ? (n.body ? `${n.title} — ${n.body}` : n.title) : "Notification";
          return { ...n, message };
        });
        setReminders(normalized);
      })
      .catch((err) => {
        console.error("Failed to load reminders", err);
        setReminders([]);
      });
  }, [volunteerId]);

  // Manual run of reminder job (dev/test)
  const handleRunReminderCheck = async () => {
    setRemBusy(true);
    setRemNote("");
    try {
      const res = await api.runQualificationReminderScan();
      setRemNote(res?.data?.note || "Reminder check executed.");
      const r = await api.getQualificationReminders(volunteerId);
      const items = Array.isArray(r.data) ? r.data : [];
      const normalized = items.map((n) => {
        if (n.message) return n;
        const message = n.title ? (n.body ? `${n.title} — ${n.body}` : n.title) : "Notification";
        return { ...n, message };
      });
      setReminders(normalized);
    } catch (err) {
      console.error("Reminder check failed", err);
      setRemNote("Failed to run reminder check.");
    } finally {
      setRemBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this qualification?")) return;
    try {
      await api.deleteQualification(id);
      setQualifications((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      console.error("Error deleting qualification:", err);
      alert("Failed to delete qualification. See console for details.");
    }
  };

  // Revoke any previous blob URL
  const revokeLastBlob = () => {
    if (lastBlobUrlRef.current) {
      URL.revokeObjectURL(lastBlobUrlRef.current);
      lastBlobUrlRef.current = null;
    }
  };

  // Open inline viewer (handles protected URLs with Authorization)
  const handleView = async (pathOrUrl) => {
    if (!pathOrUrl) return;

    const fullUrl = absoluteUrl(pathOrUrl);
    const token = getActiveAccessToken();

    // If it's a public absolute URL and no token, try direct preview
    if (/^https?:\/\//i.test(fullUrl) && !token) {
      setPreviewKind(isImageExt(fullUrl) ? "image" : isPdfExt(fullUrl) ? "pdf" : "other");
      setPreviewUrl(fullUrl);
      setDownloadName(fullUrl.split("/").pop() || "document");
      setPreviewOpen(true);
      return;
    }

    try {
      const res = await fetch(fullUrl, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Fetch failed (${res.status}) ${t}`.trim());
      }

      // Infer filename
      const cd = res.headers.get("content-disposition") || "";
      const nameFromCD = cd.match(/filename="?([^"]+)"?/i)?.[1];
      const fallbackName = fullUrl.split("/").pop() || "document";
      const filename = nameFromCD || fallbackName;

      // Determine kind from content-type or extension
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const kind = ct.includes("pdf")
        ? "pdf"
        : ct.startsWith("image/")
        ? "image"
        : isPdfExt(filename)
        ? "pdf"
        : isImageExt(filename)
        ? "image"
        : "other";

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      revokeLastBlob();
      lastBlobUrlRef.current = blobUrl;

      setDownloadName(filename);
      setPreviewKind(kind);
      setPreviewUrl(blobUrl);
      setPreviewOpen(true);
    } catch (e) {
      console.error("Preview fetch error:", e);
      // Fallback: open in new tab (may still need auth, but try)
      window.open(fullUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = async () => {
    if (!previewUrl) return;
    // Use the blob URL if we have it; otherwise try to fetch and download
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = downloadName || "document";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Close preview -> cleanup blob URL
  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewUrl("");
    setDownloadName("document");
    setPreviewKind("other");
    revokeLastBlob();
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < new Date(today.toDateString());
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = (expiry - today) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 30;
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return qualifications;
    const q = search.toLowerCase();
    return qualifications.filter((item) => {
      const title = trainingsMap[item.training_id] || "";
      return (
        title.toLowerCase().includes(q) ||
        (item.issue_date || "").toLowerCase().includes(q) ||
        (item.expiry_date || "").toLowerCase().includes(q)
      );
    });
  }, [qualifications, search, trainingsMap]);

  if (loading) return <p style={{ padding: "1rem" }}>Loading…</p>;

  if (!volunteerId) {
    return (
      <main style={{ padding: "1rem" }}>
        <p role="alert">{message || "Volunteer not found."}</p>
        <button onClick={() => navigate("/volunteer/dashboard")} className="btn-link">
          Go to Dashboard
        </button>
        <InlineStyles />
      </main>
    );
  }

  if (!volunteer) {
    return (
      <main style={{ padding: "1rem" }}>
        <p role="alert">{message || "Volunteer not found."}</p>
        <InlineStyles />
      </main>
    );
  }

  return (
    <main style={{ padding: "1rem", maxWidth: 1000, margin: "0 auto" }}>
      <header className="ql-header">
        <h2 tabIndex="0" className="ql-title">
          Qualifications — {volunteer.name}
        </h2>

        <div className="ql-tools">
          <label className="sr-only" htmlFor="qualSearch">Search qualifications</label>
          <input
            id="qualSearch"
            type="search"
            placeholder="Search by training/title/date…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search qualifications by training/title/date"
            className="ql-search"
          />
          <button
            onClick={() => navigate(`/volunteers/${volunteer.volunteer_id}/qualifications/add`)}
            className="btn btn-primary btn-sm"
            aria-label={`Add qualification for ${volunteer.name}`}
          >
            <span aria-hidden="true" className="btn-icon">＋</span> Add
          </button>
        </div>
      </header>

      {(reminders?.length > 0 || remNote) && (
        <div className="ql-reminders" role="region" aria-label="Qualification reminders">
          {reminders?.length > 0 && (
            <div className="msg msg--warn" role="alert">
              <strong>Heads-up:</strong>
              <ul className="msg-list">
                {reminders.map((r, idx) => (
                  <li key={idx}>⏰ {r.message}</li>
                ))}
              </ul>
            </div>
          )}
          {remNote && <div className="msg msg--info">{remNote}</div>}
          <div className="ql-rem-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleRunReminderCheck}
              disabled={remBusy}
              aria-busy={remBusy ? "true" : "false"}
            >
              {remBusy ? "Checking…" : "Run reminder check"}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p>No qualifications found for {volunteer.name}.</p>
      ) : (
        <div className="ql-table-wrap">
          <table className="ql-table" aria-label={`Qualifications for ${volunteer.name}`}>
            <thead>
              <tr>
                <Th>Training</Th>
                <Th>Issue Date</Th>
                <Th>Expiry</Th>
                <Th>Document</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, idx) => {
                const expSoon = isExpiringSoon(q.expiry_date);
                const expired = isExpired(q.expiry_date);
                const isLast = idx === filtered.length - 1;
                const docPath = q.document_path || q.document_url || "";
                return (
                  <React.Fragment key={q.id}>
                    <tr className="ql-row">
                      <Td>
                        <div className="td-training">
                          <div className="td-title">{trainingsMap[q.training_id] || "Unknown"}</div>
                          {(expired || expSoon) && (
                            <span className={`chip ${expired ? "chip--danger" : "chip--warn"}`}>
                              {expired ? "Expired" : "Expiring soon"}
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td>{formatDate(q.issue_date) || "N/A"}</Td>
                      <Td>
                        <span
                          className={`badge ${expired ? "badge--danger" : expSoon ? "badge--warn" : "badge--ok"}`}
                          aria-label={
                            expired
                              ? "Expired"
                              : expSoon
                              ? "Expiring soon"
                              : q.expiry_date
                              ? "Valid"
                              : "No expiry date"
                          }
                          title={
                            expired
                              ? "Expired"
                              : expSoon
                              ? "Expiring within 30 days"
                              : q.expiry_date
                              ? "Valid"
                              : "No expiry"
                          }
                        >
                          {q.expiry_date ? formatDate(q.expiry_date) : "N/A"}
                        </span>
                      </Td>
                      <Td>
                        {docPath ? (
                          <button
                            type="button"
                            onClick={() => handleView(docPath)}
                            className="link-as-btn"
                            aria-label="View certificate document"
                          >
                            View
                          </button>
                        ) : (
                          "N/A"
                        )}
                      </Td>
                      <Td>
                        <div className="ql-actions">
                          <button
                            onClick={() =>
                              navigate(`/volunteers/${volunteer.volunteer_id}/qualifications/add?edit=${q.id}`)
                            }
                            className="btn btn-amber btn-xs"
                            aria-label="Edit qualification"
                          >
                            ✎ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="btn btn-rose btn-xs"
                            aria-label="Delete qualification"
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </Td>
                    </tr>

                    {!isLast && (
                      <tr className="ql-divider" aria-hidden="true">
                        <td colSpan="5">
                          <div className="divider-line" />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isPreviewOpen && (
        <div className="preview-backdrop" role="dialog" aria-modal="true" aria-label="Document preview">
          <div className="preview-modal">
            <div className="preview-bar">
              <span className="preview-title">
                {previewKind === "image" ? "Image preview" : previewKind === "pdf" ? "PDF preview" : "Preview"}
              </span>
              <div className="spacer" />
              <button className="btn btn-sm" onClick={handleDownload}>Download</button>
              <a className="btn btn-sm" href={previewUrl} target="_blank" rel="noopener noreferrer">
                Open in new tab
              </a>
              <button className="btn btn-rose btn-sm" onClick={closePreview}>
                Close
              </button>
            </div>
            <div className="preview-body">
              {previewKind === "image" && (
                <img src={previewUrl} alt="Document" className="preview-embed-img" />
              )}
              {previewKind === "pdf" && (
                <iframe className="preview-embed-frame" title="PDF preview" src={previewUrl} />
              )}
              {previewKind === "other" && (
                <div style={{ color: "#fff", padding: 16 }}>Unsupported preview type.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <InlineStyles />
    </main>
  );
};

const Th = ({ children }) => (
  <th scope="col" className="ql-th">
    {children}
  </th>
);

const Td = ({ children }) => <td className="ql-td">{children}</td>;

function formatDate(s) {
  if (!s) return "";
  try {
    const d = new Date(s);
    return d.toLocaleDateString();
  } catch {
    return s;
  }
}

/** Injected CSS (unchanged) */
const InlineStyles = () => (
  <style>{`
    :root{
      --border:#e5e7eb;
      --muted:#475569;
      --text:#0f172a;
      --primary:#3b82f6;
      --primary-600:#2563eb;
      --ok-bg:#ecfdf5; --ok-text:#065f46; --ok-br:#a7f3d0;
      --wr-bg:#fff7ed; --wr-text:#9a3412; --wr-br:#fed7aa;
      --dn-bg:#fef2f2; --dn-text:#7f1d1d; --dn-br:#fecaca;
    }
    .ql-header{display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap; margin-bottom:12px;}
    .ql-title{ margin:0; }
    .ql-tools{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .ql-search{ padding:.45rem .65rem; min-width:240px; border:1px solid var(--border); border-radius:8px; }
    .ql-reminders{ display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap; margin: 6px 0 12px; }
    .ql-rem-actions{ display:flex; align-items:center; gap:8px; }
    .msg{ padding:10px 12px; border-radius:10px; border:1px solid var(--border); background:#fff; }
    .msg--warn{ background: var(--wr-bg); border-color: var(--wr-br); color: var(--wr-text); }
    .msg--info{ background: #eef2ff; border-color:#c7d2fe; color: #1e3a8a; }
    .msg-list{ margin:6px 0 0 18px; padding:0; }
    .ql-table-wrap{ overflow-x:auto; border:1px solid var(--border); border-radius:12px; }
    .ql-table{ width:100%; border-collapse:separate; border-spacing:0; }
    thead tr{ background:#f8fafc; }
    .ql-th{ text-align:left; padding:.6rem .65rem; border-bottom:2px solid #0f172a; font-weight:700; white-space:nowrap; }
    .ql-td{ padding:.6rem .65rem; border-bottom:1px solid var(--border); vertical-align:middle; }
    .ql-row:nth-child(odd){ background:#ffffff; }
    .ql-row:nth-child(even){ background:#fbfdff; }
    .ql-divider td{ padding:0; border:0; }
    .divider-line{ height:8px; background: linear-gradient(90deg, transparent, rgba(15,23,42,.08), transparent); }
    .link{ color:var(--primary); text-decoration:underline; }
    .link:hover{ color:var(--primary-600); }
    .badge{ display:inline-block; padding:.15rem .5rem; border-radius:999px; font-size:.8rem; border:1px solid transparent; }
    .badge--ok{ background:var(--ok-bg); color:var(--ok-text); border-color:var(--ok-br); }
    .badge--warn{ background:var(--wr-bg); color:var(--wr-text); border-color:var(--wr-br); }
    .badge--danger{ background:var(--dn-bg); color:var(--dn-text); border-color:var(--dn-br); }
    .chip{ display:inline-block; padding:.15rem .5rem; border-radius:999px; font-size:.75rem; margin-top:2px; border:1px solid transparent; }
    .chip--warn{ background:var(--wr-bg); color:var(--wr-text); border-color:var(--wr-br); }
    .chip--danger{ background:var(--dn-bg); color:var(--dn-text); border-color:var(--dn-br); }
    .sr-only{ position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); border:0; }
    .ql-actions{ display:flex; flex-wrap:wrap; gap:.4rem; align-items:center; }
    .btn{ border:1px solid var(--border); background:#fff; color:(--text); font-weight:600; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:.3rem; font-size:.82rem; line-height:1.2; min-height:28px; padding:.2rem .5rem; transition:background .15s ease, transform .05s ease; }
    .btn:hover{ background:#f3f4f6; transform:translateY(-1px); }
    .btn:active{ transform:translateY(0); }
    .btn-xs{ font-size:.82rem; min-height:28px; padding:.2rem .45rem; }
    .btn-sm{ font-size:.9rem; min-height:30px; padding:.3rem .55rem; }
    .btn-primary{ background:var(--primary); color:#fff; border-color:transparent; }
    .btn-primary:hover{ background:var(--primary-600); }
    .btn-amber{ background:#fff7ed; color:#7c2d12; border-color:#fed7aa; }
    .btn-amber:hover{ background:#ffedd5; }
    .btn-rose{ background:#fee2e2; color:#7f1d1d; border-color:#fecaca; }
    .btn-rose:hover{ background:#fecaca; }
    .btn-link{ padding:.45rem .75rem; background:#e2e8f0; color:#0f172a; border:none; border-radius:6px; font-weight:600; cursor:pointer; }
    .link-as-btn{ background:none; border:none; color:var(--primary); text-decoration:underline; cursor:pointer; padding:0; font: inherit; }
    .preview-backdrop{ position: fixed; inset: 0; background: rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index: 9999; padding: 16px; }
    .preview-modal{ background:#fff; width: min(100%, 1000px); height: min(90vh, 820px); border-radius: 12px; overflow: hidden; display:flex; flex-direction:column; box-shadow: 0 10px 30px rgba(0,0,0,.25); }
    .preview-bar{ display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid var(--border); background:#f8fafc; }
    .preview-title{ font-weight:700; }
    .spacer{ flex:1; }
    .preview-body{ flex:1; background:#111; display:flex; align-items:center; justify-content:center; }
    .preview-embed-img{ max-width:100%; max-height:100%; object-fit: contain; background:#111; }
    .preview-embed-frame{ width:100%; height:100%; border:0; background:#111; }
    @media (max-width:640px){
      .ql-actions{ flex-direction:column; }
      .btn{ width:100%; font-size:1rem; min-height:44px; padding:.55rem .9rem; }
      .ql-reminders{ flex-direction:column; }
      .ql-rem-actions{ width:100%; }
      .ql-rem-actions .btn{ width:100%; }
    }
  `}</style>
);

export default QualificationsList;

