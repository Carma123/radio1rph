// src/components/VolunteerProfile.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import icon from "./icon.png";
import "./VolunteerDashboard.css";

const safeParse = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const VolunteerProfile = () => {
  const navigate = useNavigate();

  const storedVolunteer = useMemo(() => safeParse("volunteer"), []);
  const volunteerId = storedVolunteer?.id ?? storedVolunteer?.volunteer_id ?? null;

  const [formData, setFormData] = useState({
    phone: storedVolunteer?.phone || "",
    emergency_contact: storedVolunteer?.emergency_contact || "",
    training_goals: storedVolunteer?.training_goals || "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!storedVolunteer) {
      navigate("/volunteer-login", { replace: true });
    }
  }, [storedVolunteer, navigate]);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setMessage("");
    if (!volunteerId) {
      setMessage("Error: Missing volunteer id. Please log in again.");
      console.error("Update blocked: volunteer id is missing.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.updateVolunteer(volunteerId, formData);

      // Prefer server-truth if returned, else merge our form data
      const updatedVolunteer =
        response?.data && typeof response.data === "object"
          ? { ...storedVolunteer, ...response.data }
          : { ...storedVolunteer, ...formData, id: volunteerId };

      localStorage.setItem("volunteer", JSON.stringify(updatedVolunteer));
      setMessage("Profile updated successfully!");
    } catch (err) {
      console.error("Update failed:", err);
      const status = err?.response?.status;
      if (status === 405) {
        setMessage("Error updating profile. (405: Method Not Allowed on backend)");
      } else if (status === 404) {
        setMessage("Error updating profile. (404: Volunteer not found)");
      } else {
        setMessage("Error updating profile.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!storedVolunteer) return null; // allow redirect to happen

  return (
    <div className="dashboard-container">
      <header
        className="dashboard-header"
        style={{ textAlign: "center", marginBottom: "2rem" }}
      >
        <img
          src={icon}
          alt="Volunteer Profile Logo"
          style={{ height: "70px", marginBottom: "1rem" }}
        />
        <h1 tabIndex="0">My Profile</h1>
        <p tabIndex="0">Update your personal info and training goals below.</p>
      </header>

      <main className="dashboard-main">
        <div
          className="profile-wrapper"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            width: "100%",
            padding: "1rem",
          }}
        >
          <section
            className="card profile-card"
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "2rem",
              borderRadius: "12px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
              backgroundColor: "#fff",
              transition: "transform 0.3s",
            }}
          >
            <h2
              tabIndex="0"
              style={{
                textAlign: "center",
                marginBottom: "1.5rem",
                color: "#333",
              }}
            >
              Profile Information
            </h2>

            {/* Read-only basics for clarity */}
            <div style={{ marginBottom: "1rem", fontSize: "0.95rem", color: "#555" }}>
              <div><strong>Name:</strong> {storedVolunteer?.name || "-"}</div>
              <div><strong>Email:</strong> {storedVolunteer?.email || "-"}</div>
              <div><strong>Volunteer ID:</strong> {volunteerId ?? "-"}</div>
            </div>

            {message && (
              <p
                role="alert"
                style={{
                  color: message.startsWith("Error") ? "#dc3545" : "#28a745",
                  textAlign: "center",
                  marginBottom: "1rem",
                  fontWeight: "bold",
                }}
              >
                {message}
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
            >
              <label htmlFor="phone" style={{ display: "flex", flexDirection: "column" }}>
                Phone:
                <input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  aria-required="true"
                  disabled={loading}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                    fontSize: "16px",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
                    transition: "border-color 0.2s",
                  }}
                />
              </label>

              <label
                htmlFor="emergency_contact"
                style={{ display: "flex", flexDirection: "column" }}
              >
                Emergency Contact:
                <input
                  id="emergency_contact"
                  name="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={handleChange}
                  placeholder="Enter emergency contact"
                  aria-required="true"
                  disabled={loading}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                    fontSize: "16px",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
                    transition: "border-color 0.2s",
                  }}
                />
              </label>

              <label
                htmlFor="training_goals"
                style={{ display: "flex", flexDirection: "column" }}
              >
                Training Goals:
                <textarea
                  id="training_goals"
                  name="training_goals"
                  value={formData.training_goals}
                  onChange={handleChange}
                  placeholder="Enter your training goals"
                  aria-required="false"
                  disabled={loading}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                    fontSize: "16px",
                    minHeight: "100px",
                    resize: "vertical",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
                    transition: "border-color 0.2s",
                  }}
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  marginTop: "0.5rem",
                  backgroundColor: loading ? "#6c757d" : "#007BFF",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                  transition: "background-color 0.3s, transform 0.2s",
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = "#0056b3";
                    e.target.style.transform = "scale(1.03)";
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = loading ? "#6c757d" : "#007BFF";
                  e.target.style.transform = "scale(1)";
                }}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
};

export default VolunteerProfile;
