// src/components/VolunteerForm.js
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";

/* ---------- helpers ---------- */
function stripEmpty(obj) {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    out[k] = typeof v === "string" ? v.trim() : v;
  });
  return out;
}

// Keep digits only for comparison; treat +61xxx and 0xxx equivalently if you want:
// Here we simply strip everything non-digit to be consistent client-side.
function normalizePhone(p) {
  if (!p) return "";
  return String(p).replace(/\D+/g, "");
}

/* ---------- component ---------- */
const VolunteerForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editingId = searchParams.get("id");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("active");
  const [trainingGoals, setTrainingGoals] = useState("");

  // CREATE-only
  const [password, setPassword] = useState("");

  // Flattened emergency contact fields (avoid nested dict to DB)
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecRelation, setEcRelation] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [checkingPhone, setCheckingPhone] = useState(false);

  // Query existing volunteers once per check for uniqueness.
  // We’re not caching globally — keeps it simple and fresh.
  const checkPhoneUnique = async (rawPhone) => {
    if (!rawPhone) {
      setPhoneError("");
      return true;
    }
    const target = normalizePhone(rawPhone);
    if (!target) {
      setPhoneError("");
      return true;
    }
    // During edit, we’d ideally skip if phone belongs to the same volunteer,
    // but this form currently doesn’t pre-load the record, so we only enforce
    // uniqueness on CREATE (editingId == null). You can adapt as needed.
    if (editingId) {
      setPhoneError("");
      return true;
    }

    setCheckingPhone(true);
    try {
      const res = await api.getVolunteers(); // GET /volunteers (public)
      const list = Array.isArray(res.data) ? res.data : [];
      const dup = list.find((v) => normalizePhone(v.phone) === target);
      if (dup) {
        setPhoneError(
          "This phone number is already registered. Please use a different number."
        );
        return false;
      }
      setPhoneError("");
      return true;
    } catch (e) {
      // If the check fails (offline/permissions), don’t block submission here;
      // backend should still enforce uniqueness if configured.
      console.warn("Phone uniqueness check failed:", e);
      setPhoneError("");
      return true;
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !email.trim()) {
      setError("Please provide name and email.");
      return;
    }

    // run phone check again on submit
    const uniqueOk = await checkPhoneUnique(phone);
    if (!uniqueOk) return;

    try {
      if (editingId) {
        if (!api.updateVolunteer) {
          throw new Error(
            "Update endpoint is not wired on the client (api.updateVolunteer is missing)."
          );
        }
        const payload = stripEmpty({
          name,
          email,
          phone,
          status, // remove if backend rejects it
          training_goals: trainingGoals,
          emergency_contact_name: ecName,
          emergency_contact_phone: ecPhone,
          emergency_contact_relationship: ecRelation,
        });
        await api.updateVolunteer(editingId, payload);
        setSuccess("Volunteer updated successfully!");
      } else {
        if (!password.trim()) {
          setError("Please set a password for the new volunteer.");
          return;
        }
        const payload = stripEmpty({
          name,
          email,
          password,
          phone,
          status, // remove if backend rejects it
          training_goals: trainingGoals,
          emergency_contact_name: ecName,
          emergency_contact_phone: ecPhone,
          emergency_contact_relationship: ecRelation,
        });
        await api.registerVolunteer(payload);
        setSuccess("Volunteer added successfully!");
      }

      setTimeout(() => navigate("/volunteers"), 1200);
    } catch (err) {
      const data = err?.response?.data;
      const serverMsg =
        (typeof data === "string" && data) ||
        data?.error ||
        data?.message ||
        data?.detail ||
        err?.message ||
        "Failed to save volunteer.";
      setError(serverMsg);

      // If backend tells us phone is duplicate, surface a friendly inline hint too.
      if (String(serverMsg).toLowerCase().includes("phone")) {
        setPhoneError("This phone number is already registered.");
      }
      console.error("Register/Update volunteer error:", err?.response || err);
    }
  };

  return (
    <main style={{ maxWidth: "700px", margin: "2rem auto", padding: "1.5rem" }}>
      <h1 tabIndex="0" style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
        {editingId ? "Edit Volunteer" : "Add Volunteer"}
      </h1>

      {error && (
        <p style={{ color: "#b91c1c", marginBottom: "1rem" }} role="alert" aria-live="polite">
          {error}
        </p>
      )}
      {success && (
        <p style={{ color: "green", marginBottom: "1rem" }} role="status" aria-live="polite">
          {success}
        </p>
      )}

      <form onSubmit={handleSubmit} aria-label={editingId ? "Edit Volunteer Form" : "Add Volunteer Form"}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="name" style={{ fontWeight: 600 }}>Name:</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-required="true"
            placeholder="Full Name"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", border: "1px solid #888", borderRadius: "4px" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="email" style={{ fontWeight: 600 }}>Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-required="true"
            placeholder="Email Address"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", border: "1px solid #888", borderRadius: "4px" }}
          />
        </div>

        {!editingId && (
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="password" style={{ fontWeight: 600 }}>Password:</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              placeholder="Set a password"
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", border: "1px solid #888", borderRadius: "4px" }}
            />
            <small style={{ color: "#555" }}>Min 8 chars recommended.</small>
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="phone" style={{ fontWeight: 600 }}>Phone:</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => checkPhoneUnique(phone)}
            placeholder="Phone Number"
            aria-invalid={phoneError ? "true" : "false"}
            aria-describedby={phoneError ? "phone-error" : undefined}
            style={{
              width: "100%",
              padding: "0.5rem",
              marginTop: "0.25rem",
              border: `1px solid ${phoneError ? "#b91c1c" : "#888"}`,
              borderRadius: "4px",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 24 }}>
            {checkingPhone && (
              <span role="status" aria-live="polite" style={{ color: "#555", fontSize: 14 }}>
                Checking number…
              </span>
            )}
            {phoneError && (
              <span id="phone-error" role="alert" style={{ color: "#b91c1c", fontSize: 14 }}>
                {phoneError}
              </span>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="status" style={{ fontWeight: 600 }}>Status:</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", border: "1px solid #888", borderRadius: "4px" }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="trainingGoals" style={{ fontWeight: 600 }}>Training Goals:</label>
          <textarea
            id="trainingGoals"
            value={trainingGoals}
            onChange={(e) => setTrainingGoals(e.target.value)}
            placeholder="Enter training goals"
            rows="4"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", border: "1px solid #888", borderRadius: "4px" }}
          />
        </div>

        {/* Emergency contact (flattened) */}
        <fieldset style={{ border: "1px solid #ddd", borderRadius: 6, padding: "1rem", marginTop: "1rem" }}>
          <legend style={{ padding: "0 .5rem", color: "#444" }}>Emergency Contact (optional)</legend>

          <div style={{ marginBottom: "0.75rem" }}>
            <label htmlFor="ecName" style={{ fontWeight: 600 }}>Name:</label>
            <input
              id="ecName"
              type="text"
              value={ecName}
              onChange={(e) => setEcName(e.target.value)}
              placeholder="Emergency contact name"
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", border: "1px solid #888", borderRadius: "4px" }}
            />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label htmlFor="ecPhone" style={{ fontWeight: 600 }}>Phone:</label>
            <input
              id="ecPhone"
              type="tel"
              value={ecPhone}
              onChange={(e) => setEcPhone(e.target.value)}
              placeholder="Emergency contact phone"
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", border: "1px solid #888", borderRadius: "4px" }}
            />
          </div>

          <div style={{ marginBottom: "0.25rem" }}>
            <label htmlFor="ecRelation" style={{ fontWeight: 600 }}>Relationship:</label>
            <input
              id="ecRelation"
              type="text"
              value={ecRelation}
              onChange={(e) => setEcRelation(e.target.value)}
              placeholder="e.g., Spouse, Parent, Friend"
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", border: "1px solid #888", borderRadius: "4px" }}
            />
          </div>
        </fieldset>

        <button
          type="submit"
          style={{
            marginTop: "1.25rem",
            padding: "0.75rem 1.25rem",
            backgroundColor: "#004080",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
          onFocus={(e) => (e.target.style.outline = "3px solid #ffbf47")}
          onBlur={(e) => (e.target.style.outline = "none")}
          disabled={!!phoneError || checkingPhone}
          aria-disabled={!!phoneError || checkingPhone}
        >
          {editingId ? "Update Volunteer" : "Add Volunteer"}
        </button>
      </form>
    </main>
  );
};

export default VolunteerForm;
