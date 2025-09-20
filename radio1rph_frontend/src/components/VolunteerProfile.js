import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import icon from "./icon.png";
import "./VolunteerDashboard.css";

const VolunteerProfile = () => {
  const navigate = useNavigate();
  const storedVolunteer = JSON.parse(localStorage.getItem("volunteer"));
  const [formData, setFormData] = useState({
    phone: storedVolunteer?.phone || "",
    emergency_contact: storedVolunteer?.emergency_contact || "",
    training_goals: storedVolunteer?.training_goals || "",
  });
  const [message, setMessage] = useState("");

  // If no volunteer is logged in, redirect
  if (!storedVolunteer) {
    navigate("/volunteer-login");
    return null;
  }

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      // ✅ Use `id` instead of volunteer_id
      const response = await api.updateVolunteer(storedVolunteer.id, formData);

      // ✅ Keep localStorage in sync with updated volunteer data
      const updatedVolunteer = { ...storedVolunteer, ...formData };
      localStorage.setItem("volunteer", JSON.stringify(updatedVolunteer));

      setMessage("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      setMessage("Error updating profile.");
    }
  };

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

            {message && (
              <p
                role="alert"
                style={{
                  color: message.includes("Error") ? "#dc3545" : "#28a745",
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
                style={{
                  width: "100%",
                  padding: "14px",
                  marginTop: "0.5rem",
                  backgroundColor: "#007BFF",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                  transition: "background-color 0.3s, transform 0.2s",
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#0056b3";
                  e.target.style.transform = "scale(1.03)";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "#007BFF";
                  e.target.style.transform = "scale(1)";
                }}
              >
                Save Changes
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
};

export default VolunteerProfile;
