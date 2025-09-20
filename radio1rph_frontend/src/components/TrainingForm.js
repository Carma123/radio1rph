// src/components/TrainingForm.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";

const TrainingForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const trainingId = queryParams.get("id");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState("internal");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (trainingId) {
      api.getTraining(trainingId)
        .then(res => {
          setTitle(res.data.title);
          setDescription(res.data.description || "");
          setStartDate(res.data.start_date || "");
          setEndDate(res.data.end_date || "");
          setType(res.data.type);
        })
        .catch(() => setError("Failed to load training data."));
    }
  }, [trainingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title) {
      setError("Please provide a title for the training.");
      return;
    }

    try {
      if (trainingId) {
        await api.updateTraining(trainingId, { title, description, start_date: startDate, end_date: endDate, type });
        setSuccess("Training updated successfully!");
      } else {
        await api.addTraining({ title, description, start_date: startDate, end_date: endDate, type });
        setSuccess("Training added successfully!");
      }
      setTimeout(() => navigate("/trainings"), 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save training.");
    }
  };

  return (
    <div style={{
      maxWidth: "600px",
      margin: "2rem auto",
      padding: "2rem",
      border: "1px solid #ddd",
      borderRadius: "8px",
      boxShadow: "0 0 10px rgba(0,0,0,0.05)"
    }}>
      <h1 tabIndex="0" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        {trainingId ? "Edit Training" : "Add Training"}
      </h1>

      {error && <p style={{ color: "red", marginBottom: "1rem" }} role="alert" aria-live="polite">{error}</p>}
      {success && <p style={{ color: "green", marginBottom: "1rem" }} role="status" aria-live="polite">{success}</p>}

      <form onSubmit={handleSubmit} aria-label="Training Form" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label htmlFor="title" style={{ display: "block", marginBottom: "0.5rem" }}>Title:</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            aria-required="true"
            placeholder="Training title"
            style={{ width: "100%", padding: "0.5rem", borderRadius: "5px", border: "1px solid #ccc" }}
          />
        </div>

        <div>
          <label htmlFor="description" style={{ display: "block", marginBottom: "0.5rem" }}>Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Training description"
            style={{ width: "100%", padding: "0.5rem", borderRadius: "5px", border: "1px solid #ccc", minHeight: "100px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="startDate" style={{ display: "block", marginBottom: "0.5rem" }}>Start Date:</label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "5px", border: "1px solid #ccc" }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label htmlFor="endDate" style={{ display: "block", marginBottom: "0.5rem" }}>End Date:</label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "5px", border: "1px solid #ccc" }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="type" style={{ display: "block", marginBottom: "0.5rem" }}>Type:</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "5px", border: "1px solid #ccc" }}
          >
            <option value="internal">Internal</option>
            <option value="external">External</option>
          </select>
        </div>

        <button type="submit" style={{
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          padding: "0.75rem 1rem",
          borderRadius: "5px",
          cursor: "pointer",
          marginTop: "1rem"
        }}>
          {trainingId ? "Update Training" : "Add Training"}
        </button>
      </form>
    </div>
  );
};

export default TrainingForm;
