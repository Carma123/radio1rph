// src/components/VolunteerRegister.js
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./VolunteerRegister.css"; // can reuse styles from AdminLogin.css/VolunteerLogin.css as well

/* Inline icons (matching Admin/Volunteer login look) */
const IconUser = (props) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="auth-icon" {...props}>
    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.33 0-8 2.17-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.83-3.67-5-8-5Z" />
  </svg>
);
const IconMail = (props) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="auth-icon" {...props}>
    <path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-11Zm2.3-.4 7.08 5.16a1 1 0 0 0 1.24 0L19.7 6.1M20 8.2l-6.54 4.76a3 3 0 0 1-3.64 0L3.3 8.2" />
  </svg>
);
const IconPhone = (props) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="auth-icon" {...props}>
    <path d="M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-5 18a1.25 1.25 0 1 1 1.25-1.25A1.25 1.25 0 0 1 12 20Zm4-4H8V6h8Z" />
  </svg>
);
const IconLock = (props) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="auth-icon" {...props}>
    <path d="M7 10V8a5 5 0 1 1 10 0v2h1.5A2.5 2.5 0 0 1 21 12.5v7A2.5 2.5 0 0 1 18.5 22h-13A2.5 2.5 0 0 1 3 19.5v-7A2.5 2.5 0 0 1 5.5 10H7Zm2-2a3 3 0 0 1 6 0v2H9V8Zm5.5 7a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" />
  </svg>
);

const VolunteerRegister = () => {
  const navigate = useNavigate();
  const nameRef = useRef(null);
  const liveRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const speak = (msg) => {
    if (!liveRef.current) return;
    liveRef.current.textContent = "";
    setTimeout(() => (liveRef.current.textContent = msg), 10);
  };

  useEffect(() => {
    nameRef.current?.focus(); // autofocus for accessibility
  }, []);

  const handleChange = (e) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { name, email, password } = formData;
    if (!name || !email || !password) {
      setError("Please fill in all required fields.");
      speak("Please fill in all required fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      speak("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await api.registerVolunteer(formData);
      setSuccess("Registration successful! Redirecting to login…");
      speak("Registration successful");
      setTimeout(() => navigate("/volunteer-login"), 1200);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Registration failed. Please try again.";
      setError(msg);
      speak("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const errorId = error ? "vol-reg-error" : undefined;
  const successId = success ? "vol-reg-success" : undefined;

  return (
    <div className="login-container">
      {/* Screen-reader live region */}
      <span
        ref={liveRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      />

      <h1 tabIndex={-1}>Volunteer Register</h1>
      <p className="muted" style={{ margin: "0 0 12px 0" }}>
        Create your account to access the volunteer dashboard, EOIs, and more.
      </p>

      {error && (
        <p id={errorId} className="error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p id={successId} className="success" role="status">
          {success}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="login-form"
        aria-describedby={[errorId, successId].filter(Boolean).join(" ") || undefined}
        noValidate
      >
        {/* Name */}
        <label htmlFor="name">Full Name</label>
        <div className="pw-wrap" style={{ paddingRight: 0 }}>
          <div style={{ position: "relative" }}>
            <IconUser style={{ position: "absolute", left: 10, top: 10 }} />
            <input
              ref={nameRef}
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              aria-required="true"
              aria-invalid={!!error}
              placeholder="Your full name"
              style={{ paddingLeft: 44 }}
              disabled={loading}
            />
          </div>
        </div>

        {/* Email */}
        <label htmlFor="email">Email</label>
        <div className="pw-wrap" style={{ paddingRight: 0 }}>
          <div style={{ position: "relative" }}>
            <IconMail style={{ position: "absolute", left: 10, top: 10 }} />
            <input
              type="email"
              id="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              required
              aria-required="true"
              aria-invalid={!!error}
              placeholder="you@example.org"
              style={{ paddingLeft: 44 }}
              disabled={loading}
            />
          </div>
        </div>

        {/* Phone (optional) */}
        <label htmlFor="phone">Phone Number (optional)</label>
        <div className="pw-wrap" style={{ paddingRight: 0 }}>
          <div style={{ position: "relative" }}>
            <IconPhone style={{ position: "absolute", left: 10, top: 10 }} />
            <input
              type="text"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. 0400 000 000"
              style={{ paddingLeft: 44 }}
              disabled={loading}
            />
          </div>
        </div>

        {/* Password */}
        <label htmlFor="password">Password</label>
        <div className="pw-wrap">
          <div style={{ position: "relative" }}>
            <IconLock style={{ position: "absolute", left: 10, top: 10 }} />
            <input
              type={showPw ? "text" : "password"}
              id="password"
              name="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              required
              aria-required="true"
              aria-invalid={!!error}
              placeholder="Choose a strong password (min 6 chars)"
              style={{ paddingLeft: 44 }}
              disabled={loading}
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw((s) => !s)}
              aria-pressed={showPw ? "true" : "false"}
              aria-label={showPw ? "Hide password" : "Show password"}
              disabled={loading}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button type="submit" className="login-btn primary" disabled={loading} aria-busy={loading ? "true" : "false"}>
          {loading ? "Registering…" : "Register"}
        </button>
      </form>

      {/* Auth navigation + CTAs to keep parity with other screens */}
      <section className="auth-cta" role="navigation" aria-label="Other options">
        <div className="auth-card" aria-labelledby="have-account-title">
          <div className="auth-card-header">
            <IconUser />
            <h2 id="have-account-title">Already have an account?</h2>
          </div>
        <p className="muted">Sign in to your volunteer dashboard.</p>
          <div className="cta-actions">
            <button
              type="button"
              className="cta-btn"
              onClick={() => navigate("/volunteer-login")}
            >
              Volunteer Login
            </button>
          </div>
        </div>

        <div className="auth-card" aria-labelledby="admin-access-title">
          <div className="auth-card-header">
            <IconLock />
            <h2 id="admin-access-title">Are you an Admin?</h2>
          </div>
          <p className="muted">Head to the admin sign-in instead.</p>
          <div className="cta-actions">
            <button
              type="button"
              className="cta-btn"
              onClick={() => navigate("/admin-login")}
            >
              Admin Login
            </button>
          </div>
        </div>
      </section>

      {/* Small focus/spacing tweaks for mobile */}
      <style>{`
        input:focus-visible, button:focus-visible {
          outline: 3px solid #93c5fd80;
          outline-offset: 2px;
        }
        @media (max-width: 480px) {
          form { gap: 0.75rem; }
        }
      `}</style>
    </div>
  );
};

export default VolunteerRegister;
