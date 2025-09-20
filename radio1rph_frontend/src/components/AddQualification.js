import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";

const AddQualification = () => {
  const [volunteer, setVolunteer] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [loadingTrainings, setLoadingTrainings] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const queryParams = new URLSearchParams(location.search);
  const volunteerId = queryParams.get("id");

  useEffect(() => {
    if (volunteerId) {
      fetchVolunteer(volunteerId);
      fetchTrainings();
    }
  }, [volunteerId]);

  const fetchVolunteer = async (id) => {
    try {
      const res = await api.getVolunteerById(id);
      setVolunteer(res.data);
    } catch (error) {
      console.error("Error fetching volunteer:", error);
      alert("Failed to load volunteer data.");
    }
  };

  const fetchTrainings = async () => {
    try {
      const res = await api.getTrainings();
      setTrainings(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error fetching trainings:", error);
      alert("Failed to load trainings.");
    } finally {
      setLoadingTrainings(false);
    }
  };

  const handleFileChange = (file) => {
    setDocumentFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTraining || !issueDate) {
      alert("Please select a training and issue date.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("volunteer_id", volunteer.id);
      formData.append("training_id", selectedTraining);
      formData.append("issue_date", issueDate);
      if (expiryDate) formData.append("expiry_date", expiryDate);
      if (documentFile) formData.append("document_path", documentFile);

      await api.addQualification(formData, true);
      alert("Qualification assigned successfully!");
      navigate(`/volunteers/${volunteer.id}/qualifications`);
    } catch (error) {
      console.error("Error assigning qualification:", error);
      alert("Failed to assign qualification.");
    }
  };

  if (!volunteer) return <p>Loading volunteer data...</p>;
  if (loadingTrainings) return <p>Loading trainings...</p>;

  return (
    <main className="container">
      <h2 tabIndex="0" className="heading">
        Assign Qualification to {volunteer.name}
      </h2>

      <form onSubmit={handleSubmit} className="form">
        {/* Training selection */}
        <div className="form-group">
          <label htmlFor="training">Training:</label>
          <select
            id="training"
            value={selectedTraining}
            onChange={(e) => setSelectedTraining(e.target.value)}
            required
          >
            <option value="">Select a training</option>
            {trainings.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Issue date */}
        <div className="form-group">
          <label htmlFor="issueDate">Issue Date:</label>
          <input
            type="date"
            id="issueDate"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
          />
        </div>

        {/* Expiry date */}
        <div className="form-group">
          <label htmlFor="expiryDate">Expiry Date (optional):</label>
          <input
            type="date"
            id="expiryDate"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>

        {/* Drag-and-drop file upload */}
        <div
          className={`form-group drop-zone ${dragActive ? "active" : ""}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <label htmlFor="document">Certificate / Document (PDF, JPG, PNG):</label>
          <input
            ref={fileInputRef}
            type="file"
            id="document"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileChange(e.target.files[0])}
            style={{ display: "none" }}
          />
          <div
            className="drop-text"
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current.click()}
            onKeyPress={(e) => e.key === "Enter" && fileInputRef.current.click()}
          >
            {documentFile ? documentFile.name : "Drag & drop file here or click to upload"}
          </div>
        </div>

        {/* Preview */}
        {documentFile && (
          <div className="preview">
            {documentFile.type.startsWith("image/") ? (
              <img
                src={URL.createObjectURL(documentFile)}
                alt="Preview"
                className="preview-img"
              />
            ) : (
              <p className="preview-text">{documentFile.name}</p>
            )}
          </div>
        )}

        <button type="submit" className="btn">
          Assign Qualification
        </button>
      </form>

      {/* --- Styles --- */}
      <style jsx>{`
        .container {
          padding: 1rem;
          max-width: 600px;
          margin: 0 auto;
          font-family: Arial, sans-serif;
        }
        .heading {
          font-size: 1.75rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        .form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
        }
        label {
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        select,
        input {
          padding: 0.5rem;
          font-size: 1rem;
          border: 1px solid #ccc;
          border-radius: 6px;
          transition: border-color 0.3s;
        }
        select:focus,
        input:focus {
          outline: none;
          border-color: #004080;
          box-shadow: 0 0 0 2px rgba(0, 64, 128, 0.2);
        }
        .drop-zone {
          padding: 1rem;
          border: 2px dashed #ccc;
          border-radius: 6px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.3s, background-color 0.2s;
        }
        .drop-zone.active {
          border-color: #004080;
          background-color: #f0f8ff;
        }
        .drop-text {
          font-size: 0.95rem;
          color: #333;
        }
        .preview {
          margin-top: 0.5rem;
        }
        .preview-img {
          max-width: 100%;
          max-height: 200px;
          border-radius: 6px;
        }
        .preview-text {
          font-size: 0.9rem;
          color: #004080;
          font-weight: 500;
        }
        .btn {
          padding: 0.75rem 1.25rem;
          background-color: #004080;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: background-color 0.3s;
        }
        .btn:hover,
        .btn:focus {
          background-color: #0066cc;
          outline: none;
        }
        @media (max-width: 480px) {
          .container {
            padding: 0.75rem;
          }
          .heading {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </main>
  );
};

export default AddQualification;
