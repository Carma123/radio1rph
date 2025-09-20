import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./VolunteerLogin.css"; // similar styling as VolunteerRegister

const VolunteerLogin = ({ onLogin }) => {
  const navigate = useNavigate();
  const emailRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    emailRef.current.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      // Call backend login
      const response = await api.loginVolunteer({ email, password });

      // Save volunteer data to App.js state
      onLogin(response.data);

      // Also save to localStorage for refresh persistence
      localStorage.setItem("volunteer", JSON.stringify(response.data));

      // Redirect to dashboard
      navigate("/volunteer/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1 tabIndex="0">Volunteer Login</h1>

      <form
        onSubmit={handleSubmit}
        className="login-form"
        aria-label="Volunteer Login Form"
      >
        {error && (
          <p className="error" role="alert" aria-live="polite">
            {error}
          </p>
        )}

        <label htmlFor="email">Email:</label>
        <input
          ref={emailRef}
          type="email"
          id="email"
          name="email"
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
          name="password"
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

      <div className="auth-links">
        <p>
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/volunteer-register")}
            style={{ cursor: "pointer", color: "blue", textDecoration: "underline" }}
          >
            Register
          </span>
        </p>

        <p>
          Are you an admin?{" "}
          <span
            onClick={() => navigate("/admin-login")}
            style={{ cursor: "pointer", color: "green", textDecoration: "underline" }}
          >
            Admin Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default VolunteerLogin;
