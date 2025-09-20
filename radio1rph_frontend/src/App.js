import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Admin components
import VolunteerList from "./components/VolunteerList";
import VolunteerForm from "./components/VolunteerForm";
import TrainingsList from "./components/TrainingsList";
import TrainingForm from "./components/TrainingForm";
import AdminLogin from "./components/AdminLogin";
import AdminRegister from "./components/AdminRegister";
import Navbar from "./components/Navbar";
import QualificationsList from "./components/QualificationsList";
import AddQualification from "./components/AddQualification";
import VolunteerAttendance from "./components/VolunteerAttendance";
import EOIList from "./components/EOIList"; // <-- NEW component

// Volunteer components
import VolunteerLogin from "./components/VolunteerLogin";
import VolunteerRegister from "./components/VolunteerRegister";
import VolunteerDashboard from "./components/VolunteerDashboard";
import VolunteerProfile from "./components/VolunteerProfile";

function App() {
  const [volunteer, setVolunteer] = useState(null);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);

  // On page load, check if a volunteer or admin is already logged in
  useEffect(() => {
    const storedVolunteer = localStorage.getItem("volunteer");
    if (storedVolunteer) {
      try {
        const parsedVolunteer = JSON.parse(storedVolunteer);
        if (parsedVolunteer?.volunteer_id) setVolunteer(parsedVolunteer);
      } catch (err) {
        console.error("Failed to parse volunteer from localStorage:", err);
        localStorage.removeItem("volunteer"); // clean invalid value
      }
    }

    const storedAdmin = localStorage.getItem("admin");
    if (storedAdmin) {
      try {
        JSON.parse(storedAdmin); // we just check if valid JSON
        setAdminLoggedIn(true);
      } catch (err) {
        console.error("Failed to parse admin from localStorage:", err);
        localStorage.removeItem("admin"); // clean invalid value
      }
    }
  }, []);

  // Volunteer login handler
  const handleVolunteerLogin = (volunteerData) => {
    localStorage.setItem("volunteer", JSON.stringify(volunteerData));
    setVolunteer(volunteerData);
  };

  // Volunteer logout handler
  const handleVolunteerLogout = () => {
    localStorage.removeItem("volunteer");
    setVolunteer(null);
  };

  // Admin login/logout handlers
  const handleAdminLogin = (adminData) => {
    localStorage.setItem("admin", JSON.stringify(adminData));
    setAdminLoggedIn(true);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("admin");
    setAdminLoggedIn(false);
  };

  return (
    <Router>
      {/* Admin Navbar */}
      {adminLoggedIn && <Navbar onLogout={handleAdminLogout} />}

      <Routes>
        {/* -------------------- Admin Routes -------------------- */}
        <Route path="/admin-login" element={<AdminLogin onLogin={handleAdminLogin} />} />
        <Route path="/admin-register" element={<AdminRegister />} />
        <Route
          path="/volunteers"
          element={adminLoggedIn ? <VolunteerList /> : <Navigate to="/admin-login" />}
        />
        <Route
          path="/volunteers/add"
          element={adminLoggedIn ? <VolunteerForm /> : <Navigate to="/admin-login" />}
        />
        <Route
          path="/volunteers/:volunteerId/attendance"
          element={adminLoggedIn ? <VolunteerAttendance /> : <Navigate to="/admin-login" />}
        />
        <Route
          path="/trainings"
          element={adminLoggedIn ? <TrainingsList /> : <Navigate to="/admin-login" />}
        />
        <Route
          path="/trainings/add"
          element={adminLoggedIn ? <TrainingForm /> : <Navigate to="/admin-login" />}
        />
        <Route
          path="/qualifications"
          element={
            adminLoggedIn ? (
              <VolunteerList showQualificationsLink={true} />
            ) : (
              <Navigate to="/admin-login" />
            )
          }
        />
        <Route
          path="/volunteers/:volunteerId/qualifications"
          element={adminLoggedIn ? <QualificationsList /> : <Navigate to="/admin-login" />}
        />
        <Route
          path="/qualifications/add"
          element={adminLoggedIn ? <AddQualification /> : <Navigate to="/admin-login" />}
        />
        <Route
          path="/qualifications/edit"
          element={adminLoggedIn ? <AddQualification /> : <Navigate to="/admin-login" />}
        />

        {/* -------------------- NEW EOI ROUTE -------------------- */}
        <Route
          path="/admin/eois"
          element={adminLoggedIn ? <EOIList /> : <Navigate to="/admin-login" />}
        />

        {/* -------------------- Volunteer Routes -------------------- */}
        <Route
          path="/volunteer-login"
          element={<VolunteerLogin onLogin={handleVolunteerLogin} />}
        />
        <Route path="/volunteer-register" element={<VolunteerRegister />} />
        <Route
          path="/volunteer/dashboard"
          element={
            volunteer ? (
              <VolunteerDashboard volunteer={volunteer} onLogout={handleVolunteerLogout} />
            ) : (
              <Navigate to="/volunteer-login" />
            )
          }
        />
        <Route
          path="/volunteer/profile"
          element={
            volunteer ? (
              <VolunteerProfile volunteer={volunteer} onLogout={handleVolunteerLogout} />
            ) : (
              <Navigate to="/volunteer-login" />
            )
          }
        />

        {/* -------------------- Default Route -------------------- */}
        <Route
          path="*"
          element={
            volunteer ? <Navigate to="/volunteer/dashboard" /> : <Navigate to="/volunteer-login" />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
