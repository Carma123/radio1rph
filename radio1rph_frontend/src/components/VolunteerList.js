// src/components/VolunteerList.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const VolunteerList = ({ showQualificationsLink = false }) => {
  const navigate = useNavigate();
  const [volunteers, setVolunteers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVolunteers = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.getVolunteers();
        setVolunteers(Array.isArray(response.data) ? response.data : []);
      } catch (e) {
        console.error("Error fetching volunteers:", e);
        setError("Failed to load volunteers. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchVolunteers();
  }, []);

  const getId = (v) => {
    const id = v?.volunteer_id ?? v?.id ?? null;
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const handleDelete = async (vol) => {
    const id = getId(vol);
    if (!id) return alert("Volunteer ID missing.");
    if (!window.confirm(`Delete volunteer "${vol.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteVolunteer(id);
      setVolunteers((prev) => prev.filter((v) => getId(v) !== id));
    } catch (err) {
      console.error("Error deleting volunteer:", err);
      alert("Failed to delete volunteer.");
    }
  };

  const filteredVolunteers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return volunteers;
    return volunteers.filter((v) => {
      const name = (v.name || "").toLowerCase();
      const email = (v.email || "").toLowerCase();
      const phone = (v.phone || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [volunteers, search]);

  const goEdit = (v) => {
    const id = getId(v);
    if (!id) return alert("Volunteer ID missing.");
    navigate(`/volunteers/add?id=${id}`);
  };

  const goQualifications = (v) => {
    const id = getId(v);
    if (!id) return alert("Volunteer ID missing.");
    navigate(`/volunteers/${id}/qualifications`);
  };

  const goAddQualification = (v) => {
    const id = getId(v);
    if (!id) return alert("Volunteer ID missing.");
    navigate(`/qualifications/add?id=${id}`);
  };

  const goAttendance = (v) => {
    const id = getId(v);
    if (!id) return alert("Volunteer ID missing.");
    navigate(`/volunteers/${id}/attendance`);
  };

  if (loading) return <p style={{ padding: "1rem" }}>Loading volunteers…</p>;

  return (
    <main style={{ padding: "1rem", maxWidth: "1000px", margin: "0 auto" }}>
      <h1 tabIndex="0" style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
        Volunteers
      </h1>

      <div className="header-controls">
        <div className="search-wrapper" style={{ flex: 1 }}>
          <label htmlFor="search" style={{ fontWeight: 600 }}>
            Search by name, email, or phone
          </label>
          <input
            id="search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a name, email, or phone"
            aria-describedby="search-desc"
          />
          <p id="search-desc" className="muted">
            Start typing to filter the list of volunteers.
          </p>
        </div>

        <button
          onClick={() => navigate("/volunteers/add")}
          className="btn btn-primary btn-sm"
          aria-label="Add a new volunteer"
        >
          <span aria-hidden="true" className="btn-icon">＋</span> Add Volunteer
        </button>
      </div>

      {error && (
        <div role="alert" className="alert alert-error">
          {error}
        </div>
      )}

      <div className="table-wrap">
        <table className="vol-table" aria-label="Volunteer List">
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVolunteers.length > 0 ? (
              filteredVolunteers.map((v, index) => {
                const id = getId(v);
                return (
                  <tr
                    key={id ? `vol-${id}` : `vol-row-${index}`}
                    tabIndex="0"
                    className={index % 2 === 0 ? "row-even" : "row-odd"}
                  >
                    <td style={tdStyle}>{v.name || "—"}</td>
                    <td style={tdStyle}>{v.email || "—"}</td>
                    <td style={tdStyle}>{v.phone || "N/A"}</td>
                    <td style={tdStyle}>
                      <span
                        className={`status-badge ${
                          v.status === "active" ? "status-active" : "status-inactive"
                        }`}
                      >
                        {v.status || "inactive"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div className="table-actions">
                        <button
                          onClick={() => goEdit(v)}
                          className="btn btn-amber btn-xs"
                          aria-label={`Edit details for ${v.name || "this volunteer"}`}
                        >
                          ✎ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(v)}
                          className="btn btn-rose btn-xs"
                          aria-label={`Delete volunteer ${v.name || ""}`}
                        >
                          🗑 Delete
                        </button>

                        {showQualificationsLink && (
                          <>
                            <button
                              onClick={() => goQualifications(v)}
                              className="btn btn-mint btn-xs"
                              aria-label={`View qualifications for ${v.name || ""}`}
                            >
                              🎓 Qualifications
                            </button>
                            <button
                              onClick={() => goAddQualification(v)}
                              className="btn btn-sky btn-xs"
                              aria-label={`Add qualification for ${v.name || ""}`}
                            >
                              ➕ Add Qualification
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => goAttendance(v)}
                          className="btn btn-mint btn-xs"
                          aria-label={`View attendance for ${v.name || ""}`}
                        >
                          📋 Attendance
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" style={{ padding: "1rem", textAlign: "center", color: "#555" }}>
                  No volunteers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        :root{
          --border:#e5e7eb;
          --text:#0f172a;
          --muted:#475569;
          --primary:#3b82f6;
          --primary-600:#2563eb;

          --amber-bg:#fff7ed; --amber-br:#fed7aa; --amber-tx:#7c2d12;
          --rose-bg:#fee2e2;  --rose-br:#fecaca; --rose-tx:#7f1d1d;
          --mint-bg:#a7f3d0;  --mint-br:#34d399; --mint-tx:#065f46;
          --sky-bg:#bfdbfe;   --sky-br:#60a5fa;  --sky-tx:#1e3a8a;
        }

        @media (prefers-reduced-motion: reduce){
          * { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
        }

        .muted{ color: var(--muted); font-size: .9rem; }

        .header-controls{
          display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap;
        }

        input[type="search"]{
          padding:.5rem .65rem; width:100%; max-width:420px; border:1px solid #888; border-radius:8px;
        }
        input[type="search"]:focus-visible{ outline:3px solid #93c5fd80; border-color:#2563eb; }

        .alert{ margin-bottom:1rem; padding:.75rem; border-radius:8px; }
        .alert-error{ background:#fef2f2; color:#7f1d1d; border:1px solid #fecaca; }

        .table-wrap{ overflow-x:auto; border:1px solid var(--border); border-radius:12px; }
        .vol-table{ width:100%; border-collapse:separate; border-spacing:0; }
        thead tr{ background:#f8fafc; }
        .row-even{ background:#fff; }
        .row-odd{ background:#f9fafb; }

        .table-actions{
          display:flex;
          flex-wrap:wrap;
          gap:.4rem;
          align-items:center;
        }

        /* ---- Buttons: text-hugging on desktop, comfy on mobile ---- */
        .btn{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:.3rem;
          font-size:.85rem;
          font-weight:600;
          line-height:1.1;

          border-radius:6px;
          border:1px solid var(--border);
          background:#fff;
          color:var(--text);
          cursor:pointer;

          /* 🟢 key: shrink to label width */
          width:auto !important;
          min-width:0 !important;
          flex:0 0 auto;

          /* tighter inner space */
          padding:.18rem .46rem;

          transition: background .15s ease, transform .05s ease;
          white-space:nowrap;
        }
        .btn:hover{ background:#f3f4f6; transform:translateY(-1px); }
        .btn:active{ transform:translateY(0); }
        .btn:focus-visible{ outline:3px solid #111827; outline-offset:2px; }

        .btn-xs{ font-size:.83rem; padding:.16rem .42rem; }
        .btn-sm{ font-size:.9rem;  padding:.22rem .5rem; }

        .btn-primary{ background:var(--primary); color:#fff; border-color:transparent; }
        .btn-primary:hover{ background:var(--primary-600); }

        .btn-amber{ background:var(--amber-bg); color:var(--amber-tx); border-color:var(--amber-br); }
        .btn-amber:hover{ background:#ffedd5; }

        .btn-rose{ background:var(--rose-bg); color:var(--rose-tx); border-color:var(--rose-br); }
        .btn-rose:hover{ background:#fecaca; }

        .btn-mint{ background:var(--mint-bg); color:var(--mint-tx); border-color:var(--mint-br); }
        .btn-mint:hover{ background:#34d399; color:#fff; }

        .btn-sky{ background:var(--sky-bg); color:var(--sky-tx); border-color:var(--sky-br); }
        .btn-sky:hover{ background:#60a5fa; color:#fff; }

        .btn-icon{ font-weight:700; line-height:1; display:inline-block; transform: translateY(-1px); }

        .status-badge{
          display:inline-block; padding:.18rem .55rem; border-radius:999px; font-size:.82rem; border:1px solid transparent;
        }
        .status-active{ background:#ecfdf5; color:#065f46; border-color:#a7f3d0; }
        .status-inactive{ background:#fff7ed; color:#9a3412; border-color:#fed7aa; }

        /* Mobile ≥44px tap targets & full width */
        @media (max-width: 720px){
          .table-actions{ flex-direction:column; }
          .btn{
            width:100% !important;
            font-size:1rem;
            min-height:44px;
            padding:.55rem .9rem;
            border-radius:8px;
          }
        }
      `}</style>
    </main>
  );
};

const thStyle = {
  borderBottom: "2px solid #000",
  textAlign: "left",
  padding: "0.75rem",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "0.75rem",
  borderBottom: "1px solid #ccc",
  verticalAlign: "middle",
};

export default VolunteerList;
