// src/components/VolunteerForm.js
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";

const VolunteerForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editingId = searchParams.get("id");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("active");
  const [trainingGoals, setTrainingGoals] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !email) {
      setError("Please provide name and email.");
      return;
    }

    try {
      if (editingId) {
        await api.updateVolunteer(editingId, {
          name,
          email,
          phone,
          status,
          training_goals: trainingGoals,
        });
        setSuccess("Volunteer updated successfully!");
      } else {
        await api.addVolunteer({
          name,
          email,
          phone,
          status,
          training_goals: trainingGoals,
        });
        setSuccess("Volunteer added successfully!");
      }
      setTimeout(() => navigate("/volunteers"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save volunteer.");
    }
  };

  return (
    <main style={{ maxWidth: "600px", margin: "2rem auto", padding: "1.5rem" }}>
      <h1 tabIndex="0" style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
        {editingId ? "Edit Volunteer" : "Add Volunteer"}
      </h1>

      {error && (
        <p
          style={{ color: "#d4351c", marginBottom: "1rem" }}
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          style={{ color: "green", marginBottom: "1rem" }}
          role="status"
          aria-live="polite"
        >
          {success}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        aria-label={editingId ? "Edit Volunteer Form" : "Add Volunteer Form"}
      >
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="name" style={{ fontWeight: "600" }}>
            Name:
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-required="true"
            placeholder="Full Name"
            style={{
              width: "100%",
              padding: "0.5rem",
              marginTop: "0.25rem",
              border: "1px solid #888",
              borderRadius: "4px",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="email" style={{ fontWeight: "600" }}>
            Email:
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-required="true"
            placeholder="Email Address"
            style={{
              width: "100%",
              padding: "0.5rem",
              marginTop: "0.25rem",
              border: "1px solid #888",
              borderRadius: "4px",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="phone" style={{ fontWeight: "600" }}>
            Phone:
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone Number"
            style={{
              width: "100%",
              padding: "0.5rem",
              marginTop: "0.25rem",
              border: "1px solid #888",
              borderRadius: "4px",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="status" style={{ fontWeight: "600" }}>
            Status:
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              marginTop: "0.25rem",
              border: "1px solid #888",
              borderRadius: "4px",
            }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="trainingGoals" style={{ fontWeight: "600" }}>
            Training Goals:
          </label>
          <textarea
            id="trainingGoals"
            value={trainingGoals}
            onChange={(e) => setTrainingGoals(e.target.value)}
            placeholder="Enter training goals"
            rows="4"
            style={{
              width: "100%",
              padding: "0.5rem",
              marginTop: "0.25rem",
              border: "1px solid #888",
              borderRadius: "4px",
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1.25rem",
            backgroundColor: "#004080", // dark blue
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
          onFocus={(e) => (e.target.style.outline = "3px solid #ffbf47")}
          onBlur={(e) => (e.target.style.outline = "none")}
        >
          {editingId ? "Update Volunteer" : "Add Volunteer"}
        </button>
      </form>
    </main>
  );
};

export default VolunteerForm;
