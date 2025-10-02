import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import "./VolunteerLogin.css";

const VolunteerResetPassword = () => {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const token = search.get("token") || "";

  const pwRef = useRef(null);
  const alertRef = useRef(null);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => pwRef.current?.focus(), []);
  useEffect(() => {
    if (err || msg) alertRef.current?.focus();
  }, [err, msg]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!token) {
      setErr("Missing or invalid reset link.");
      return;
    }
    if (!pw || pw.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (pw !== pw2) {
      setErr("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await api.volunteerResetPassword({ token, new_password: pw });
      setMsg("Your password has been reset. You can now log in.");
      setTimeout(() => navigate("/volunteer-login"), 1200);
    } catch (e) {
      setErr(e?.response?.data?.error || "Reset failed. The link may be expired.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-container">
      <h1 tabIndex={-1}>Reset Password (Volunteer)</h1>

      <form onSubmit={submit} className="login-form" aria-label="Reset Password">
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

        <label htmlFor="pw">New password</label>
        <div className="pw-wrap">
          <input
            ref={pwRef}
            type={show ? "text" : "password"}
            id="pw"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Enter a new password"
            autoComplete="new-password"
            required
            disabled={busy}
          />
          <button
            type="button"
            className="pw-toggle"
            aria-pressed={show}
            onClick={() => setShow((s) => !s)}
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>

        <label htmlFor="pw2">Confirm password</label>
        <input
          type={show ? "text" : "password"}
          id="pw2"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          required
          disabled={busy}
        />

        <button type="submit" className="login-btn primary" disabled={busy}>
          {busy ? "Resetting..." : "Reset password"}
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

export default VolunteerResetPassword;
