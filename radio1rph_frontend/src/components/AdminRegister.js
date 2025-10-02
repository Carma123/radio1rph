// src/components/AdminRegister.js
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
// Reuse the same CSS so it looks like VolunteerRegister
import "./VolunteerRegister.css";

const AdminRegister = () => {
  const navigate = useNavigate();
  const nameRef = useRef(null);
  const errorRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password2: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { name, email, password, password2 } = form;
    if (!name || !email || !password || !password2) {
      setError("Please fill in all required fields.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    if (password !== password2) {
      setError("Passwords do not match.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    setLoading(true);
    try {
      await api.registerAdmin({ name, email, password });
      setSuccess("Admin registered! Redirecting to login…");
      setTimeout(() => navigate("/admin-login"), 1200);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Registration failed. Try a different email.";
      setError(msg);
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1 tabIndex={-1}>Create Admin Account</h1>

      <form
        onSubmit={onSubmit}
        className="login-form"
        aria-label="Admin Registration Form"
      >
        {error && (
          <p
            ref={errorRef}
            className="error"
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
          >
            {error}
          </p>
        )}
        {success && (
          <p className="success" role="status" aria-live="polite">
            {success}
          </p>
        )}

        <label htmlFor="name">Full Name</label>
        <input
          ref={nameRef}
          id="name"
          name="name"
          type="text"
          placeholder="Alex Morgan"
          value={form.name}
          onChange={onChange}
          required
          aria-required="true"
          disabled={loading}
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="admin@example.org"
          value={form.email}
          onChange={onChange}
          required
          aria-required="true"
          disabled={loading}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Create a strong password"
          value={form.password}
          onChange={onChange}
          required
          aria-required="true"
          disabled={loading}
          autoComplete="new-password"
        />

        <label htmlFor="password2">Confirm Password</label>
        <input
          id="password2"
          name="password2"
          type="password"
          placeholder="Re-enter password"
          value={form.password2}
          onChange={onChange}
          required
          aria-required="true"
          disabled={loading}
          autoComplete="new-password"
        />

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? "Creating…" : "Create admin"}
        </button>
      </form>

      {/* Same footer links block as VolunteerRegister */}
      <div className="auth-links">
        <p>
          Already have an account?{" "}
          <span
            onClick={() => navigate("/admin-login")}
            style={{ cursor: "pointer", color: "blue", textDecoration: "underline" }}
          >
            Admin Login
          </span>
        </p>

        <p>
          Not an admin?{" "}
          <span
            onClick={() => navigate("/volunteer-login")}
            style={{ cursor: "pointer", color: "green", textDecoration: "underline" }}
          >
            Volunteer Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default AdminRegister;
