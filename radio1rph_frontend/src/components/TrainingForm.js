// src/components/TrainingForm.js
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../services/api";

const TrainingForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const trainingId = queryParams.get("id");

  // Core fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState("internal");

  // Sprint 2 fields
  const [provider, setProvider] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [accreditation, setAccreditation] = useState("in_house"); // in_house | external_accredited | external_non_accredited
  const [deliveryMode, setDeliveryMode] = useState("in_person"); // in_person | online | hybrid
  const [venue, setVenue] = useState("");
  const [cost, setCost] = useState(""); // string; backend parses to decimal
  const [prerequisites, setPrerequisites] = useState("");
  const [capacity, setCapacity] = useState(""); // string; backend parses to int/None
  const [eoiCloseDate, setEoiCloseDate] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(!!trainingId);

  // Helpful computed flags/messages
  const dateValidationMsg = useMemo(() => {
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (e < s) return "End date cannot be before start date.";
    }
    return "";
  }, [startDate, endDate]);

  useEffect(() => {
    if (!trainingId) return;

    (async () => {
      try {
        const res = await api.getTrainingById(trainingId);
        const t = res.data || {};
        setTitle(t.title || "");
        setDescription(t.description || "");
        setStartDate(t.start_date || "");
        setEndDate(t.end_date || "");
        setType(t.type || "internal");

        // Sprint 2
        setProvider(t.provider || "");
        setTrainerName(t.trainer_name || "");
        setAccreditation(t.accreditation || "in_house");
        setDeliveryMode(t.delivery_mode || "in_person");
        setVenue(t.venue || "");
        setCost(t.cost ?? ""); // server returns string or null
        setPrerequisites(t.prerequisites || "");
        setCapacity(
          t.capacity === null || t.capacity === undefined ? "" : String(t.capacity)
        );
        setEoiCloseDate(t.eoi_close_date || "");
      } catch (e) {
        setError("Failed to load training data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [trainingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Basic validations
    if (!title.trim()) {
      setError("Please provide a title for the training.");
      return;
    }
    if (dateValidationMsg) {
      setError(dateValidationMsg);
      return;
    }
    if (cost && isNaN(Number(cost))) {
      setError("Cost must be a valid number (or leave it blank).");
      return;
    }
    if (capacity !== "" && (!/^\d+$/.test(capacity) || Number(capacity) < 0)) {
      setError("Capacity must be a non-negative integer (or leave it blank).");
      return;
    }

    const payload = {
      title,
      description: description || null,
      start_date: startDate || null,
      end_date: endDate || null,
      type,

      // Sprint 2 fields
      provider: provider || null,
      trainer_name: trainerName || null,
      accreditation, // enum expected by backend
      delivery_mode: deliveryMode, // enum expected by backend
      venue: venue || null,
      cost: cost === "" ? null : cost, // backend parses Decimal
      prerequisites: prerequisites || null,
      capacity: capacity === "" ? null : Number(capacity),
      eoi_close_date: eoiCloseDate || null,
    };

    try {
      if (trainingId) {
        await api.updateTraining(trainingId, payload);
        setSuccess("Training updated successfully!");
      } else {
        await api.addTraining(payload);
        setSuccess("Training added successfully!");
      }
      // Small pause so users can read the success message
      setTimeout(() => navigate("/trainings"), 800);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to save training.";
      setError(msg);
    }
  };

  if (loading) {
    return <p style={{ padding: "1rem" }}>Loading training...</p>;
  }

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "2rem auto",
        padding: "1.5rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
        boxShadow: "0 0 10px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header + shortcuts */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ textAlign: "left", marginBottom: "1rem" }}>
          <h1 tabIndex="0" style={{ margin: 0, fontSize: "1.75rem" }}>
            {trainingId ? "Edit Training" : "Add Training"}
          </h1>
          <p style={{ color: "#555", marginTop: "0.25rem" }}>
            Fill in the details below. Fields marked * are required.
          </p>
        </div>

        {trainingId && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              to={`/admin/trainings/${trainingId}/panel`}
              className="btn btn-sky btn-sm"
              title="Open Course Panel"
              aria-label="Open Course Panel"
              style={btnSky}
            >
              📊 Course Panel
            </Link>
            <Link
              to={`/admin/trainings/${trainingId}/panel?tab=results`}
              className="btn btn-primary btn-sm"
              title="Record / manage results for this course"
              aria-label="Record results"
              style={btnPrimary}
            >
              🧪 Record Results
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            background: "#fff4f4",
            color: "#a40000",
            border: "1px solid #f1c0c0",
            padding: "0.75rem",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          aria-live="polite"
          style={{
            background: "#f0fff4",
            color: "#0f5132",
            border: "1px solid #badbcc",
            padding: "0.75rem",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}
        >
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        aria-label="Training Form"
        style={{ display: "grid", gap: "1rem" }}
      >
        {/* Title & Type */}
        <div style={rowStyle}>
          <div style={colStyle}>
            <label htmlFor="title" style={labelStyle}>
              Title*:
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              aria-required="true"
              placeholder="Training title"
              style={inputStyle}
            />
          </div>

          <div style={colStyle}>
            <label htmlFor="type" style={labelStyle}>
              Type:
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={inputStyle}
            >
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>
          </div>
        </div>

        {/* Dates */}
        <div style={rowStyle}>
          <div style={colStyle}>
            <label htmlFor="startDate" style={labelStyle}>
              Start Date:
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={colStyle}>
            <label htmlFor="endDate" style={labelStyle}>
              End Date:
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />
            {dateValidationMsg && (
              <div style={hintErrorStyle}>{dateValidationMsg}</div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" style={labelStyle}>
            Description:
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Training description"
            style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
          />
        </div>

        {/* Sprint 2 — Provider/Trainer */}
        <div style={rowStyle}>
          <div style={colStyle}>
            <label htmlFor="provider" style={labelStyle}>
              Provider:
            </label>
            <input
              id="provider"
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g., Radio 1RPH, TAFE, etc."
              style={inputStyle}
            />
          </div>

          <div style={colStyle}>
            <label htmlFor="trainerName" style={labelStyle}>
              Trainer name:
            </label>
            <input
              id="trainerName"
              type="text"
              value={trainerName}
              onChange={(e) => setTrainerName(e.target.value)}
              placeholder="e.g., Jane Doe"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Accreditation / DeliveryMode */}
        <div style={rowStyle}>
          <div style={colStyle}>
            <label htmlFor="accreditation" style={labelStyle}>
              Accreditation:
            </label>
            <select
              id="accreditation"
              value={accreditation}
              onChange={(e) => setAccreditation(e.target.value)}
              style={inputStyle}
            >
              <option value="in_house">In-house</option>
              <option value="external_accredited">External (Accredited)</option>
              <option value="external_non_accredited">External (Non-accredited)</option>
            </select>
          </div>

          <div style={colStyle}>
            <label htmlFor="deliveryMode" style={labelStyle}>
              Delivery mode:
            </label>
            <select
              id="deliveryMode"
              value={deliveryMode}
              onChange={(e) => setDeliveryMode(e.target.value)}
              style={inputStyle}
            >
              <option value="in_person">In person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        {/* Venue / Cost */}
        <div style={rowStyle}>
          <div style={colStyle}>
            <label htmlFor="venue" style={labelStyle}>
              Venue:
            </label>
            <input
              id="venue"
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Location if in-person"
              style={inputStyle}
            />
          </div>

          <div style={colStyle}>
            <label htmlFor="cost" style={labelStyle}>
              Cost:
            </label>
            <input
              id="cost"
              type="text"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g., 0, 25.00"
              style={inputStyle}
              aria-describedby="cost-help"
            />
            <div id="cost-help" style={hintStyle}>
              Leave blank if free. Use numbers only (e.g., 0 or 25.00).
            </div>
          </div>
        </div>

        {/* Capacity / EOI Close Date */}
        <div style={rowStyle}>
          <div style={colStyle}>
            <label htmlFor="capacity" style={labelStyle}>
              Capacity:
            </label>
            <input
              id="capacity"
              type="number"
              min="0"
              step="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Leave blank for unlimited"
              style={inputStyle}
              aria-describedby="capacity-help"
            />
            <div id="capacity-help" style={hintStyle}>
              Number of approved places. Leave blank for unlimited.
            </div>
          </div>

          <div style={colStyle}>
            <label htmlFor="eoiCloseDate" style={labelStyle}>
              EOI close date:
            </label>
            <input
              id="eoiCloseDate"
              type="date"
              value={eoiCloseDate}
              onChange={(e) => setEoiCloseDate(e.target.value)}
              style={inputStyle}
              aria-describedby="eoi-help"
            />
            <div id="eoi-help" style={hintStyle}>
              Volunteers can’t submit EOIs after this date.
            </div>
          </div>
        </div>

        {/* Prerequisites */}
        <div>
          <label htmlFor="prereq" style={labelStyle}>
            Prerequisites:
          </label>
          <textarea
            id="prereq"
            value={prerequisites}
            onChange={(e) => setPrerequisites(e.target.value)}
            placeholder="List any prerequisites or prior qualifications"
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
          <button type="submit" style={primaryBtnStyle}>
            {trainingId ? "Update Training" : "Add Training"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/trainings")}
            style={secondaryBtnStyle}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

/* ---------- Inline styles (no <style jsx>) ---------- */
const rowStyle = {
  display: "flex",
  gap: "1rem",
  flexWrap: "wrap",
};
const colStyle = {
  flex: 1,
  minWidth: "240px",
};
const labelStyle = {
  display: "block",
  marginBottom: "0.35rem",
  fontWeight: 600,
};
const inputStyle = {
  width: "100%",
  padding: "0.6rem 0.7rem",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontSize: "1rem",
  outline: "none",
};
const hintStyle = {
  marginTop: "0.25rem",
  fontSize: "0.85rem",
  color: "#555",
};
const hintErrorStyle = {
  marginTop: "0.25rem",
  fontSize: "0.9rem",
  color: "#a40000",
};
const primaryBtnStyle = {
  backgroundColor: "#004080",
  color: "white",
  border: "none",
  padding: "0.75rem 1rem",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: 600,
};
const secondaryBtnStyle = {
  backgroundColor: "#e9ecef",
  color: "#111",
  border: "1px solid #d0d7de",
  padding: "0.75rem 1rem",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: 600,
};

/* Small button styles to match existing palette */
const btnPrimary = {
  background: "#2563eb",
  color: "#fff",
  border: "1px solid transparent",
  padding: ".5rem .75rem",
  borderRadius: 8,
  fontWeight: 800,
  textDecoration: "none",
};
const btnSky = {
  background: "#bfdbfe",
  color: "#1e3a8a",
  border: "1px solid #60a5fa",
  padding: ".5rem .75rem",
  borderRadius: 8,
  fontWeight: 800,
  textDecoration: "none",
};

export default TrainingForm;
