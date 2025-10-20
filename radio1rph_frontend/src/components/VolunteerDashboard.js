// src/components/VolunteerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, NavLink } from "react-router-dom";
import api from "../services/api";
import icon from "./icon.png";

/* ================================
   Inline CSS: polished + WCAG 2.1
   ================================ */
const DASHBOARD_STYLE_ID = "vtms-dashboard-styles";
const injectStylesOnce = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById(DASHBOARD_STYLE_ID)) return;
  const css = `
:root {
  /* Light theme tokens */
  --bg: #f8fafc;          /* slate-50 */
  --text: #0f172a;        /* slate-900 */
  --muted: #475569;       /* slate-600 */
  --card: #ffffff;
  --border: #e5e7eb;      /* gray-200 */
  --focus: #2563eb;       /* blue-600 */
  --primary: #2563eb;     /* blue-600 (AA on white) */
  --success: #16a34a;     /* green-600 */
  --warn: #b45309;        /* amber-700 (AA) */
  --danger: #b91c1c;      /* red-700 (AA) */
  --badge-bg: #eef2ff;    /* indigo-50 */
  --badge-txt: #1e40af;   /* indigo-800 */
  --table-stripe: #f1f5f9;/* slate-100 */
  --shadow: 0 10px 24px rgba(0,0,0,.08);

  --radius-lg: 18px;
  --radius-md: 12px;

  --tap: 44px; /* min target size */
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0b1220;
    --text: #e5e7eb;
    --muted: #cbd5e1;
    --card: #0f172a;
    --border: #1f2937;
    --focus: #60a5fa;
    --primary: #60a5fa;
    --success: #22c55e;
    --warn: #f59e0b;
    --danger: #ef4444;
    --badge-bg: #111827;
    --badge-txt: #bfdbfe;
    --table-stripe: #0b1628;
    --shadow: 0 10px 24px rgba(0,0,0,.45);
  }
}

@media (prefers-contrast: more) {
  :root { --primary:#1d4ed8; --focus:#1d4ed8; --border:#cbd5e1; }
}

/* Page shell */
.dashboard-container {
  max-width: 1200px;
  margin-inline: auto;
  padding: 16px;
  background: var(--bg);
  color: var(--text);
  font-size: 16px;
  line-height: 1.55;
}
.dashboard-main { outline: none; }

/* A11y utilities */
.sr-live, .sr-only {
  position:absolute;height:1px;width:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap
}

/* Skip link */
.skip-link{
  position:absolute;left:-999px;top:auto;width:1px;height:1px;overflow:hidden
}
.skip-link:focus{
  left:16px;top:10px;width:auto;height:auto;z-index:1000;background:#111827;color:#fff;padding:8px 12px;border-radius:8px
}

/* Navbar */
.navbar{ position: sticky; top: 0; z-index: 10; margin-bottom: 16px; }
.navbar-inner{
  background:var(--card); border:1px solid var(--border); border-radius:var(--radius-lg);
  box-shadow:var(--shadow); overflow:hidden;
  backdrop-filter: saturate(140%) blur(6px);
}
.navbar-top{ display:flex; align-items:center; justify-content:space-between; padding:12px 16px 8px }
.navbar-brand-center{ display:flex; align-items:center; gap:12px; justify-content:center; flex:1 }
.navbar-brand-center img{
  height:40px;width:40px;object-fit:contain;border-radius:10px;background:#fff;
  border:1px solid var(--border); box-shadow: 0 4px 16px rgba(37,99,235,.18), inset 0 0 0 3px rgba(37,99,235,.06)
}
.navbar-title{ font-weight: 900; letter-spacing: .2px; }
.navbar-spacer{ width: var(--tap); height: var(--tap); }

.navbar-toggle{
  display:inline-flex; align-items:center; justify-content:center;
  min-height:var(--tap); min-width:var(--tap);
  border:1px solid var(--border); border-radius:12px;
  background:var(--card); color:var(--text); cursor:pointer;
  box-shadow:0 1px 2px rgba(0,0,0,.06)
}
.navbar-toggle:hover{ box-shadow:0 2px 6px rgba(0,0,0,.12) }
.navbar-toggle:active{ transform:scale(.98) }
.navbar-toggle svg{ display:block; width:22px; height:22px }

.navbar-links{
  display:flex; gap:10px; list-style:none; margin:0; padding:10px 12px;
  justify-content:center; border-top:1px solid var(--border); background:var(--card)
}
.navbar-links li{ display:flex }

/* Nav links */
.navlink{
  color:var(--text); text-decoration:none; padding:10px 14px; min-height:var(--tap);
  border-radius:999px; border:1px solid var(--border); background:var(--card);
  transition: background .12s ease, transform .04s ease, box-shadow .12s ease, border-color .12s ease;
  font-weight:750; line-height:1; display:inline-flex; align-items:center; gap:8px
}
.navlink:hover{ background:#eef2ff22; border-color:#dbeafe55; text-decoration:underline; text-underline-offset:3px }
.navlink:active{ transform:scale(.98) }
.navlink.active, .navlink[aria-current="page"]{ outline:3px solid var(--focus); outline-offset:2px }

/* Logout button (button-like link) */
.logout-button{
  min-height:var(--tap); padding:10px 14px; border-radius:999px; border:1px solid var(--border);
  background:#0f172a; color:#fff; cursor:pointer; font-weight:800
}
.logout-button:hover{ filter: brightness(.95) }
.navbar-toggle:focus-visible,
.navlink:focus-visible,
.logout-button:focus-visible,
.btn:focus-visible,
.link-inline:focus-visible,
.eoi__title:focus { outline:3px solid var(--focus); outline-offset:2px }

/* Responsive nav */
@media (min-width: 721px) { .navbar-toggle { display:none } .navbar-links { display:flex !important } }
@media (max-width: 720px) {
  .navbar-links{ display:none; padding:10px }
  .navbar-links.open{ display:flex; flex-direction:column; align-items:stretch }
  .navlink, .logout-button{ width:100% }
}

/* Hero */
.dashboard-hero{
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px;
  padding:28px; border-radius:var(--radius-lg); margin-bottom:16px;
  background:linear-gradient(135deg, #eef4ff 0%, var(--card) 100%);
  border:1px solid var(--border); box-shadow:var(--shadow)
}
.hero-icon{ height:72px; width:72px; border-radius:16px; object-fit:contain; background:#fff; border:1px solid var(--border); box-shadow: 0 10px 26px rgba(30,64,175,.22), inset 0 0 0 4px rgba(37,99,235,.08) }
.hero-title{ font-size: clamp(1.5rem, 1.2rem + 1.2vw, 2rem); margin:0; text-align:center }
.hero-sub{ color:var(--muted); font-size:1rem; margin:0; text-align:center }

/* Grid: flexible, responsive */
.dashboard-grid{
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap:16px; align-items:start
}

/* Card */
.card{
  background:var(--card); border:1px solid var(--border); border-radius:var(--radius-lg);
  padding:16px; box-shadow:var(--shadow); position:relative; overflow:hidden;
  transition: transform .08s ease, box-shadow .14s ease, border-color .14s ease
}
.card::before{ content:""; position:absolute; inset:0 0 auto 0; height:6px; background:linear-gradient(90deg,#93c5fd,#60a5fa) }
.card:hover{ transform: translateY(-2px); border-color:#bfdbfe; box-shadow:0 20px 40px rgba(2,6,23,.12) }
@media (prefers-reduced-motion: reduce){ .card{ transition:none } }
.card:focus-within{ outline:3px solid var(--focus); outline-offset:2px }
.card h2{ font-size:1.12rem; margin:6px 0 10px; display:flex; align-items:center; gap:8px }
.card h2 img{ height:22px; width:22px; object-fit:contain; border-radius:6px; background:#fff; border:1px solid var(--border) }
.card-content ul{ margin:0; padding-left:18px }

/* Buttons */
.btn{
  border:1px solid transparent; padding:12px 16px; border-radius:12px; cursor:pointer;
  transition: transform .04s ease, box-shadow .12s ease, filter .12s ease;
  box-shadow:0 1px 0 rgba(0,0,0,.04); min-height:var(--tap);
  font-weight:800; display:inline-flex; align-items:center; gap:8px; color:#fff
}
.btn:hover{ transform: translateY(-1px); filter:brightness(.98) }
.btn:active{ transform: translateY(0) }
.btn.primary{ background:var(--primary) }
.btn.success{ background:var(--success) }
.btn.warn{ background:var(--warn) }
.btn.danger{ background:var(--danger) }
.btn.ghost{ background:#0f172a }
.btn[disabled], .btn[aria-disabled="true"]{ opacity:.65; cursor:not-allowed }
.btn.block{ width:100% }

/* Inline link button */
.link-inline{
  appearance:none; background:none; border:none; color:#1d4ed8; text-decoration:underline;
  font:inherit; padding:.25rem .125rem; border-radius:6px; cursor:pointer
}
.link-inline:hover{ color:#1e40af; text-decoration-thickness:2px }
.link-inline:focus-visible{ outline:3px solid #93c5fd; outline-offset:2px }

/* Messages */
.alert{ padding:12px 14px; border-radius:12px; margin:8px 0 }
.alert-error{ background:#fef2f2; color:#7F1D1D; border:1px solid #fecaca }

/* Table */
.table-wrap{ background:var(--card); border:1px solid var(--border); border-radius:12px; overflow-x:auto }
.eoi-table{ width:100%; border-collapse:collapse; min-width:720px }
.eoi-table th, .eoi-table td{ text-align:left; padding:12px 14px; border-bottom:1px solid var(--border); vertical-align:middle }
.eoi-table thead th{ font-weight:700; background:#fbfdff10 }
.eoi-table tbody tr:nth-child(odd){ background:var(--table-stripe) }
.col-actions{ width:1%; white-space:nowrap }
.table-hint{ font-size:.95rem; color:var(--muted); padding:10px 12px }

/* Status badges */
.status-badge{
  display:inline-block; padding:6px 10px; border-radius:999px; background:var(--badge-bg); color:var(--badge-txt);
  border:1px solid #e2e8f0; font-weight:700; font-size:.92rem; letter-spacing:.02em; text-transform:capitalize
}
.td-status.approved  .status-badge { background:#ecfdf5; color:#065f46; border-color:#d1fae5 }
.td-status.pending   .status-badge { background:#fefce8; color:#713f12; border-color:#fde68a }
.td-status.standby   .status-badge { background:#eff6ff; color:#1e40af; border-color:#bfdbfe }
.td-status.rejected  .status-badge { background:#fef2f2; color:#991b1b; border-color:#fecaca }
.td-status.cancelled .status-badge { background:#e2e8f0; color:#0f172a; border-color:#cbd5e1 }

/* Notices */
.notice-list{ margin:0; padding-left:18px }
.notice-list li{ margin:6px 0 }
.badge-local{ margin-left:8px; font-size:.8rem; background:#fff7ed; color:#9a3412; border:1px solid #fdba74; padding:0 8px; border-radius:999px }
.refresh-row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px }

/* Results */
.results-list{ margin:0; padding-left:18px }
.results-list li{ margin:6px 0 }
.result-badge{
  display:inline-block; padding:4px 10px; border-radius:999px; border:1px solid #e2e8f0;
  font-size:.92rem; font-weight:800; text-transform:capitalize; margin-left:6px
}
.result-badge.competent{ background:#ecfdf5; color:#065f46; border-color:#d1fae5 }
.result-badge.not_yet_competent{ background:#fff7ed; color:#9a3412; border-color:#fed7aa }
.result-badge.not_assessed{ background:#f1f5f9; color:#0f172a; border-color:#e2e8f0 }
.result-badge.participated{ background:#eff6ff; color:#1e40af; border-color:#bfdbfe }

/* Trainings */
.trainings-grid{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px }
@media (max-width:900px){ .trainings-grid{ grid-template-columns:1fr } }
.training-card{ border:1px solid var(--border); border-radius:14px; padding:12px; background:var(--card); box-shadow:var(--shadow) }
.training-title{ font-weight:900; letter-spacing:.2px }
.training-meta{ display:flex; flex-wrap:wrap; gap:6px; margin-top:6px }
.training-actions{ display:flex; gap:8px; flex-wrap:wrap; margin-top:8px }

/* Motion + High contrast */
@media (prefers-reduced-motion: reduce){ .btn, .navlink, .navbar-toggle, .card{ transition:none } }
@media (forced-colors: active){
  .card, .navbar-inner, .table-wrap, .status-badge { border:1px solid CanvasText }
  .navlink:hover { outline:1px solid Highlight }
  .btn { border:1px solid ButtonText }
}
`;
  const tag = document.createElement("style");
  tag.id = DASHBOARD_STYLE_ID;
  tag.appendChild(document.createTextNode(css));
  document.head.appendChild(tag);
};

