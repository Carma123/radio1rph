// src/components/AdminRegister.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./AdminLogin.css"; // reuse same styles

const AdminRegister = () => {
  const navigate = useNavigate();
  const nameRef = useRef(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    nameRef.current.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.registerAdmin({ name, email, password });
      setSuccess("Registration successful! Redirecting to login...");
      setTimeout(() => navigate("/admin-login"), 1500);
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1 tabIndex="0">Admin Registration</h1>

      <form
        onSubmit={handleSubmit}
        className="login-form"
        aria-label="Admin Registration Form"
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

        <label htmlFor="name">Name:</label>
        <input
          ref={nameRef}
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          aria-required="true"
          placeholder="Enter your name"
        />

        <label htmlFor="email">Email:</label>
        <input
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
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      <p className="register-link">
        Already have an account?{" "}
        <span
          onClick={() => navigate("/admin-login")}
          style={{ cursor: "pointer", color: "blue", textDecoration: "underline" }}
        >
          Login here
        </span>
      </p>
    </div>
  );
};

export default AdminRegister;
