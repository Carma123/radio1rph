import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./VolunteerLogin.css";

const VolunteerForgotPassword = () => {
  const navigate = useNavigate();
  const emailRef = useRef(null);
  const alertRef = useRef(null);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => emailRef.current?.focus(), []);
  useEffect(() => {
    if (err || msg) alertRef.current?.focus();
  }, [err, msg]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!email) {
      setErr("Please enter your email.");
      return;
    }
    setBusy(true);
    try {
      await api.volunteerRequestPasswordReset(email);
      setMsg(
        "If an account exists for that email, a reset link has been sent. Please check your inbox."
      );
    } catch (e) {
      setErr(
        e?.response?.data?.error || "We couldn’t send the reset email right now."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-container">
      <h1 tabIndex={-1}>Forgot Password (Volunteer)</h1>

      <form onSubmit={submit} className="login-form" aria-label="Forgot Password">
        {(err || msg) && (
          <p
            ref={alertRef}
            className={err ? "error" : "success"}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
          >
            {err || msg}
          </p>
        )}

        <label htmlFor="email">Email</label>
        <input
          ref={emailRef}
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.org"
          autoComplete="email"
          disabled={busy}
        />

        <button type="submit" className="login-btn primary" disabled={busy}>
          {busy ? "Sending..." : "Send reset link"}
        </button>

        <div className="row-between" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="link-btn"
            onClick={() => navigate("/volunteer-login")}
            disabled={busy}
          >
            Back to login
          </button>
          <span aria-hidden="true" />
        </div>
      </form>
    </div>
  );
};

export default VolunteerForgotPassword;