/* ------------ helpers ------------- */
const daysUntil = (isoDate) => {
  if (!isoDate) return null;
  const today = new Date();
  const d = new Date(isoDate);
  const t0 = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const t1 = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  return Math.round((t1 - t0) / (1000 * 60 * 60 * 24));
};

/* Protected file opener (uses volunteer JWT) */
const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";
function absoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return API_BASE + (path.startsWith("/") ? "" : "/") + path;
}
async function openProtectedFile(path, suggestedName = "file") {
  try {
    const url = absoluteUrl(path);
    if (!url) return;

    // Use your api.js storage keys (vol_access), but accept legacy key too.
    const volToken = localStorage.getItem("vol_access") || localStorage.getItem("vol_access_token");
    const res = await fetch(url, {
      method: "GET",
      headers: volToken ? { Authorization: "Bearer " + volToken } : {},
      credentials: "omit",
    });
    if (!res.ok) {
      let text = "";
      try { text = await res.text(); } catch {}
      throw new Error(("Download failed (" + res.status + ") " + text).trim());
    }

    const blob = await res.blob();
    const cd = res.headers.get("content-disposition");
    const filenameMatch = cd && cd.match(/filename="?([^"]+)"?/);
    const filename = (filenameMatch && filenameMatch[1]) || suggestedName;

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
    console.error("openProtectedFile error:", e);
    alert("Couldn’t open the file. You may need to log in again, or the file path is invalid.");
  }
}

