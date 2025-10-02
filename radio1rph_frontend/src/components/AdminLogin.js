// src/components/AdminLogin.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import "./AdminLogin.css";

/* Inline icons (no external libs) */
const IconMail = (props) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="auth-icon" {...props}>
    <path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-11Zm2.3-.4 7.08 5.16a1 1 0 0 0 1.24 0L19.7 6.1M20 8.2l-6.54 4.76a3 3 0 0 1-3.64 0L3.3 8.2" />
  </svg>
);

const IconLock = (props) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="auth-icon" {...props}>
    <path d="M7 10V8a5 5 0 1 1 10 0v2h1.5A2.5 2.5 0 0 1 21 12.5v7A2.5 2.5 0 0 1 18.5 22h-13A2.5 2.5 0 0 1 3 19.5v-7A2.5 2.5 0 0 1 5.5 10H7Zm2-2a3 3 0 0 1 6 0v2H9V8Zm5.5 7a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" />
  </svg>
);

const AdminLogin = ({ onLogin }) => {
  const navigate = useNavigate();
  const emailRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [fpBusy, setFpBusy] = useState(false);
  const [fpMsg, setFpMsg] = useState("");

  // live region for SR announcements
  const liveRef = useRef(null);
  const speak = (msg) => {
    if (!liveRef.current) return;
    liveRef.current.textContent = "";
    setTimeout(() => (liveRef.current.textContent = msg), 10);
  };

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await api.loginAdminAndStore({ email, password });
      api.auth.setFromStorage();
      if (typeof onLogin === "function") onLogin();
      setSuccess("Login successful!");
      speak("Login successful");
      setTimeout(() => navigate("/trainings", { replace: true }), 400);
    } catch (err) {
      console.error("Admin login failed:", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Login failed. Please check credentials.";
      setError(msg);
      speak("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async (e) => {
    e.preventDefault();
    setFpBusy(true);
    setFpMsg("");
    try {
      await api.requestAdminPasswordReset({ email: fpEmail.trim() });
      setFpMsg(
        "If an account exists for that email, a reset link has been sent. Please check your inbox."
      );
      speak("Password reset email sent");
    } catch (err) {
      console.error("Reset request failed:", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "We couldn’t send the reset email right now.";
      setFpMsg(msg);
      speak("Password reset failed");
    } finally {
      setFpBusy(false);
    }
  };

  const errorId = error ? "login-error" : undefined;
  const successId = success ? "login-success" : undefined;

  return (
    <div className="login-container">
      {/* SR live region */}
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
      <h1 id="admin-login-title" tabIndex={-1}>Admin Login</h1>
      <p className="muted" style={{ margin: "0 0 12px 0" }}>
        Sign in to manage volunteers and trainings.
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
        <label htmlFor="email">Email</label>
        <div className="pw-wrap" style={{ paddingRight: 0 }}>
          <div style={{ position: "relative" }}>
            <IconMail style={{ position: "absolute", left: 10, top: 10 }} />
            <input
              ref={emailRef}
              type="email"
              id="email"
              name="email"
              inputMode="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              aria-invalid={!!error}
              placeholder="name@example.com"
              style={{ paddingLeft: 44 }}
            />
          </div>
        </div>

        <label htmlFor="password">Password</label>
        <div className="pw-wrap">
          <div style={{ position: "relative" }}>
            <IconLock style={{ position: "absolute", left: 10, top: 10 }} />
            <input
              type={showPw ? "text" : "password"}
              id="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              aria-invalid={!!error}
              placeholder="Enter your password"
              style={{ paddingLeft: 44 }}
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw((s) => !s)}
              aria-pressed={showPw ? "true" : "false"}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="login-btn primary"
          disabled={loading}
          aria-busy={loading ? "true" : "false"}
        >
          {loading ? "Logging in…" : "Login"}
        </button>
      </form>

      {/* Forgot password & Reset link row */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className="linklike"
          onClick={() => setShowForgot((s) => !s)}
          aria-expanded={showForgot ? "true" : "false"}
          aria-controls="forgot-panel"
          style={{
            background: "none",
            border: "none",
            color: "#2563eb",
            textDecoration: "underline",
            cursor: "pointer",
            padding: 0,
            fontWeight: 600,
          }}
        >
          {showForgot ? "Close password help" : "Forgot password?"}
        </button>

        <Link
          to="/admin/reset-password"
          style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 600 }}
        >
          Have a reset token?
        </Link>
      </div>

      {/* Forgot password panel */}
      {showForgot && (
        <section
          id="forgot-panel"
          aria-label="Password reset"
          style={{
            marginTop: 16,
            padding: "12px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <p style={{ marginBottom: 8 }}>
            Enter your admin email. We’ll email you a link to reset your password.
          </p>
          <form onSubmit={sendReset}>
            <label htmlFor="fp-email" style={{ fontWeight: 600 }}>
              Admin email
            </label>
            <input
              id="fp-email"
              type="email"
              autoComplete="email"
              value={fpEmail}
              onChange={(e) => setFpEmail(e.target.value)}
              required
              aria-required="true"
              style={{
                width: "100%",
                padding: "0.6rem",
                border: "1px solid #888",
                borderRadius: 6,
                marginTop: 4,
                marginBottom: 10,
              }}
            />
            <button
              type="submit"
              disabled={fpBusy}
              aria-busy={fpBusy ? "true" : "false"}
              className="cta-btn primary"
              style={{ fontWeight: 700 }}
            >
              {fpBusy ? "Sending…" : "Send reset link"}
            </button>
          </form>

          {fpMsg && (
            <p role="status" style={{ marginTop: 10, color: "#111" }} aria-live="polite">
              {fpMsg}
            </p>
          )}
        </section>
      )}

      {/* CTA Cards */}
      <div className="auth-cta" aria-label="Authentication options">
        <section className="auth-card" aria-labelledby="cta-admins">
          <header className="auth-card-header">
            <IconLock />
            <h2 id="cta-admins">Admins</h2>
          </header>
          <p className="muted" style={{ margin: 0 }}>
            Manage courses, EOIs, and capacities.
          </p>
          <div className="cta-actions">
            <button
              type="button"
              className="cta-btn primary"
              onClick={() => navigate("/admin-register")}
            >
              Register
            </button>
          </div>
        </section>

        <section className="auth-card" aria-labelledby="cta-vols">
          <header className="auth-card-header">
            <IconMail />
            <h2 id="cta-vols">Volunteers</h2>
          </header>
          <p className="muted" style={{ margin: 0 }}>
            Access your dashboard and submit EOIs.
          </p>
          <div className="cta-actions">
            <button
              type="button"
              className="cta-btn"
              onClick={() => navigate("/volunteer-login")}
            >
              Volunteer Login
            </button>
            <button
              type="button"
              className="cta-btn"
              onClick={() => navigate("/volunteer-register")}
            >
              Volunteer Register
            </button>
          </div>
        </section>
      </div>

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

export default AdminLogin;
