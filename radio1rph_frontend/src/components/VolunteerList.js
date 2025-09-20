// src/components/VolunteerList.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const VolunteerList = ({ showQualificationsLink = false }) => {
  const [volunteers, setVolunteers] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    try {
      const response = await api.getVolunteers();
      setVolunteers(response.data);
    } catch (error) {
      console.error("Error fetching volunteers:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this volunteer?")) return;
    try {
      await api.deleteVolunteer(id);
      setVolunteers(volunteers.filter((v) => v.id !== id));
    } catch (err) {
      console.error("Error deleting volunteer:", err);
    }
  };

  const filteredVolunteers = volunteers.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main style={{ padding: "1rem", maxWidth: "900px", margin: "0 auto" }}>
      <h1 tabIndex="0" style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
        Volunteers
      </h1>

      {/* Header */}
      <div className="header-controls">
        <div className="search-wrapper" style={{ flex: 1 }}>
          <label htmlFor="search" style={{ fontWeight: "600" }}>
            Search by name or email
          </label>
          <input
            id="search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a name or email"
            aria-describedby="search-desc"
          />
          <p id="search-desc" style={{ fontSize: "0.9rem", color: "#555" }}>
            Start typing to filter the list of volunteers.
          </p>
        </div>

        <button
          onClick={() => navigate("/volunteers/add")}
          className="btn add-volunteer"
          aria-label="Add a new volunteer"
        >
          Add Volunteer
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}
          aria-label="Volunteer List"
        >
          <thead style={{ backgroundColor: "#f2f2f2" }}>
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
              filteredVolunteers.map((v, index) => (
                <tr
                  key={v.id}
                  tabIndex="0"
                  style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9" }}
                >
                  <td style={tdStyle}>{v.name}</td>
                  <td style={tdStyle}>{v.email}</td>
                  <td style={tdStyle}>{v.phone || "N/A"}</td>
                  <td style={tdStyle}>{v.status}</td>
                  <td style={tdStyle}>
                    <div className="action-buttons">
                      {/* Edit/Delete */}
                      <div className="action-group">
                        <button
                          onClick={() => navigate(`/volunteers/add?id=${v.id}`)}
                          className="btn edit"
                          aria-label={`Edit details for ${v.name}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="btn delete"
                          aria-label={`Delete volunteer ${v.name}`}
                        >
                          Delete
                        </button>
                      </div>

                      {/* Qualifications */}
                      {showQualificationsLink && (
                        <div className="action-group">
                          <button
                            onClick={() => navigate(`/volunteers/${v.id}/qualifications`)}
                            className="btn view"
                            aria-label={`View qualifications for ${v.name}`}
                          >
                            View Qualifications
                          </button>
                          <button
                            onClick={() => navigate(`/qualifications/add?id=${v.id}`)}
                            className="btn add-qual"
                            aria-label={`Add qualification for ${v.name}`}
                          >
                            Add Qualification
                          </button>
                        </div>
                      )}

                      {/* Attendance */}
                      <div className="action-group">
                        <button
                          onClick={() => navigate(`/volunteers/${v.id}/attendance`)}
                          className="btn view"
                          aria-label={`View attendance for ${v.name}`}
                        >
                          Attendance
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
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

      {/* CSS */}
      <style jsx>{`
        .header-controls {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: nowrap;
        }

        .btn {
          flex: 0 0 auto;
          min-width: 120px;
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          text-align: center;
          border: none;
          transition: background-color 0.3s;
        }

        .btn:focus {
          outline: 3px solid #ffbf47;
        }

        .add-volunteer {
          background-color: #004080;
          color: #fff;
        }
        .add-volunteer:hover {
          background-color: #0066cc;
        }

        .action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .action-group {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .btn.edit {
          background-color: #ffbf47;
          color: #000;
        }
        .btn.edit:hover {
          background-color: #e6ac2f;
        }

        .btn.delete {
          background-color: #d4351c;
          color: #fff;
        }
        .btn.delete:hover {
          background-color: #b92b17;
        }

        .btn.view {
          background-color: #1abc9c;
          color: #fff;
        }
        .btn.view:hover {
          background-color: #159a82;
        }

        .btn.add-qual {
          background-color: #004080;
          color: #fff;
        }
        .btn.add-qual:hover {
          background-color: #0066cc;
        }

        input[type="text"] {
          padding: 0.5rem;
          width: 100%;
          max-width: 400px;
          border: 1px solid #888;
          border-radius: 4px;
        }

        @media (max-width: 600px) {
          .header-controls {
            flex-direction: column;
            align-items: stretch;
          }
          .action-buttons {
            flex-direction: column;
          }
          .action-group {
            flex-direction: column;
          }
          .btn {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
};

// Styles for table
const thStyle = {
  borderBottom: "2px solid #000",
  textAlign: "left",
  padding: "0.75rem",
};

const tdStyle = {
  padding: "0.75rem",
  borderBottom: "1px solid #ccc",
};

export default VolunteerList;
