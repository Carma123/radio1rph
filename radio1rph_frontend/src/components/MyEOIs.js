// src/components/MyEOIs.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import api from "../services/api";
import icon from "./icon.png";

/* ─────────────────────────────────────────────
   Reusable Volunteer Navbar (same look/behavior
   as your Volunteer Dashboard)
   - Hamburger shows only on mobile (< 720px)
   - Centered brand, high-contrast links
   ───────────────────────────────────────────── */
const VolunteerNavbar = ({ onLogout, volunteerId }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleLabel = menuOpen ? "Close menu" : "Open menu";
  const linkClass = ({ isActive }) => `navlink ${isActive ? "active" : ""}`;

  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar-inner">
        <div className="navbar-top">
          {/* Mobile-only toggle */}
          <button
            className="navbar-toggle"
            aria-label={toggleLabel}
            aria-expanded={menuOpen}
            aria-controls="navbar-links"
            onClick={() => setMenuOpen(!menuOpen)}
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

          {/* Center brand */}
          <div className="navbar-brand-center" aria-label="Volunteer Dashboard">
            <img src={icon} alt="" aria-hidden="true" />
            <div className="navbar-title">Volunteer Dashboard</div>
          </div>

          {/* Spacer to keep brand centered */}
          <div className="navbar-spacer" aria-hidden="true"></div>
        </div>

        <ul
          id="navbar-links"
          className={`navbar-links ${menuOpen ? "open" : ""}`}
          role="menubar"
        >
          <li role="none">
            <NavLink to="/volunteer/dashboard" className={linkClass} role="menuitem">
              Dashboard
            </NavLink>
          </li>
          <li role="none">
            <NavLink
              to={volunteerId ? `/volunteers/${volunteerId}/attendance` : "#"}
              className={linkClass}
              role="menuitem"
            >
              Attendance
            </NavLink>
          </li>
          <li role="none">
            <NavLink
              to={volunteerId ? `/volunteers/${volunteerId}/qualifications` : "#"}
              className={linkClass}
              role="menuitem"
            >
              Qualifications
            </NavLink>
          </li>
          <li role="none">
            <NavLink to="/trainings" className={linkClass} role="menuitem">
              Trainings / Submit EOI
            </NavLink>
          </li>
          <li role="none">
            <NavLink to="/my-eois" className={linkClass} role="menuitem">
              My EOIs
            </NavLink>
          </li>
          <li role="none">
            <NavLink to="/volunteer/profile" className={linkClass} role="menuitem">
              My Profile
            </NavLink>
          </li>
          <li role="none">
            <button onClick={onLogout} className="logout-button" role="menuitem">
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

/* ─────────────────────────────────────────────
   MyEOIs Page
   ───────────────────────────────────────────── */
const MyEOIs = ({ onLogout }) => {
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState(null);
  const [eois, setEois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [liveMsg, setLiveMsg] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("volunteer");
    if (!stored) {
      navigate("/volunteer-login");
      return;
    }
    try {
      const v = JSON.parse(stored);
      if (!v?.volunteer_id) throw new Error("invalid");
      setVolunteer(v);
      loadEOIs(v.volunteer_id);
    } catch {
      localStorage.removeItem("volunteer");
      navigate("/volunteer-login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEOIs = async (vid) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getVolunteerEOIs(vid);
      setEois(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load your EOIs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return eois;
    return eois.filter(
      (e) =>
        (e.training_title || "").toLowerCase().includes(q) ||
        (e.status || "").toLowerCase().includes(q)
    );
  }, [eois, query]);

  const cancel = async (id, trainingTitle) => {
    if (!window.confirm("Cancel this EOI?")) return;
    setBusyId(id);
    try {
      await api.cancelEOI(id);
      setEois((prev) => prev.map((e) => (e.id === id ? { ...e, status: "cancelled" } : e)));
      setLiveMsg(`EOI cancelled for ${trainingTitle || "course"}.`);
    } catch (err) {
      console.error(err);
      alert("Failed to cancel EOI. See console for details.");
    } finally {
      setBusyId(null);
    }
  };

  const formatDateTime = (d) => (d ? new Date(d).toLocaleString() : "—");

  if (loading) return <p style={{ padding: "1rem" }}>Loading your EOIs…</p>;
  if (!volunteer) return null;

  return (
    <div className="page-wrap">
      {/* Navbar (same as dashboard) */}
      <VolunteerNavbar
        onLogout={onLogout || (() => navigate("/volunteer-login"))}
        volunteerId={volunteer?.volunteer_id}
      />

      <main className="eois-wrap" aria-labelledby="my-eois-title">
        {/* Live announcements for SRs */}
        <div role="status" aria-live="polite" className="sr-only">{liveMsg}</div>

        <header className="page-header">
          <div className="title-block">
            <h1 id="my-eois-title">My EOIs</h1>
            <p className="sub">Track your course applications and manage pending EOIs.</p>
          </div>
          <div className="tools">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by course or status"
              aria-label="Search my EOIs"
            />
            <button
              className="btn btn-secondary"
              onClick={() => loadEOIs(volunteer.volunteer_id)}
              aria-label="Refresh EOIs"
            >
              Refresh
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/volunteer/dashboard")}
              aria-label="Back to Dashboard"
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" aria-live="polite" className="alert alert-error">
            {error}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty-card" role="region" aria-label="Empty state">
            <p className="muted">
              You don’t have any EOIs yet. Browse available trainings from your dashboard to submit one.
            </p>
          </div>
        ) : (
          <div className="table-card" role="region" aria-label="My EOIs table">
            <table className="eoi-table">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td data-label="Course">{e.training_title || `#${e.training_id}`}</td>
                    <td data-label="Submitted">{formatDateTime(e.submitted_at)}</td>
                    <td data-label="Status">
                      <span className={`badge ${e.status}`}>
                        <span className="sr-only">Status: </span>{e.status}
                      </span>
                    </td>
                    <td data-label="Actions">
                      {e.status === "pending" ? (
                        <button
                          className="btn btn-danger"
                          onClick={() => cancel(e.id, e.training_title)}
                          disabled={busyId === e.id}
                          aria-busy={busyId === e.id ? "true" : "false"}
                          aria-label={`Cancel EOI for ${e.training_title || "course"}`}
                          title="Cancel EOI"
                        >
                          {busyId === e.id ? "Cancelling…" : "Cancel"}
                        </button>
                      ) : (
                        <button className="btn btn-secondary" disabled aria-disabled="true" title="No actions available">
                          No action
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Styles (navbar + page) */}
      <style jsx>{`
        :root{
          --bg:#f6f7fb; --surface:#ffffff; --text:#0b1220; --muted:#4b5563; --border:#e5e7eb;
          --primary:#1541d1; --primary-700:#1237b8; --on-primary:#ffffff;
          --danger:#b91c1c; --danger-700:#991b1b;
          --shadow:0 10px 24px rgba(0,0,0,.08);
        }
        *{box-sizing:border-box}
        body{background:var(--bg);color:var(--text)}
        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
        .page-wrap{max-width:1100px;margin:0 auto;padding:16px}

        /* NAVBAR */
        .navbar{position:sticky;top:0;z-index:5;margin-bottom:16px}
        .navbar-inner{
          background:var(--surface);
          border:1px solid var(--border);
          border-radius:14px;
          box-shadow:var(--shadow);
          overflow:hidden;
        }
        .navbar-top{display:flex;align-items:center;justify-content:space-between;padding:10px 12px}
        .navbar-brand-center{display:flex;align-items:center;gap:10px;justify-content:center;flex:1}
        .navbar-brand-center img{height:36px}
        .navbar-title{font-weight:800;letter-spacing:.2px;color:var(--text)}
        .navbar-spacer{width:44px;height:44px}

        /* Hide toggle by default (desktop); show on mobile */
        .navbar-toggle{
          display:none;
          align-items:center;justify-content:center;
          min-height:44px;min-width:44px;border:1px solid var(--border);border-radius:10px;
          background:#fff;color:var(--text);cursor:pointer;transition:transform .1s ease;
        }
        .navbar-toggle:active{transform:scale(.98)}
        .navbar-toggle svg{display:block;width:22px;height:22px}

        .navbar-links{
          display:flex;gap:10px;list-style:none;margin:0;padding:10px;justify-content:center;
          border-top:1px solid var(--border);
          background:#fff;
        }
        .navlink{
          color:var(--text);text-decoration:none;padding:10px 14px;border-radius:10px;border:1px solid var(--border);
          background:#fff;transition:background .15s ease, transform .05s ease;
        }
        .navlink:hover{background:#f3f4f6}
        .navlink:active{transform:scale(.98)}
        .navlink.active{border-color:var(--primary);box-shadow:0 0 0 3px rgba(21,65,209,.15)}
        .logout-button{
          min-height:44px;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:#fff;color:var(--text);cursor:pointer
        }
        .navbar-toggle:focus-visible,.navlink:focus-visible,.logout-button:focus-visible,.btn:focus-visible{
          outline:3px solid #111827;outline-offset:2px
        }
        @media (max-width:720px){
          .navbar-toggle{display:inline-flex}
          .navbar-links{display:none;padding:8px 10px}
          .navbar-links.open{display:flex;flex-direction:column;align-items:stretch}
          .navlink{width:100%}
        }

        /* PAGE */
        .eois-wrap{padding:0 4px}
        .page-header{
          display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:space-between;margin-bottom:12px
        }
        .title-block h1{margin:0;font-size:1.6rem}
        .title-block .sub{margin:.25rem 0 0 0;color:var(--muted)}
        .tools{display:flex;gap:8px;flex-wrap:wrap}
        .tools input[type="search"]{
          padding:10px 12px;border:1px solid #c9cdd3;border-radius:10px;min-width:260px
        }

        .btn{
          min-height:44px;min-width:44px;border:none;border-radius:12px;padding:10px 14px;cursor:pointer;
          font-weight:850;font-size:0.95rem;line-height:1;color:var(--on-primary) !important;
          transition:transform .05s ease, box-shadow .15s ease, background .15s ease;
          box-shadow:0 2px 6px rgba(0,0,0,.12);
        }
        .btn *{color:var(--on-primary) !important}
        .btn:active{transform:scale(.98)}
        .btn-primary{background:var(--primary)}
        .btn-primary:hover{background:var(--primary-700)}
        .btn-secondary{background:#0b1220;color:#fff !important;border:1px solid #0f172a}
        .btn-danger{background:var(--danger)}
        .btn-danger:hover{background:var(--danger-700)}
        .btn[disabled],.btn[aria-disabled="true"]{opacity:.65;cursor:not-allowed}

        .alert{
          background:#fef2f2;color:#7f1d1d;border:1px solid #fecaca;padding:12px 14px;border-radius:12px;margin:8px 0
        }
        .empty-card{
          background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px;
          box-shadow:var(--shadow)
        }
        .muted{color:var(--muted)}

        .table-card{
          background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow);
          overflow:auto;
        }
        table.eoi-table{
          border-collapse:separate;border-spacing:0;width:100%;min-width:720px;
        }
        .eoi-table thead th{
          background:#f3f4f6;font-weight:900;text-align:left;padding:12px 14px;border-bottom:1px solid var(--border);
          position:sticky;top:0;z-index:1;
        }
        .eoi-table tbody td{
          padding:12px 14px;border-bottom:1px solid var(--border);vertical-align:middle;
        }
        .actions-col{width:200px}
        .eoi-table tbody tr:last-child td{border-bottom:none}

        .badge{
          display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;font-size:.9rem;font-weight:900;border:1px solid var(--border)
        }
        .badge::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%}
        .badge.pending{color:#111;background:#fde68a;border-color:#f59e0b}
        .badge.pending::before{background:#92400e}
        .badge.approved{color:#065f46;background:#a7f3d0;border-color:#10b981}
        .badge.approved::before{background:#064e3b}
        .badge.rejected{color:#7f1d1d;background:#fecaca;border-color:#ef4444}
        .badge.rejected::before{background:#7f1d1d}
        .badge.cancelled{color:#111;background:#e5e7eb;border-color:#9ca3af}
        .badge.cancelled::before{background:#374151}

        @media (max-width:700px){
          .title-block h1{font-size:1.4rem}
          .tools input[type="search"]{min-width:200px}
          .actions-col{width:180px}
        }
      `}</style>
    </div>
  );
};

export default MyEOIs;
