// src/components/VolunteerLogin.js
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import "./VolunteerLogin.css";

/* Inline icons */
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

const VolunteerLogin = ({ onLogin }) => {
  const navigate = useNavigate();

  // fields
  const emailRef = useRef(null);
  const liveRef = useRef(null);
  const speakTimeoutRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // status
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // forgot password (inline panel)
  const [showForgot, setShowForgot] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [fpBusy, setFpBusy] = useState(false);
  const [fpMsg, setFpMsg] = useState("");

  const speak = (msg) => {
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }
    const node = liveRef.current;
    if (!node) return;
    node.textContent = "";
    speakTimeoutRef.current = setTimeout(() => {
      if (liveRef.current) liveRef.current.textContent = msg;
      speakTimeoutRef.current = null;
    }, 50);
  };

  useEffect(() => {
    emailRef.current?.focus();
    return () => {
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
        speakTimeoutRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const payload = {
      email: (email || "").trim().toLowerCase(),
      password: password || "",
    };

    if (!payload.email || !payload.password) {
      const msg = "Please enter both email and password.";
      setError(msg);
      speak(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await api.loginVolunteer(payload);
      if (onLogin) {
        const { volunteer_id, name, email: vEmail, emergency_contact } = res.data || {};
        onLogin({ volunteer_id, name, email: vEmail, emergency_contact });
      }
      setSuccess("Login successful!");
      speak("Login successful");
      setTimeout(() => navigate("/volunteer/dashboard", { replace: true }), 200);
    } catch (err) {
      // Surface exact server message when possible
      const serverMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Invalid email or password.";

      // Helpful hint when it's the common “Volunteer not found” path
      const hint =
        serverMsg.toLowerCase().includes("not found")
          ? " (Tip: register first, or check the email spelling.)"
          : "";

      setError(serverMsg + hint);
      speak("Login failed");
      // Also log the payload (email only) to help debugging in DevTools
      // eslint-disable-next-line no-console
      console.warn("Login failed for:", payload.email, "→", err?.response?.status, serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async (e) => {
    e.preventDefault();
    setFpBusy(true);
    setFpMsg("");
    try {
      await api.volunteerRequestPasswordReset((fpEmail || "").trim().toLowerCase());
      setFpMsg(
        "If an account exists for that email, a reset link has been sent. Please check your inbox."
      );
      speak("Password reset email sent");
    } catch (err) {
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

  const errorId = error ? "vol-login-error" : undefined;
  const successId = success ? "vol-login-success" : undefined;

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

      <h1 id="vol-login-title" tabIndex={-1}>Volunteer Login</h1>
      <p className="muted" style={{ margin: "0 0 12px 0" }}>
        Sign in to access your dashboard, EOIs and qualifications.
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
              placeholder="you@example.org"
              style={{ paddingLeft: 44 }}
              disabled={loading}
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
          aria-controls="vol-forgot-panel"
          style={{
            background: "none",
            border: "none",
            color: "#2563eb",
            textDecoration: "underline",
            cursor: "pointer",
            padding: 0,
            fontWeight: 600,
          }}
          disabled={loading}
        >
          {showForgot ? "Close password help" : "Forgot password?"}
        </button>

        <Link
          to="/volunteer-reset-password"
          style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 600 }}
        >
          Have a reset token?
        </Link>
      </div>

      {/* Inline forgot password panel */}
      {showForgot && (
        <section
          id="vol-forgot-panel"
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
            Enter your email. We’ll send you a link to reset your password.
          </p>
          <form onSubmit={sendReset}>
            <label htmlFor="fp-email" style={{ fontWeight: 600 }}>
              Volunteer email
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
              disabled={fpBusy}
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

      {/* CTA cards */}
      <section className="auth-cta" role="navigation" aria-label="Other options">
        <div className="auth-card" aria-labelledby="new-vol-title">
          <div className="auth-card-header">
            <IconMail />
            <h2 id="new-vol-title">New to VTMS?</h2>
          </div>
          <p className="muted">Create a volunteer account to get started.</p>
          <div className="cta-actions">
            <button
              type="button"
              className="cta-btn primary"
              onClick={() => navigate("/volunteer-register")}
            >
              Volunteer Register
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

export default VolunteerLogin;
