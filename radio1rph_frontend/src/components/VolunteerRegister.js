// src/components/VolunteerRegister.js
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./VolunteerRegister.css"; // create similar CSS to AdminLogin.css

const VolunteerRegister = () => {
  const navigate = useNavigate();
  const nameRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    nameRef.current.focus(); // autofocus for accessibility
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      await api.registerVolunteer(formData);
      setSuccess("Registration successful! Redirecting to login...");
      setTimeout(() => navigate("/volunteer-login"), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1 tabIndex="0">Volunteer Register</h1>

      <form
        onSubmit={handleSubmit}
        className="login-form"
        aria-label="Volunteer Registration Form"
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

        <label htmlFor="name">Full Name:</label>
        <input
          ref={nameRef}
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          aria-required="true"
          placeholder="Enter your full name"
        />

        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          aria-required="true"
          placeholder="Enter your email"
        />

        <label htmlFor="phone">Phone Number:</label>
        <input
          type="text"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Enter your phone number"
        />

        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          aria-required="true"
          placeholder="Enter your password"
        />

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      {/* Links to other auth pages */}
      <div className="auth-links">
        <p>
          Already have an account?{" "}
          <span
            onClick={() => navigate("/volunteer-login")}
            style={{
              cursor: "pointer",
              color: "blue",
              textDecoration: "underline",
            }}
          >
            Login
          </span>
        </p>

        <p>
          Are you an admin?{" "}
          <span
            onClick={() => navigate("/admin-login")}
            style={{
              cursor: "pointer",
              color: "green",
              textDecoration: "underline",
            }}
          >
            Admin Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default VolunteerRegister;
