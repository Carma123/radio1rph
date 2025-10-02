// src/components/TrainingsList.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const TrainingsList = () => {
  const [trainings, setTrainings] = useState([]);
  const [approvedCounts, setApprovedCounts] = useState({});
  const [qualStats, setQualStats] = useState({}); // { [trainingId]: { total, withDocs } }
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.getTrainings();
        const list = Array.isArray(res.data) ? res.data : [];
        setTrainings(list);

        // ✅ Approved EOI counts (public)
        try {
          const approvedRes = await api.getPublicEOIs({ status: "approved" });
          const approved = Array.isArray(approvedRes.data) ? approvedRes.data : [];
          const counts = approved.reduce((acc, e) => {
            const tid = e.training_id;
            if (!tid) return acc;
            acc[tid] = (acc[tid] || 0) + 1;
            return acc;
          }, {});
          setApprovedCounts(counts);
        } catch (e) {
          console.warn("Could not load approved EOI counts:", e);
          setApprovedCounts({});
        }

        // ✅ Qualification stats per training (public)
        try {
          const qRes = await api.getQualifications();
          const quals = Array.isArray(qRes.data) ? qRes.data : [];
          const stats = {};
          for (const q of quals) {
            const tid = q.training_id;
            if (!tid) continue;
            if (!stats[tid]) stats[tid] = { total: 0, withDocs: 0 };
            stats[tid].total += 1;
            if (q.document_path) stats[tid].withDocs += 1;
          }
          setQualStats(stats);
        } catch (e) {
          console.warn("Could not load qualifications:", e);
          setQualStats({});
        }
      } catch (err) {
        console.error("Error fetching trainings:", err);
        setError("Failed to load trainings. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filteredTrainings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trainings;
    return trainings.filter((t) => {
      const inTitle = (t.title || "").toLowerCase().includes(q);
      const inType = (t.type || "").toLowerCase().includes(q);
      const inProvider = (t.provider || "").toLowerCase().includes(q);
      const inTrainer = (t.trainer_name || "").toLowerCase().includes(q);
      const inVenue = (t.venue || "").toLowerCase().includes(q);
      return inTitle || inType || inProvider || inTrainer || inVenue;
    });
  }, [trainings, search]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this training?")) return;
    try {
      await api.deleteTraining(id);
      setTrainings((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Error deleting training:", err);
      alert("Failed to delete training. See console for details.");
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "N/A");
  const formatMoney = (v) => {
    if (v === null || v === undefined || v === "") return "Free";
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return n === 0 ? "Free" : `$${n.toFixed(2)}`;
  };

  const accreditationLabel = (a) => {
    switch (a) {
      case "external_accredited": return "Accredited (External)";
      case "external_non_accredited": return "Non-accredited (External)";
      case "in_house":
      default: return "In-house";
    }
  };

  const deliveryLabel = (m) => {
    switch (m) {
      case "online": return "Online";
      case "hybrid": return "Hybrid";
      case "in_person":
      default: return "In-person";
    }
  };

  const CapacityBadge = ({ training }) => {
    const cap = training.capacity;
    const approved = approvedCounts[training.id] || 0;
    if (cap === null || cap === undefined || cap === "") {
      return <span className="badge badge-neutral" aria-label="Capacity is unlimited">Approved: {approved} / ∞</span>;
    }
    const full = approved >= Number(cap);
    return (
      <span
        className={`badge ${full ? "badge-danger" : "badge-ok"}`}
        aria-label={`Approved ${approved} of ${cap} places`}
      >
        {approved} / {cap} {full ? "Full" : "Spots"}
      </span>
    );
  };

  // Small helper: results summary chip from qualStats
  const ResultsChip = ({ trainingId }) => {
    const s = qualStats[trainingId] || { total: 0, withDocs: 0 };
    if (s.total === 0) {
      return <span className="chip chip-muted" title="No results recorded yet">No results</span>;
    }
    return (
      <span
        className="chip chip-results"
        title={`${s.total} result record(s); ${s.withDocs} with certificate/evidence`}
      >
        {s.total} results • {s.withDocs} docs
      </span>
    );
  };

  if (loading) return <p style={{ padding: "1rem" }}>Loading trainings…</p>;

  return (
    <div style={{ padding: "1rem", maxWidth: "1100px", margin: "0 auto" }}>
      <header className="tl-header">
        <h1 tabIndex="0" className="tl-title">Trainings</h1>
        <div className="tl-tools">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, type, provider, trainer, venue"
            aria-label="Search trainings"
            className="tl-search"
          />
          <button
            onClick={() => navigate("/trainings/add")}
            className="btn btn-primary btn-sm"
            aria-label="Add a new training"
          >
            <span className="btn-icon" aria-hidden="true">＋</span> Add Training
          </button>
        </div>
      </header>

      {error && <div role="alert" className="alert alert-error">{error}</div>}

      <div className="table-wrap">
        <table className="tl-table" aria-label="Trainings List">
          <thead>
            <tr>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Type / Accreditation / Delivery</th>
              <th style={thStyle}>Provider / Trainer</th>
              <th style={thStyle}>Dates</th>
              <th style={thStyle}>Venue / Cost</th>
              <th style={thStyle}>EOI Close</th>
              <th style={thStyle}>Capacity</th>
              <th style={thStyle}>Results / Certificates</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrainings.length > 0 ? (
              filteredTrainings.map((t, idx) => (
                <tr key={t.id} tabIndex={0} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    {t.prerequisites && <div className="muted">{t.prerequisites}</div>}
                  </td>
                  <td style={tdStyle}>
                    <div className="chips">
                      <span className="chip">{(t.type || "internal").toUpperCase()}</span>
                      <span className="chip">{accreditationLabel(t.accreditation)}</span>
                      <span className="chip">{deliveryLabel(t.delivery_mode)}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div>{t.provider || "—"}</div>
                    <div className="muted">{t.trainer_name || "—"}</div>
                  </td>
                  <td style={tdStyle}>
                    <div><strong>Start:</strong> {formatDate(t.start_date)}</div>
                    <div><strong>End:</strong> {formatDate(t.end_date)}</div>
                  </td>
                  <td style={tdStyle}>
                    <div>{t.venue || "—"}</div>
                    <div className="muted">{formatMoney(t.cost)}</div>
                  </td>
                  <td style={tdStyle}>{formatDate(t.eoi_close_date)}</td>
                  <td style={tdStyle}><CapacityBadge training={t} /></td>

                  {/* NEW: Results / Certificates summary (from qualifications) */}
                  <td style={tdStyle}>
                    <ResultsChip trainingId={t.id} />
                    {qualStats[t.id]?.withDocs > 0 && (
                      <div className="muted" style={{ marginTop: 4 }}>
                        Certificates/Evidence linked
                      </div>
                    )}
                  </td>

                  <td style={{ ...tdStyle, minWidth: 320 }}>
                    <div className="actions-wrap">
                      <button
                        className="btn btn-amber btn-xs"
                        onClick={() => navigate(`/trainings/add?id=${t.id}`)}
                        aria-label={`Edit ${t.title}`}
                        title={`Edit ${t.title}`}
                      >
                        ✎ Edit
                      </button>
                      <button
                        className="btn btn-rose btn-xs"
                        onClick={() => handleDelete(t.id)}
                        aria-label={`Delete ${t.title}`}
                        title={`Delete ${t.title}`}
                      >
                        🗑 Delete
                      </button>
                      <button
                        className="btn btn-mint btn-xs"
                        onClick={() => navigate(`/admin/eois`)}
                        aria-label={`View EOIs for ${t.title}`}
                        title="Open EOI admin list (use filters there)"
                      >
                        👥 EOIs
                      </button>
                      <button
                        className="btn btn-sky btn-xs"
                        onClick={() => navigate(`/admin/trainings/${t.id}/panel`)}
                        aria-label={`Open course panel for ${t.title}`}
                        title="Open course panel"
                      >
                        📊 Panel
                      </button>

                      {/* NEW: Quick entry to results editor (re-uses the panel; can scroll to a 'results' tab/section) */}
                      <button
                        className="btn btn-primary btn-xs"
                        onClick={() => navigate(`/admin/trainings/${t.id}/panel?tab=results`)}
                        aria-label={`Record results for ${t.title}`}
                        title="Record / manage training results"
                      >
                        🧪 Results
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ padding: "1rem", textAlign: "center", color: "#555" }}>
                  No trainings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <InlineStyles/>
    </div>
  );
};

/* table basics */
const thStyle = { padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd", whiteSpace: "nowrap" };
const tdStyle = { padding: "0.75rem", verticalAlign: "top" };

/* injected CSS */
const InlineStyles = () => (
  <style>{`
    :root {
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

    .muted { color: var(--muted); font-size: .9rem; }

    .tl-header { display:flex; flex-wrap:wrap; align-items:center; gap:.75rem; margin-bottom:1rem; }
    .tl-title { margin:0; font-size:1.75rem; flex:1 1 auto; }
    .tl-tools { display:flex; gap:.5rem; flex-wrap:wrap; }

    .tl-search {
      padding:.5rem .65rem; border:1px solid #ccc; border-radius:8px; min-width:260px;
    }
    .tl-search:focus-visible { outline:3px solid #93c5fd80; border-color:#2563eb; }

    .alert { margin-bottom:1rem; padding:.75rem; border-radius:8px; }
    .alert-error { background:#fef2f2; color:#7f1d1d; border:1px solid #fecaca; }

    .table-wrap { overflow-x:auto; border:1px solid var(--border); border-radius:12px; }
    .tl-table { width:100%; border-collapse:separate; border-spacing:0; box-shadow:0 0 6px rgba(0,0,0,.06); }
    thead tr { background:#f8fafc; }
    .row-even { background:#fff; }
    .row-odd { background:#f9fafb; }

    .chips { display:flex; flex-wrap:wrap; gap:6px; }
    .chip {
      display:inline-block; padding:.22rem .45rem; border:1px solid #d0d7de; border-radius:999px;
      font-size:.78rem; background:#f6f8fa; line-height:1.2;
    }
    .chip-muted { background:#f1f5f9; border-color:#e2e8f0; color:#334155; }
    .chip-results { background:#ecfdf5; border-color:#a7f3d0; color:#065f46; }

    .badge { display:inline-block; padding:.22rem .45rem; border-radius:6px; font-size:.82rem; font-weight:600; line-height:1.2; border:1px solid transparent; }
    .badge-ok { background:#ecfdf5; color:#065f46; border-color:#a7f3d0; }
    .badge-danger { background:#fff1f2; color:#9f1239; border-color:#fecdd3; }
    .badge-neutral { background:#eef2ff; color:#3730a3; border-color:#c7d2fe; }

    .actions-wrap { display:flex; flex-wrap:wrap; gap:.4rem; align-items:center; }

    /* Buttons */
    .btn{
      display:inline-flex; align-items:center; justify-content:center; gap:.28rem;
      font-size:.83rem; font-weight:600; line-height:1.1;
      border-radius:6px; border:1px solid var(--border); background:#fff; color:var(--text); cursor:pointer;
      width:auto !important; min-width:0 !important; flex:0 0 auto;
      padding:.18rem .45rem; white-space:nowrap; transition: background .15s ease, transform .05s ease;
    }
    .btn:hover { background:#f3f4f6; transform:translateY(-1px); }
    .btn:active { transform:translateY(0); }
    .btn:focus-visible { outline:3px solid #111827; outline-offset:2px; }
    .btn-icon { font-weight:700; line-height:1; display:inline-block; transform: translateY(-1px); }

    .btn-xs { font-size:.83rem; padding:.16rem .42rem; }
    .btn-sm { font-size:.9rem;  padding:.22rem .5rem; }

    .btn-primary { background:var(--primary); color:#fff; border-color:transparent; }
    .btn-primary:hover { background:var(--primary-600); }

    .btn-amber { background:var(--amber-bg); color:var(--amber-tx); border-color:var(--amber-br); }
    .btn-amber:hover { background:#ffedd5; }

    .btn-rose { background:var(--rose-bg); color:var(--rose-tx); border-color:var(--rose-br); }
    .btn-rose:hover { background:#fecaca; }

    .btn-mint { background:var(--mint-bg); color:var(--mint-tx); border-color:var(--mint-br); }
    .btn-mint:hover { background:#34d399; color:#fff; }

    .btn-sky { background:var(--sky-bg); color:var(--sky-tx); border-color:var(--sky-br); }
    .btn-sky:hover { background:#60a5fa; color:#fff; }

    /* Mobile */
    @media (max-width:640px){
      .actions-wrap { flex-direction:column; }
      .btn { width:100% !important; font-size:1rem; min-height:44px; padding:.55rem .9rem; line-height:1.25; }
    }
  `}</style>
);

export default TrainingsList;
