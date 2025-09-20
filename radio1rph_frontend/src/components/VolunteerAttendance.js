// src/components/VolunteerAttendance.js
import React, { useEffect, useState } from "react";
import api from "../services/api";

const VolunteerAttendance = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [historyMap, setHistoryMap] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Helper: Calculate duration in h/m
  const getDuration = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return "-";
    const diffMs = new Date(clockOut) - new Date(clockIn);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
    return `${diffHours}h ${diffMinutes}m`;
  };

  // Fetch volunteers + today's attendance
  const fetchData = async () => {
    setLoading(true);
    try {
      const volunteerRes = await api.getVolunteers();
      const vols = volunteerRes.data;

      const attendanceData = {};
      await Promise.all(
        vols.map(async (v) => {
          try {
            const res = await api.getTodayAttendanceByVolunteer(v.id);
            attendanceData[v.id] = res.data[0] || null;
          } catch {
            attendanceData[v.id] = null;
          }
        })
      );

      setVolunteers(vols);
      setAttendanceMap(attendanceData);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load volunteers or attendance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClockIn = async (volunteerId) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [volunteerId]: { ...prev[volunteerId], clock_in: new Date().toISOString() },
    }));

    try {
      await api.clockIn(volunteerId);
    } catch (err) {
      console.error(err.response?.data || err);
      setError(err.response?.data?.error || "Failed to clock in.");
      fetchData();
    }
  };

  const handleClockOut = async (volunteerId) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [volunteerId]: { ...prev[volunteerId], clock_out: new Date().toISOString() },
    }));

    try {
      await api.clockOut(volunteerId);
    } catch (err) {
      console.error(err.response?.data || err);
      setError(err.response?.data?.error || "Failed to clock out.");
      fetchData();
    }
  };

  const toggleHistory = async (volunteerId) => {
    if (!expanded[volunteerId]) {
      try {
        const res = await api.getAttendanceByVolunteer(volunteerId);
        setHistoryMap((prev) => ({ ...prev, [volunteerId]: res.data }));
        setExpanded((prev) => ({ ...prev, [volunteerId]: true }));
      } catch (err) {
        console.error(err);
      }
    } else {
      setExpanded((prev) => ({ ...prev, [volunteerId]: false }));
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete ALL attendance records? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      await api.deleteAllAttendance();
      setAttendanceMap({});
      setHistoryMap({});
      alert("✅ All attendance records have been deleted!");
    } catch (err) {
      console.error(err);
      setError("Failed to delete all attendance records.");
    }
  };

  return (
    <main style={{ padding: "1rem", maxWidth: "1000px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
        Volunteer Attendance (Admin)
      </h1>

      {/* Delete All Button */}
      <button
        onClick={handleDeleteAll}
        style={{
          marginBottom: "1rem",
          backgroundColor: "#b92b17",
          color: "#fff",
          padding: "0.5rem 1rem",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "1rem",
        }}
        aria-label="Delete all attendance records"
      >
        Delete All Attendance Records
      </button>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #ccc",
            }}
            aria-label="Volunteer Attendance List"
          >
            <thead style={{ backgroundColor: "#f2f2f2" }}>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Clock In</th>
                <th style={thStyle}>Clock Out</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map((v, index) => {
                const attendance = attendanceMap[v.id];
                return (
                  <React.Fragment key={v.id}>
                    <tr
                      style={{
                        backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9",
                      }}
                    >
                      <td style={tdStyle}>{v.name}</td>
                      <td style={tdStyle}>{v.email}</td>
                      <td style={tdStyle}>
                        {attendance?.clock_in
                          ? new Date(attendance.clock_in).toLocaleTimeString()
                          : "Not yet"}
                      </td>
                      <td style={tdStyle}>
                        {attendance?.clock_out
                          ? new Date(attendance.clock_out).toLocaleTimeString()
                          : "Not yet"}
                      </td>
                      <td style={tdStyle}>
                        {attendance?.clock_in && attendance?.clock_out
                          ? getDuration(attendance.clock_in, attendance.clock_out)
                          : "-"}
                      </td>
                      <td style={tdStyle}>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleClockIn(v.id)}
                            disabled={attendance?.clock_in}
                            className="btn clock-in"
                            aria-label={`Clock in ${v.name}`}
                          >
                            Clock In
                          </button>
                          <button
                            onClick={() => handleClockOut(v.id)}
                            disabled={!attendance?.clock_in || attendance?.clock_out}
                            className="btn clock-out"
                            aria-label={`Clock out ${v.name}`}
                          >
                            Clock Out
                          </button>
                          <button
                            onClick={() => toggleHistory(v.id)}
                            className="btn history"
                            aria-label={`View attendance history for ${v.name}`}
                          >
                            {expanded[v.id] ? "Hide History" : "View History"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* History row */}
                    {expanded[v.id] && (
                      <tr>
                        <td colSpan={6} style={{ padding: "0", border: "none" }}>
                          <div
                            style={{
                              padding: "0.5rem 1rem",
                              background: "#f9f9f9",
                              borderTop: "1px solid #ccc",
                            }}
                          >
                            <strong>Attendance History:</strong>
                            <table
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                marginTop: "0.5rem",
                              }}
                            >
                              <thead>
                                <tr>
                                  <th>Clock In</th>
                                  <th>Clock Out</th>
                                  <th>Duration</th>
                                </tr>
                              </thead>
                              <tbody>
                                {historyMap[v.id]?.map((h) => (
                                  <tr key={h.id}>
                                    <td>
                                      {h.clock_in
                                        ? new Date(h.clock_in).toLocaleString()
                                        : "-"}
                                    </td>
                                    <td>
                                      {h.clock_out
                                        ? new Date(h.clock_out).toLocaleString()
                                        : "-"}
                                    </td>
                                    <td>
                                      {h.clock_in && h.clock_out
                                        ? getDuration(h.clock_in, h.clock_out)
                                        : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
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

      {/* CSS */}
      <style jsx>{`
        .action-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .btn {
          padding: 0.4rem 0.75rem;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background-color 0.3s;
        }

        .btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .clock-in {
          background-color: #004080;
          color: #fff;
        }
        .clock-in:hover:enabled {
          background-color: #0066cc;
        }

        .clock-out {
          background-color: #d4351c;
          color: #fff;
        }
        .clock-out:hover:enabled {
          background-color: #b92b17;
        }

        .history {
          background-color: #6a5acd;
          color: #fff;
        }
        .history:hover {
          background-color: #7b68ee;
        }
      `}</style>
    </main>
  );
};

// Table styles
const thStyle = {
  borderBottom: "2px solid #000",
  textAlign: "left",
  padding: "0.75rem",
};

const tdStyle = {
  padding: "0.75rem",
  borderBottom: "1px solid #ccc",
};

export default VolunteerAttendance;
