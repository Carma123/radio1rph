// src/components/VolunteerProfile.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import icon from "./icon.png";
import "./VolunteerDashboard.css"; // keeps your existing tokens & card styles

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
  const announceRef = useRef(null);

  const storedVolunteer = useMemo(() => safeParse("volunteer"), []);
  const volunteerId =
    storedVolunteer?.id ?? storedVolunteer?.volunteer_id ?? null;

  const [formData, setFormData] = useState({
    phone: storedVolunteer?.phone || "",
    emergency_contact: storedVolunteer?.emergency_contact || "",
    training_goals: storedVolunteer?.training_goals || "",
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!storedVolunteer) {
      navigate("/volunteer-login", { replace: true });
    }
  }, [storedVolunteer, navigate]);

  // Move focus to the status line when we show a new message (a11y)
  useEffect(() => {
    if (message && announceRef.current) {
      announceRef.current.focus();
    }
  }, [message]);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Simple, friendly client-side validation (non-blocking patterns kept minimal)
  const validate = () => {
    const next = {};
    const digits = (formData.phone || "").replace(/\D/g, "");
    if (!formData.phone) {
      next.phone = "Phone is required.";
    } else if (digits.length < 7) {
      next.phone = "Please enter at least 7 digits.";
    }
    if (!formData.emergency_contact) {
      next.emergency_contact = "Emergency contact is required.";
    }
    // training_goals is optional
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    setMessage("");

    if (!volunteerId) {
      setMessage("Error: Missing volunteer id. Please log in again.");
      console.error("Update blocked: volunteer id is missing.");
      return;
    }

    // show validation first
    const ok = validate();
    if (!ok) {
      setMessage("Please correct the highlighted fields.");
      return;
    }

    // Guard if the API method is missing to avoid runtime crash
    if (!api || typeof api.updateVolunteer !== "function") {
      setMessage(
        "Error: The update endpoint isn’t wired yet (api.updateVolunteer is missing)."
      );
      console.error("api.updateVolunteer is not a function");
      return;
    }

    try {
      setLoading(true);
      const response = await api.updateVolunteer(volunteerId, formData);

      // Prefer server response if provided; otherwise merge local form data
      const updatedVolunteer =
        response?.data && typeof response.data === "object"
          ? { ...storedVolunteer, ...response.data }
          : { ...storedVolunteer, ...formData, id: volunteerId };

      localStorage.setItem("volunteer", JSON.stringify(updatedVolunteer));
      setMessage("Profile updated successfully!");
      setErrors({});
    } catch (err) {
      console.error("Update failed:", err);
      const status = err?.response?.status;
      if (status === 405) {
        setMessage("Error updating profile. (405: Method Not Allowed on backend)");
      } else if (status === 404) {
        setMessage("Error updating profile. (404: Volunteer not found)");
      } else {
        // Generic
        setMessage("Error updating profile.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!storedVolunteer) return null; // allow redirect to happen

  return (
    <div className="dashboard-container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      {/* Status line (aria-live) */}
      <p
        ref={announceRef}
        role="status"
        aria-live="polite"
        tabIndex={-1}
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        {message || ""}
      </p>

      <header
        className="dashboard-hero"
        aria-label="Volunteer profile"
        style={{ marginBottom: "1.5rem" }}
      >
        <img
          src={icon}
          alt=""
          aria-hidden="true"
          className="hero-icon"
          style={{ height: 64, width: 64 }}
        />
        <h1 className="hero-title" style={{ marginTop: 8 }}>
          My Profile
        </h1>
        <p className="hero-sub">Update your personal info and training goals below.</p>
      </header>

      <main className="dashboard-main" id="main-content">
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
              maxWidth: 560,
              padding: "1.5rem",
              borderRadius: 18,
              backgroundColor: "#fff",
            }}
            aria-labelledby="profile-heading"
          >
            <h2 id="profile-heading" style={{ textAlign: "center", marginBottom: "1rem" }}>
              Profile Information
            </h2>

            {/* Read-only basics for clarity */}
            <div
              style={{
                marginBottom: "1rem",
                fontSize: "0.95rem",
                color: "#475569",
                display: "grid",
                gap: 6,
              }}
            >
              <div>
                <strong>Name:</strong> {storedVolunteer?.name || "-"}
              </div>
              <div>
                <strong>Email:</strong> {storedVolunteer?.email || "-"}
              </div>
              <div>
                <strong>Volunteer ID:</strong> {volunteerId ?? "-"}
              </div>
            </div>

            {/* Visible message (also announced in aria-live above) */}
            {message && (
              <div
                role="alert"
                aria-atomic="true"
                className="alert"
                style={{
                  marginBottom: "1rem",
                  border:
                    message.startsWith("Error") ||
                    message.toLowerCase().includes("error")
                      ? "1px solid #fecaca"
                      : "1px solid #bbf7d0",
                  background:
                    message.startsWith("Error") ||
                    message.toLowerCase().includes("error")
                      ? "#fef2f2"
                      : "#ecfdf5",
                  color:
                    message.startsWith("Error") ||
                    message.toLowerCase().includes("error")
                      ? "#7f1d1d"
                      : "#065f46",
                  borderRadius: 12,
                }}
              >
                {message}
              </div>
            )}

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              style={{ display: "grid", gap: "1rem" }}
            >
              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <span>
                    Phone <span className="sr-only">(required)</span>
                  </span>
                  <input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. 0412 345 678"
                    aria-required="true"
                    aria-invalid={errors.phone ? "true" : "false"}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    disabled={loading}
                    inputMode="tel"
                    style={{
                      padding: "12px",
                      borderRadius: 10,
                      border: `1px solid ${errors.phone ? "#b91c1c" : "#e5e7eb"}`,
                      fontSize: 16,
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,.25)")}
                    onBlur={(e) => (e.target.style.boxShadow = "none")}
                  />
                </label>
                {errors.phone && (
                  <div
                    id="phone-error"
                    style={{ color: "#b91c1c", marginTop: 6, fontSize: "0.9rem" }}
                  >
                    {errors.phone}
                  </div>
                )}
              </div>

              {/* Emergency Contact */}
              <div>
                <label
                  htmlFor="emergency_contact"
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <span>
                    Emergency Contact <span className="sr-only">(required)</span>
                  </span>
                  <input
                    id="emergency_contact"
                    name="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={handleChange}
                    placeholder="Name & phone (e.g. Alex – 0400 123 456)"
                    aria-required="true"
                    aria-invalid={errors.emergency_contact ? "true" : "false"}
                    aria-describedby={
                      errors.emergency_contact ? "emergency-contact-error" : undefined
                    }
                    disabled={loading}
                    style={{
                      padding: "12px",
                      borderRadius: 10,
                      border: `1px solid ${
                        errors.emergency_contact ? "#b91c1c" : "#e5e7eb"
                      }`,
                      fontSize: 16,
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,.25)")}
                    onBlur={(e) => (e.target.style.boxShadow = "none")}
                  />
                </label>
                {errors.emergency_contact && (
                  <div
                    id="emergency-contact-error"
                    style={{ color: "#b91c1c", marginTop: 6, fontSize: "0.9rem" }}
                  >
                    {errors.emergency_contact}
                  </div>
                )}
              </div>

              {/* Training Goals (optional) */}
              <div>
                <label
                  htmlFor="training_goals"
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <span>Training Goals (optional)</span>
                  <textarea
                    id="training_goals"
                    name="training_goals"
                    value={formData.training_goals}
                    onChange={handleChange}
                    placeholder="What would you like to learn or improve?"
                    aria-required="false"
                    disabled={loading}
                    style={{
                      padding: "12px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      fontSize: 16,
                      minHeight: 110,
                      resize: "vertical",
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,.25)")}
                    onBlur={(e) => (e.target.style.boxShadow = "none")}
                  />
                </label>
              </div>

              <button
                type="submit"
                className="btn primary"
                disabled={loading}
                aria-busy={loading ? "true" : "false"}
                style={{ justifyContent: "center" }}
              >
                {loading ? "Saving…" : "Save Changes"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
};

export default VolunteerProfile;
