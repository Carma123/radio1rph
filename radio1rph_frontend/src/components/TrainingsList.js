// src/components/TrainingsList.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const TrainingsList = () => {
  const [trainings, setTrainings] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      const response = await api.getTrainings();
      setTrainings(response.data);
    } catch (error) {
      console.error("Error fetching trainings:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this training?")) return;
    try {
      await api.deleteTraining(id);
      setTrainings(trainings.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Error deleting training:", err);
    }
  };

  const filteredTrainings = trainings.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h1 tabIndex="0" style={{ marginBottom: "1.5rem", textAlign: "center" }}>Trainings</h1>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <button
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "5px",
            cursor: "pointer"
          }}
          onClick={() => navigate("/trainings/add")}
        >
          Add Training
        </button>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or type"
          style={{
            padding: "0.5rem",
            borderRadius: "5px",
            border: "1px solid #ccc",
            flexGrow: 1,
            maxWidth: "300px"
          }}
        />
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", boxShadow: "0 0 5px rgba(0,0,0,0.1)" }} aria-label="Trainings List">
        <thead style={{ backgroundColor: "#f2f2f2" }}>
          <tr>
            <th style={{ padding: "0.75rem", textAlign: "left" }}>Title</th>
            <th style={{ padding: "0.75rem", textAlign: "left" }}>Type</th>
            <th style={{ padding: "0.75rem", textAlign: "left" }}>Start Date</th>
            <th style={{ padding: "0.75rem", textAlign: "left" }}>End Date</th>
            <th style={{ padding: "0.75rem", textAlign: "left" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTrainings.length > 0 ? (
            filteredTrainings.map((t) => (
              <tr key={t.id} style={{ borderBottom: "1px solid #eee" }} tabIndex="0">
                <td style={{ padding: "0.75rem" }}>{t.title}</td>
                <td style={{ padding: "0.75rem" }}>{t.type}</td>
                <td style={{ padding: "0.75rem" }}>{t.start_date || "N/A"}</td>
                <td style={{ padding: "0.75rem" }}>{t.end_date || "N/A"}</td>
                <td style={{ padding: "0.75rem", display: "flex", gap: "0.5rem" }}>
                  <button
                    style={{
                      backgroundColor: "#2196F3",
                      color: "white",
                      border: "none",
                      padding: "0.3rem 0.7rem",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                    onClick={() => navigate(`/trainings/add?id=${t.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    style={{
                      backgroundColor: "#f44336",
                      color: "white",
                      border: "none",
                      padding: "0.3rem 0.7rem",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                    onClick={() => handleDelete(t.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ padding: "1rem", textAlign: "center" }}>No trainings found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TrainingsList;
