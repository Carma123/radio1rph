// src/components/QualificationsList.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

const QualificationsList = () => {
  const { volunteerId } = useParams();
  const [volunteer, setVolunteer] = useState(null);
  const [qualifications, setQualifications] = useState([]);
  const [trainingsMap, setTrainingsMap] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchVolunteer();
    fetchQualifications();
    fetchTrainings();
  }, [volunteerId]);

  const fetchVolunteer = async () => {
    try {
      const res = await api.getVolunteerById(volunteerId);
      setVolunteer(res.data);
    } catch (err) {
      console.error("Error fetching volunteer:", err);
    }
  };

  const fetchQualifications = async () => {
    try {
      const res = await api.getQualificationsByVolunteer(volunteerId);
      setQualifications(res.data);
    } catch (err) {
      console.error("Error fetching qualifications:", err);
    }
  };

  const fetchTrainings = async () => {
    try {
      const res = await api.getTrainings();
      const map = {};
      res.data.forEach((t) => (map[t.id] = t.title));
      setTrainingsMap(map);
    } catch (err) {
      console.error("Error fetching trainings:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this qualification?")) return;
    try {
      await api.deleteQualification(id);
      setQualifications(qualifications.filter((q) => q.id !== id));
    } catch (err) {
      console.error("Error deleting qualification:", err);
    }
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 30; // Highlight if expiring within 30 days
  };

  if (!volunteer) return <p>Loading volunteer...</p>;
  if (!qualifications.length) return <p>No qualifications found for {volunteer.name}.</p>;

  return (
    <main style={{ padding: "1rem", maxWidth: "900px", margin: "0 auto" }}>
      <h2 tabIndex="0">Qualifications for {volunteer.name}</h2>

      <button
        onClick={() => navigate(`/qualifications/add?id=${volunteer.id}`)}
        style={addBtnStyle}
        aria-label={`Add qualification for ${volunteer.name}`}
      >
        Add Qualification
      </button>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }} aria-label={`Qualifications for ${volunteer.name}`}>
          <thead style={{ backgroundColor: "#f2f2f2" }}>
            <tr>
              <th style={thStyle}>Training</th>
              <th style={thStyle}>Issue Date</th>
              <th style={thStyle}>Expiry Date</th>
              <th style={thStyle}>Document</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {qualifications.map((q, index) => (
              <tr
                key={q.id}
                style={{
                  backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9",
                  color: isExpiringSoon(q.expiry_date) ? "#d4351c" : "#000", // red text if expiring soon
                  fontWeight: isExpiringSoon(q.expiry_date) ? "600" : "normal",
                }}
              >
                <td style={tdStyle}>{trainingsMap[q.training_id] || "Unknown"}</td>
                <td style={tdStyle}>{q.issue_date || "N/A"}</td>
                <td style={tdStyle}>{q.expiry_date || "N/A"}</td>
                <td style={tdStyle}>
                  {q.document_path ? (
                    <a href={q.document_path} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => navigate(`/qualifications/add?id=${volunteer.id}&edit=${q.id}`)}
                    style={editBtnStyle}
                    aria-label={`Edit qualification for ${trainingsMap[q.training_id] || "training"}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    style={deleteBtnStyle}
                    aria-label={`Delete qualification for ${trainingsMap[q.training_id] || "training"}`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
};

const addBtnStyle = {
  margin: "1rem 0",
  padding: "0.75rem 1.25rem",
  backgroundColor: "#004080",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const thStyle = {
  textAlign: "left",
  padding: "0.75rem",
  borderBottom: "2px solid #000",
};

const tdStyle = {
  padding: "0.75rem",
  borderBottom: "1px solid #ccc",
};

const editBtnStyle = {
  marginRight: "0.5rem",
  padding: "0.5rem 0.75rem",
  backgroundColor: "#ffbf47",
  color: "#000",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

const deleteBtnStyle = {
  padding: "0.5rem 0.75rem",
  backgroundColor: "#d4351c",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

export default QualificationsList;
