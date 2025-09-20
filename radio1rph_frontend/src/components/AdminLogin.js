// src/components/AdminLogin.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./AdminLogin.css";

const AdminLogin = ({ onLogin }) => {
  const navigate = useNavigate();
  const emailRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    emailRef.current.focus();
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
      // --------------------------
      // LOGIN ADMIN
      // --------------------------
      await api.loginAdmin({ email, password });

      // Call onLogin to update App.js state
      if (onLogin) onLogin();

      setSuccess("Login successful!");
      setTimeout(() => navigate("/volunteers"), 1000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please check credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1 tabIndex="0">Admin Login</h1>

      <form
        onSubmit={handleSubmit}
        className="login-form"
        aria-label="Admin Login Form"
      >
        {error && (
          <p className="error" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        {success && (
          <p className="success" role="status" aria-live="polite">
            {success}
          </p>
        )}

        <label htmlFor="email">Email:</label>
        <input
          ref={emailRef}
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-required="true"
          placeholder="Enter your email"
        />

        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-required="true"
          placeholder="Enter your password"
        />

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* Links to other auth pages */}
      <div className="auth-links">
        <p>
          Don&apos;t have an admin account?{" "}
          <span
            onClick={() => navigate("/admin-register")}
            style={{
              cursor: "pointer",
              color: "blue",
              textDecoration: "underline",
            }}
          >
            Register here
          </span>
        </p>

        <p>
          Are you a volunteer?{" "}
          <span
            onClick={() => navigate("/volunteer-login")}
            style={{
              cursor: "pointer",
              color: "green",
              textDecoration: "underline",
            }}
          >
            Volunteer Login
          </span>{" "}
          |{" "}
          <span
            onClick={() => navigate("/volunteer-register")}
            style={{
              cursor: "pointer",
              color: "green",
              textDecoration: "underline",
            }}
          >
            Volunteer Register
          </span>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