/* ======================================
   Component
====================================== */
const VolunteerDashboard = ({ volunteer: initialVolunteer, onLogout }) => {
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState(initialVolunteer || null);
  const [attendance, setAttendance] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [submittedEOIs, setSubmittedEOIs] = useState([]);

  // Training results (from /volunteers/:id/training-results)
  const [results, setResults] = useState([]);
  const [resultsError, setResultsError] = useState("");

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifBusy, setNotifBusy] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eoiBusyId, setEoiBusyId] = useState(null);
  const [cancelBusyId, setCancelBusyId] = useState(null);
  const [liveMsg, setLiveMsg] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);

  useEffect(() => { injectStylesOnce(); }, []);

  // Close menu on Escape (WCAG 2.1.1 Keyboard)
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") setMenuOpen(false); }
    if (menuOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const storedVolunteer =
      initialVolunteer || JSON.parse(localStorage.getItem("volunteer"));
    if (!storedVolunteer || !storedVolunteer.volunteer_id) {
      navigate("/volunteer-login");
      return;
    }
    setVolunteer(storedVolunteer);
    loadAll(storedVolunteer.volunteer_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVolunteer]);

  const loadAll = async (volunteerId) => {
    setLoading(true);
    setError("");
    try {
      const [
        volunteerResponse,
        attendanceResponse,
        qualificationsResponse,
        trainingsResponse,
        eoisResponse,
        notifResponse,
      ] = await Promise.all([
        api.getVolunteerById(volunteerId),
        api.getAttendanceByVolunteer(volunteerId),
        api.getQualificationsByVolunteer(volunteerId),
        api.getTrainings(),
        api.getVolunteerEOIs(volunteerId),
        api.getVolunteerNotifications(volunteerId),
      ]);

      setVolunteer(volunteerResponse.data);
      localStorage.setItem("volunteer", JSON.stringify(volunteerResponse.data));
      setAttendance(attendanceResponse.data || []);
      setQualifications(qualificationsResponse.data || []);
      setTrainings(trainingsResponse.data || []);
      setSubmittedEOIs(eoisResponse.data || []);
      setNotifications(notifResponse.data || []);

      // Results
      try {
        const res = await api.getVolunteerTrainingResults(volunteerId);
        setResults(Array.isArray(res.data) ? res.data : []);
        setResultsError("");
      } catch (err) {
        console.warn("Results endpoint not available or failed:", err?.response?.status || err);
        setResults([]);
        setResultsError("Results are not available yet.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to fetch volunteer data.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- client-side fallback notices ---------- */
  const trainingTitleById = useMemo(() => {
    const map = new Map();
    (trainings || []).forEach((t) => map.set(t.id, t.title));
    return map;
  }, [trainings]);

  const localNotices = useMemo(() => {
    const out = [];
    (qualifications || []).forEach((q) => {
      if (!q.expiry_date) return;
      const d = daysUntil(q.expiry_date);
      if (d === null) return;

      const titleMap = { 90: "Qualification expiring in 90 days", 14: "Qualification expiring in 14 days", 0: "Qualification expired" };
      const trainingTitle = trainingTitleById.get(q.training_id) || ("Training #" + q.training_id);

      if (d === 90 || d === 14 || d === 0) {
        out.push({
          id: "local-" + q.id + "-" + d,
          audience: "volunteer",
          type: d === 0 ? "qualification_expired" : "qualification_expiry_t" + d,
          title: titleMap[d],
          body: d === 0
            ? 'Your "' + trainingTitle + '" qualification has expired today.'
            : 'Your "' + trainingTitle + '" qualification will expire in ' + d + " days.",
          meta: { qualification_id: q.id, training_id: q.training_id, expiry_date: q.expiry_date, local: true },
          created_at: new Date().toISOString(),
          read_at: null,
        });
      } else if (d < 0) {
        out.push({
          id: "local-" + q.id + "-expired",
          audience: "volunteer",
          type: "qualification_expired",
          title: "Qualification expired",
          body: 'Your "' + trainingTitle + '" qualification expired ' + Math.abs(d) + " day(s) ago.",
          meta: { qualification_id: q.id, training_id: q.training_id, expiry_date: q.expiry_date, local: true },
          created_at: new Date().toISOString(),
          read_at: null,
        });
      }
    });
    return out;
  }, [qualifications, trainingTitleById]);

  const mergedNotices = useMemo(() => {
    const key = (n) => (n.type + "::" + (n?.meta?.qualification_id ?? "na"));
    const map = new Map();
    (notifications || []).forEach((n) => map.set(key(n), n));
    (localNotices || []).forEach((n) => { const k = key(n); if (!map.has(k)) map.set(k, n); });
    return Array.from(map.values()).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }, [notifications, localNotices]);

  const anyLocal = useMemo(() => mergedNotices.some((n) => n?.meta?.local), [mergedNotices]);

  const hasSubmitted = (trainingId) =>
    submittedEOIs.some((e) => e.training_id === trainingId && e.status !== "cancelled");

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "N/A");
  const titleOf = (trainingId) => trainingTitleById.get(trainingId) || ("Training #" + trainingId);

  const recentWins = useMemo(() => {
    const wins = [];
    (results || []).forEach((r) => {
      const when = r.date_assessed ? new Date(r.date_assessed) : null;
      const days = when ? Math.floor((Date.now() - when.getTime()) / (1000 * 60 * 60 * 24)) : null;
      if (days !== null && days <= 30) {
        if (r.result === "competent") wins.push({ type: "competent", title: titleOf(r.training_id), date: r.date_assessed });
        else if (r.result === "participated") wins.push({ type: "participated", title: titleOf(r.training_id), date: r.date_assessed });
      }
    });
    return wins.slice(0, 5);
  }, [results]);

  /* ---------- Actions ---------- */
  const handleSubmitEOI = async (trainingId, trainingTitle) => {
    if (!volunteer?.volunteer_id || hasSubmitted(trainingId)) return;
    setEoiBusyId(trainingId);
    try {
      const response = await api.submitEOI(volunteer.volunteer_id, trainingId);
      if (response.data?.error) {
        setLiveMsg("Error submitting EOI for " + trainingTitle + ".");
        alert("Error: " + response.data.error);
      } else {
        setLiveMsg("EOI submitted for " + trainingTitle + ".");
        const updatedEOIs = await api.getVolunteerEOIs(volunteer.volunteer_id);
        setSubmittedEOIs(updatedEOIs.data || []);
      }
    } catch (err) {
      console.error(err);
      setLiveMsg("Failed to submit EOI for " + trainingTitle + ".");
      alert("Failed to submit EOI. Check console for details.");
    } finally {
      setEoiBusyId(null);
    }
  };

  const handleCancelEOI = async (eoiId, trainingTitle) => {
    if (!window.confirm("Cancel this EOI?")) return;
    setCancelBusyId(eoiId);
    try {
      await api.cancelEOI(eoiId);
      const updatedEOIs = await api.getVolunteerEOIs(volunteer.volunteer_id);
      setSubmittedEOIs(updatedEOIs.data || []);
      setLiveMsg("EOI cancelled for " + trainingTitle + ".");
    } catch (err) {
      console.error(err);
      setLiveMsg("Failed to cancel EOI for " + trainingTitle + ".");
      alert("Failed to cancel EOI. See console for details.");
    } finally {
      setCancelBusyId(null);
    }
  };

  const markNoticeRead = async (id) => {
    setNotifBusy(true);
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    } catch (e) {
      console.error("Failed to mark notification read", e);
    } finally {
      setNotifBusy(false);
    }
  };

  const triggerReminderRefresh = async () => {
    setRefreshBusy(true);
    try {
      await api.runReminderCheck(); // server-side refresh
      const res = await api.getVolunteerNotifications(volunteer.volunteer_id);
      setNotifications(res.data || []);
      setLiveMsg("Reminders refreshed.");
    } catch (e) {
      console.error(e);
      const serverMsg = e?.response?.data?.error;
      alert(serverMsg || "Couldn't refresh reminders. Check server logs.");
      setLiveMsg("Could not refresh reminders.");
    } finally {
      setRefreshBusy(false);
    }
  };

  if (!volunteer) return null;
  if (loading) return <p className="dashboard-container">Loading dashboard…</p>;

  return (
    <div className="dashboard-container">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div role="status" aria-live="polite" className="sr-live">{liveMsg}</div>

      <VolunteerNavbar
        onLogout={onLogout}
        volunteerId={volunteer?.volunteer_id}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />

      <main className="dashboard-main" id="main-content" tabIndex={-1}>
        {/* Hero */}
        <header className="dashboard-hero" aria-label="Volunteer welcome">
          <img src={icon} alt="" className="hero-icon" aria-hidden="true" />
          <h1 className="hero-title">Welcome, {volunteer?.name}</h1>
          <p className="hero-sub">Manage your courses, EOIs, attendance, and qualifications.</p>
        </header>

        {error && <div className="alert alert-error" role="alert">❗ {error}</div>}

        <div className="dashboard-grid" role="region" aria-label="Volunteer dashboard sections">
          {/* Personal Info */}
          <section className="card" tabIndex={0} aria-labelledby="personal-info-title">
            <h2 id="personal-info-title">
              <img src={icon} alt="" aria-hidden="true" /> <span aria-hidden="true">👤</span> Personal Info
            </h2>
            <div className="card-content">
              <p><strong>Email:</strong> {volunteer?.email}</p>
              <p><strong>Volunteer ID:</strong> {volunteer?.volunteer_id}</p>
              <p><strong>Phone:</strong> {volunteer?.phone || "Not provided"} </p>
              <div style={{ marginTop: 8 }}>
                <span className="status-badge" aria-label="Status: Active Volunteer">✅ Active Volunteer</span>
              </div>
              <Link to="/volunteer/profile" className="btn ghost" aria-label="Edit Profile">
                ⚙️ Edit Profile
              </Link>
            </div>
          </section>

          {/* Attendance */}
          <section className="card" tabIndex={0} aria-labelledby="attendance-title">
            <h2 id="attendance-title">
              <img src={icon} alt="" aria-hidden="true" /> <span aria-hidden="true">🕒</span> Attendance History
            </h2>
            <div className="card-content">
              {attendance.length === 0 ? (
                <p>No attendance records found.</p>
              ) : (
                <ul>
                  {attendance.map((item) => (
                    <li key={item.id}>
                      <strong>Clock-in:</strong>{" "}
                      {item.clock_in ? <time dateTime={item.clock_in}>{item.clock_in}</time> : "N/A"}
                      {", "}
                      <strong>Clock-out:</strong>{" "}
                      {item.clock_out ? <time dateTime={item.clock_out}>{item.clock_out}</time> : "N/A"}
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to={`/volunteers/${volunteer?.volunteer_id}/attendance`}
                className="btn primary"
              >
                ↗️ View Full Attendance
              </Link>
            </div>
          </section>

          {/* Qualifications */}
          <section className="card" tabIndex={0} aria-labelledby="quals-title">
            <h2 id="quals-title">
              <img src={icon} alt="" aria-hidden="true" /> <span aria-hidden="true">🎖️</span> Qualifications / Courses
            </h2>
            <div className="card-content">
              {qualifications.length === 0 ? (
                <p>No qualifications yet.</p>
              ) : (
                <ul>
                  {qualifications.map((q) => (
                    <li key={q.id}>
                      Training ID: {q.training_id}, Issued: {q.issue_date || "N/A"}, Expiry: {q.expiry_date || "N/A"}
                      {q.document_path && (
                        <span className="small-links" style={{ marginLeft: 10 }}>
                          <button
                            type="button"
                            className="link-inline"
                            onClick={() => openProtectedFile(q.document_path, "qualification-" + q.id + ".pdf")}
                          >
                            View Certificate
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="row-actions" style={{ marginTop: 10 }}>
                <Link
                  to={`/volunteers/${volunteer?.volunteer_id}/qualifications`}
                  className="btn primary block"
                  aria-label="View all qualifications"
                  title="View all qualifications"
                >
                  ↗️ View All Qualifications
                </Link>
                <Link
                  to="/volunteer/qualifications/add"
                  state={{ volunteerId: volunteer?.volunteer_id }}
                  className="btn success block"
                  aria-label="Add or upload a qualification"
                  title="Add or upload a qualification"
                >
                  ➕ Add / Upload Qualification
                </Link>
              </div>
            </div>
          </section>

          {/* Alerts & Reminders */}
          <section className="card" tabIndex={0} aria-labelledby="alerts-title">
            <h2 id="alerts-title">
              <img src={icon} alt="" aria-hidden="true" /> <span aria-hidden="true">🔔</span> Alerts & Reminders
            </h2>
            <div className="card-content">
              <div className="refresh-row">
                <button
                  className="btn ghost"
                  onClick={triggerReminderRefresh}
                  disabled={refreshBusy}
                  aria-busy={refreshBusy ? "true" : "false"}
                  type="button"
                >
                  {refreshBusy ? "Refreshing…" : "↻ Refresh reminders"}
                </button>
                {anyLocal && (
                  <span className="badge-local" title="Client-side preview shown until the server issues official notices">
                    showing local preview
                  </span>
                )}
              </div>

              {mergedNotices.length === 0 ? (
                <p className="muted">No reminders right now. We'll let you know when something needs attention.</p>
              ) : (
                <>
                  <ul className="notice-list">
                    {mergedNotices.map((n) => (
                      <li key={n.id}>
                        <span aria-hidden="true">{n.read_at ? "✓ " : "⏰ "}</span>
                        <strong>{n.title}</strong>
                        {n.body ? " — " + n.body : ""}
                        {n.meta?.expiry_date && <> <em className="muted">(Expiry: {formatDate(n.meta.expiry_date)})</em></>}
                        {!n.read_at && !n?.meta?.local && (
                          <button
                            className="btn ghost"
                            style={{ marginLeft: 8, padding: "6px 10px" }}
                            onClick={() => markNoticeRead(n.id)}
                            disabled={notifBusy}
                            type="button"
                          >
                            Mark read
                          </button>
                        )}
                        {n?.meta?.local && <span className="badge-local" aria-label="Local preview notice">preview</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="table-hint">
                    Reminders appear ~90 days and 14 days before expiry, and on the day a qualification expires.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Available Trainings */}
          <section className="card" tabIndex={0} aria-labelledby="trainings-title">
            <h2 id="trainings-title">
              <img src={icon} alt="" aria-hidden="true" /> <span aria-hidden="true">🎯</span> Available Training / Courses
            </h2>
            <div className="card-content">
              {trainings.length === 0 ? (
                <p>No training available.</p>
              ) : (
                <div className="trainings-grid" role="list" aria-labelledby="trainings-heading">
                  <h3 id="trainings-heading" className="sr-only">Available Training list</h3>
                  {trainings.map((t) => {
                    const disabled = hasSubmitted(t.id) || eoiBusyId === t.id;
                    const label = hasSubmitted(t.id)
                      ? "EOI Submitted"
                      : eoiBusyId === t.id
                      ? "Submitting…"
                      : "Submit EOI";
                    const startISO = t.start_date || "";
                    const endISO = t.end_date || "";
                    return (
                      <article key={t.id} role="listitem" className="training-card" aria-labelledby={`training-${t.id}-title`}>
                        <div className="training-title" id={`training-${t.id}-title`}>{t.title}</div>
                        <div className="training-meta" aria-label="Training metadata">
                          <span className="status-badge" aria-label={`Type: ${t.type || "Training"}`}>📚 {t.type}</span>
                          {t.capacity != null && <span className="status-badge" aria-label={`Capacity ${t.capacity}`}>🪑 Capacity: {t.capacity}</span>}
                        </div>
                        <div className="training-meta" style={{ marginTop: 6 }}>
                          <strong>Dates:</strong>{" "}
                          <time dateTime={startISO}>{formatDate(startISO)}</time>
                          {" "}–{" "}
                          <time dateTime={endISO}>{formatDate(endISO)}</time>
                        </div>
                        <div className="training-actions">
                          <button
                            className="btn primary"
                            onClick={() => handleSubmitEOI(t.id, t.title)}
                            disabled={disabled}
                            aria-disabled={disabled ? "true" : "false"}
                            aria-busy={eoiBusyId === t.id ? "true" : "false"}
                            aria-label={`${label} for ${t.title}`}
                            title={label}
                            type="button"
                          >
                            {hasSubmitted(t.id) ? "✅ EOI Submitted" : "✉️ Submit EOI"}
                          </button>
                          <Link to="/volunteer/my-eois" className="btn ghost" aria-label="Open My EOIs">
                            📬 My EOIs
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* My EOIs */}
          <section className="card" tabIndex={0} aria-labelledby="myeois-title">
            <h2 id="myeois-title">
              <img src={icon} alt="" aria-hidden="true" /> <span aria-hidden="true">📨</span> My EOIs
            </h2>
            <div className="card-content">
              {submittedEOIs.length === 0 ? (
                <p>You haven't submitted any EOIs yet.</p>
              ) : (
                <div className="table-wrap" role="region" aria-label="My EOIs table">
                  <table className="eoi-table">
                    <caption className="sr-only">Expressions of Interest you have submitted</caption>
                    <thead>
                      <tr>
                        <th scope="col">Training</th>
                        <th scope="col">Status</th>
                        <th scope="col">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submittedEOIs.map((e) => (
                        <tr key={e.id}>
                          <td>{e.training_title}</td>
                          <td className={`td-status ${e.status}`}>
                            <span className="status-badge">
                              <span className="sr-only">Status: </span>
                              {e.status === "pending" && "⏳ "}
                              {e.status === "approved" && "✅ "}
                              {e.status === "rejected" && "❌ "}
                              {e.status === "cancelled" && "🚫 "}
                              {e.status}
                            </span>
                          </td>
                          <td className="td-actions">
                            {e.status === "pending" ? (
                              <button
                                className="btn danger"
                                onClick={() => handleCancelEOI(e.id, e.training_title)}
                                disabled={cancelBusyId === e.id}
                                aria-busy={cancelBusyId === e.id ? "true" : "false"}
                                aria-label={`Cancel EOI for ${e.training_title}`}
                                title="Cancel EOI"
                                type="button"
                              >
                                {cancelBusyId === e.id ? "… Cancelling" : "🗑️ Cancel"}
                              </button>
                            ) : (
                              <button className="btn ghost" disabled aria-disabled="true" title="No actions available" type="button">
                                No action
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="table-hint">Tip: On small screens, scroll horizontally to see all columns.</p>
                </div>
              )}
            </div>
          </section>

          {/* My Training Results */}
          <section className="card" tabIndex={0} aria-labelledby="results-title">
            <h2 id="results-title">
              <img src={icon} alt="" aria-hidden="true" /> <span aria-hidden="true">🧪</span> My Training Results
            </h2>
            <div className="card-content">
              {resultsError && <p className="muted">({resultsError})</p>}
              {(!results || results.length === 0) ? (
                <p>No results recorded yet.</p>
              ) : (
                <ul className="results-list">
                  {results.map((r) => (
                    <li key={r.id}>
                      <strong>{titleOf(r.training_id)}</strong>
                      <span className={`result-badge ${r.result || "not_assessed"}`}>
                        {pretty(r.result)}
                      </span>
                      {r.date_assessed && <> — <em className="muted">Assessed: {formatDate(r.date_assessed)}</em></>}
                      {r.assessor_name && <> — <span className="muted">Assessor: {r.assessor_name}</span></>}
                      <span className="small-links" style={{ marginLeft: 10 }}>
                        {r.certificate_path && (
                          <button
                            type="button"
                            className="link-inline"
                            onClick={() => openProtectedFile(r.certificate_path, "certificate-" + r.id + ".pdf")}
                          >
                            Certificate
                          </button>
                        )}
                        {r.evidence_path && (
                          <button
                            type="button"
                            className="link-inline"
                            onClick={() => openProtectedFile(r.evidence_path, "evidence-" + r.id)}
                          >
                            Evidence
                          </button>
                        )}
                      </span>
                      {r.notes && <div className="muted" style={{ marginTop: 4 }}>Notes: {r.notes}</div>}
                      {r.result === "not_yet_competent" && r.next_opportunity && (
                        <div className="muted" style={{ marginTop: 4 }}>
                          Next opportunity expected: {formatDate(r.next_opportunity)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Achievements */}
          <section className="card" tabIndex={0} aria-labelledby="achievements-title">
            <h2 id="achievements-title">
              <img src={icon} alt="" aria-hidden="true" /> <span aria-hidden="true">🏅</span> Recent Achievements
            </h2>
            <div className="card-content">
              {recentWins.length === 0 ? (
                <p className="muted">No new achievements in the last 30 days.</p>
              ) : (
                <ul>
                  {recentWins.map((a, idx) => (
                    <li key={idx}>
                      <span aria-hidden="true">{a.type === "competent" ? "🎉 " : "👏 "}</span>
                      {a.type === "competent" ? (
                        <>Congratulations on achieving <strong>Competent</strong> in <em>{a.title}</em>!</>
                      ) : (
                        <>Thanks for participating in <em>{a.title}</em> — great effort toward developing your skills.</>
                      )}
                      {a.date && <> <em className="muted">({formatDate(a.date)})</em></>}
                    </li>
                  ))}
                </ul>
              )}
              <p className="table-hint">This mirrors the acknowledgement in notifications.</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

/* Navbar */
const VolunteerNavbar = ({ onLogout, volunteerId, menuOpen, setMenuOpen }) => {
  const toggleLabel = menuOpen ? "Close menu" : "Open menu";
  const linkClass = ({ isActive }) => "navlink " + (isActive ? "active" : "");
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar-inner">
        <div className="navbar-top">
          <button
            className="navbar-toggle"
            aria-label={toggleLabel}
            aria-expanded={menuOpen}
            aria-controls="navbar-links"
            onClick={() => setMenuOpen(!menuOpen)}
            title={toggleLabel}
            type="button"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          <div className="navbar-brand-center" aria-label="Volunteer Dashboard">
            <img src={icon} alt="" aria-hidden="true" />
            <div className="navbar-title">Volunteer Dashboard</div>
          </div>

          <div className="navbar-spacer" aria-hidden="true"></div>
        </div>

        <ul id="navbar-links" className={"navbar-links " + (menuOpen ? "open" : "")} role="menubar">
          <li role="none">
            <NavLink to="/volunteer/dashboard" className={linkClass} role="menuitem" onClick={closeMenu}>
              🏠 Dashboard
            </NavLink>
          </li>
          <li role="none">
            <NavLink
              to={volunteerId ? ("/volunteers/" + volunteerId + "/attendance") : "#"}
              className={linkClass}
              role="menuitem"
              onClick={closeMenu}
            >
              🕒 Attendance
            </NavLink>
          </li>
          <li role="none">
            <NavLink
              to={volunteerId ? ("/volunteers/" + volunteerId + "/qualifications") : "#"}
              className={linkClass}
              role="menuitem"
              onClick={closeMenu}
            >
              🎖️ Qualifications
            </NavLink>
          </li>
          <li role="none">
            {/* keep volunteers on the dashboard for training */}
            <a href="/volunteer/dashboard#trainings-title" className="navlink" role="menuitem" onClick={closeMenu}>
              🎯 Training / Submit EOI
            </a>
          </li>
          <li role="none">
            <NavLink to="/volunteer/my-eois" className={linkClass} role="menuitem" onClick={closeMenu}>
              📨 My EOIs
            </NavLink>
          </li>
          <li role="none">
            <NavLink to="/volunteer/profile" className={linkClass} role="menuitem" onClick={closeMenu}>
              👤 My Profile
            </NavLink>
          </li>
          <li role="none">
            <button onClick={onLogout} className="logout-button" role="menuitem" title="Logout" type="button">
              🚪 Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

/* Pretty-print results */
function pretty(v) {
  switch (v) {
    case "competent": return "Competent";
    case "not_yet_competent": return "Not Yet Competent";
    case "not_assessed": return "Not Assessed";
    case "participated": return "Participated";
    default: return v || "Not Assessed";
  }
}

export default VolunteerDashboard;
