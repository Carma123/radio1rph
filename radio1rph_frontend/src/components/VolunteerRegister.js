// src/components/VolunteerRegister.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./VolunteerLogin.css"; // Reuse the same styles as login

/* Inline icons (same vibe as VolunteerLogin) */
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

const VolunteerRegister = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    const payload = {
      name: (form.name || "").trim(),
      email: (form.email || "").trim().toLowerCase(),
      phone: (form.phone || "").trim(),
      password: form.password || "",
    };

    if (!payload.name || !payload.email || !payload.password) {
      setErr("Name, email and password are required.");
      return;
    }

    setBusy(true);
    try {
      await api.registerVolunteer(payload);
      setMsg("Registered! You can now log in.");
      // Optional: auto-login then redirect
      // await api.loginVolunteer({ email: payload.email, password: payload.password });
      // navigate("/volunteer/dashboard", { replace: true });
    } catch (ex) {
      const serverMsg =
        ex?.response?.data?.error ||
        ex?.response?.data?.message ||
        ex?.message ||
        "Could not register right now.";
      setErr(serverMsg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-container">{/* same wrapper style as login */}
      <h1>Volunteer Registration</h1>

      {err && <p className="error" role="alert">{err}</p>}
      {msg && <p className="success" role="status">{msg}</p>}

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          required
          disabled={busy}
          placeholder="Your full name"
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          required
          disabled={busy}
          placeholder="you@example.org"
        />

        <label htmlFor="phone">Phone (optional)</label>
        <input
          id="phone"
          value={form.phone}
          onChange={(e) => setField("phone", e.target.value)}
          disabled={busy}
          placeholder="04xx xxx xxx"
        />

        <label htmlFor="password">Password</label>
        <div className="pw-wrap">{/* matches login password styling */}
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            required
            disabled={busy}
            placeholder="Create a password"
          />
        </div>

        <button type="submit" className="login-btn primary" disabled={busy}>
          {busy ? "Working…" : "Create account"}
        </button>
      </form>

      {/* CTA cards — identical layout/classes to VolunteerLogin */}
      <section className="auth-cta" role="navigation" aria-label="Other options">
        <div className="auth-card" aria-labelledby="already-vol-title">
          <div className="auth-card-header">
            <IconMail />
            <h2 id="already-vol-title">Already registered?</h2>
          </div>
          <p className="muted">Head to the sign-in page to access your dashboard.</p>
          <div className="cta-actions">
            <button
              type="button"
              className="cta-btn primary"
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

      <style>{`
        input:focus-visible, button:focus-visible {
          outline: 3px solid #93c5fd80;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default VolunteerRegister;
