// src/components/VolunteerDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link, NavLink } from "react-router-dom";
import api from "../services/api";
import "./VolunteerDashboard.css";
import icon from "./icon.png";

const VolunteerDashboard = ({ volunteer: initialVolunteer, onLogout }) => {
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState(initialVolunteer || null);
  const [attendance, setAttendance] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittedEOIs, setSubmittedEOIs] = useState([]);

  useEffect(() => {
    const storedVolunteer =
      initialVolunteer || JSON.parse(localStorage.getItem("volunteer"));

    if (!storedVolunteer || !storedVolunteer.volunteer_id) {
      navigate("/volunteer-login");
      return;
    }

    setVolunteer(storedVolunteer);
    setLoading(true);

    const fetchData = async () => {
      try {
        // Fetch updated volunteer info
        const volunteerResponse = await api.getVolunteerById(
          storedVolunteer.volunteer_id
        );
        setVolunteer(volunteerResponse.data);
        localStorage.setItem("volunteer", JSON.stringify(volunteerResponse.data));

        // Fetch attendance
        const attendanceResponse = await api.getAttendanceByVolunteer(
          storedVolunteer.volunteer_id
        );
        setAttendance(attendanceResponse.data);

        // Fetch qualifications
        const qualificationsResponse = await api.getQualificationsByVolunteer(
          storedVolunteer.volunteer_id
        );
        setQualifications(qualificationsResponse.data);

        // Fetch available trainings
        const trainingsResponse = await api.getTrainings();
        setTrainings(trainingsResponse.data);

        // Fetch volunteer's submitted EOIs
        const eoisResponse = await api.getVolunteerEOIs(
          storedVolunteer.volunteer_id
        );
        setSubmittedEOIs(eoisResponse.data);
      } catch (err) {
        console.error(err);
        setError("Unable to fetch volunteer data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialVolunteer, navigate]);

  // Submit EOI handler
  const handleSubmitEOI = async (trainingId, trainingTitle) => {
    if (!volunteer || !volunteer.volunteer_id) return;

    try {
      const response = await api.submitEOI(volunteer.volunteer_id, trainingId);

      if (response.data?.error) {
        alert(`Error: ${response.data.error}`);
      } else {
        alert(`EOI submitted successfully for "${trainingTitle}"!`);
        // Refresh submitted EOIs list
        const updatedEOIs = await api.getVolunteerEOIs(volunteer.volunteer_id);
        setSubmittedEOIs(updatedEOIs.data);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit EOI. Check console for details.");
    }
  };

  if (!volunteer) return null;
  if (loading) return <p>Loading dashboard...</p>;

  return (
    <div className="dashboard-container">
      <VolunteerNavbar onLogout={onLogout} volunteerId={volunteer?.volunteer_id} />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <img
            src={icon}
            alt="Dashboard Logo"
            style={{ height: "50px", marginBottom: "0.5rem" }}
          />
          <h1 tabIndex="0">Welcome, {volunteer?.name}</h1>
        </header>

        <div className="dashboard-grid">
          <Card title="Personal Info" icon={icon}>
            <p><strong>Email:</strong> {volunteer?.email}</p>
            <p><strong>Volunteer ID:</strong> {volunteer?.volunteer_id}</p>
            <p><strong>Phone:</strong> {volunteer?.phone || "Not provided"}</p>
          </Card>

          <Card title="Attendance History" icon={icon}>
            {error && <p className="error">{error}</p>}
            {attendance.length === 0 ? (
              <p>No attendance records found.</p>
            ) : (
              <ul>
                {attendance.map(item => (
                  <li key={item.id}>
                    Clock-in: {item.clock_in || "N/A"}, Clock-out: {item.clock_out || "N/A"}
                  </li>
                ))}
              </ul>
            )}
            <Link to={`/volunteers/${volunteer?.volunteer_id}/attendance`} className="link-button">
              View Full Attendance
            </Link>
          </Card>

          <Card title="Qualifications / Courses" icon={icon}>
            {qualifications.length === 0 ? (
              <p>No qualifications yet.</p>
            ) : (
              <ul>
                {qualifications.map(q => (
                  <li key={q.id}>
                    Training ID: {q.training_id}, Issued: {q.issue_date || "N/A"}, Expiry: {q.expiry_date || "N/A"}
                  </li>
                ))}
              </ul>
            )}
            <Link to={`/volunteers/${volunteer?.volunteer_id}/qualifications`} className="link-button">
              View All Qualifications
            </Link>
          </Card>

          <Card title="Available Trainings / Courses" icon={icon}>
            {trainings.length === 0 ? (
              <p>No trainings available.</p>
            ) : (
              <ul>
                {trainings.map(t => (
                  <li key={t.id}>
                    {t.title} ({t.type}) - {t.start_date || "N/A"} to {t.end_date || "N/A"}
                    <button
                      style={{ marginLeft: "0.5rem", padding: "0.2rem 0.5rem", cursor: "pointer" }}
                      onClick={() => handleSubmitEOI(t.id, t.title)}
                      disabled={submittedEOIs.some(e => e.training_id === t.id)}
                    >
                      {submittedEOIs.some(e => e.training_id === t.id) ? "EOI Submitted" : "Submit EOI"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

const Card = ({ title, children, icon }) => (
  <section className="card" tabIndex="0">
    <h2>
      {icon && <img src={icon} alt="Card Icon" style={{ height: "24px", marginRight: "0.5rem" }} />}
      {title}
    </h2>
    <div className="card-content">{children}</div>
  </section>
);

const VolunteerNavbar = ({ onLogout, volunteerId }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar" aria-label="Volunteer Navigation">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <img src={icon} alt="Logo" style={{ height: "40px" }} />
          Volunteer Dashboard
        </div>
        <button
          className="navbar-toggle"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
        <ul className={`navbar-links ${menuOpen ? "open" : ""}`}>
          <li><NavLink to="/volunteer/dashboard" className="navlink">Dashboard</NavLink></li>
          <li><NavLink to={volunteerId ? `/volunteers/${volunteerId}/attendance` : "#"} className="navlink">Attendance</NavLink></li>
          <li><NavLink to={volunteerId ? `/volunteers/${volunteerId}/qualifications` : "#"} className="navlink">Qualifications</NavLink></li>
          <li><NavLink to="/trainings" className="navlink">Trainings / Submit EOI</NavLink></li>
          <li><NavLink to="/volunteer/profile" className="navlink">My Profile</NavLink></li>
          <li><button onClick={onLogout} className="logout-button">Logout</button></li>
        </ul>
      </div>
    </nav>
  );
};

export default VolunteerDashboard;
