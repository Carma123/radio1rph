// src/components/AdminResetPassword.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import "./AdminLogin.css"; // reuse the same styles

const AdminResetPassword = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pwRef = useRef(null);

  const initialEmail = params.get("email") || "";
  const token = params.get("token") || "";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    pwRef.current?.focus();
  }, []);

  const validate = () => {
    if (!token) return "Reset token is missing. Please use the link from your email.";
    if (!email.trim()) return "Email is required.";
    if (!password) return "Please enter a new password.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirm) return "Passwords do not match.";
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    try {
      await api.resetAdminPassword({
        token,
        email: email.trim(),
        new_password: password,
      });
      setSuccess("Password has been reset successfully. You can now log in.");
      setTimeout(() => navigate("/admin-login", { replace: true }), 900);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Reset failed. The link may be invalid or expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1 id="reset-title" tabIndex={-1}>Reset Password</h1>
      <p className="muted" style={{ margin: "0 0 12px 0" }}>
        Choose a new password for your admin account.
      </p>

      {error && <p className="error" role="alert" aria-live="assertive">{error}</p>}
      {success && <p className="success" role="status" aria-live="polite">{success}</p>}

      <form onSubmit={submit} className="login-form" noValidate>
        <label htmlFor="rp-email">Admin Email</label>
        <input
          id="rp-email"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-required="true"
        />

        <label htmlFor="rp-password">New Password</label>
        <div className="pw-wrap">
          <div style={{ position: "relative" }}>
            <input
              ref={pwRef}
              id="rp-password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
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

        <label htmlFor="rp-confirm">Confirm Password</label>
        <div className="pw-wrap">
          <div style={{ position: "relative" }}>
            <input
              id="rp-confirm"
              type={showPw2 ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              aria-required="true"
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw2((s) => !s)}
              aria-pressed={showPw2 ? "true" : "false"}
              aria-label={showPw2 ? "Hide confirm password" : "Show confirm password"}
            >
              {showPw2 ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="login-btn primary"
          disabled={loading}
          aria-busy={loading ? "true" : "false"}
        >
          {loading ? "Saving…" : "Reset password"}
        </button>
      </form>

      <div className="auth-cta" aria-label="Back to login">
        <section className="auth-card" aria-labelledby="back-login2">
          <h2 id="back-login2" className="sr-only">Back</h2>
          <div className="cta-actions">
            <button type="button" className="cta-btn" onClick={() => navigate("/admin-login")}>
              ⬅️ Back to login
            </button>
          </div>
        </section>
      </div>

      <style>{`
        input:focus-visible, button:focus-visible {
          outline: 3px solid #93c5fd80;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default AdminResetPassword;
