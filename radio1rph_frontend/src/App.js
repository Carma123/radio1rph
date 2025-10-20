// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import api from "./services/api";

// Admin components
import MyEOIs from "./components/MyEOIs";
import VolunteerList from "./components/VolunteerList";
import VolunteerForm from "./components/VolunteerForm";
import TrainingsList from "./components/TrainingsList";
import TrainingForm from "./components/TrainingForm";
import AdminLogin from "./components/AdminLogin";
import AdminRegister from "./components/AdminRegister";
import Navbar from "./components/Navbar";
import QualificationsList from "./components/QualificationsList";
import AddQualification from "./components/AddQualification";
import VolunteerAttendance from "./components/VolunteerAttendance"; // admin view (everyone)
import MyAttendance from "./components/MyAttendance";               // volunteer self-only view
import EOIList from "./components/EOIList";
import AdminCoursePanel from "./components/AdminCoursePanel";
import TrainingResultsAdmin from "./components/TrainingResultsAdmin";

// Admin Reminders page
import AdminReminders from "./components/AdminReminders";

// Admin password reset
import AdminResetPassword from "./components/AdminResetPassword";

// Volunteer components
import VolunteerLogin from "./components/VolunteerLogin";
import VolunteerRegister from "./components/VolunteerRegister";
import VolunteerDashboard from "./components/VolunteerDashboard";
import VolunteerProfile from "./components/VolunteerProfile";

// Volunteer password reset (forgot + reset)
import VolunteerForgotPassword from "./components/VolunteerForgotPassword";
import VolunteerResetPassword from "./components/VolunteerResetPassword";

// Volunteer add/edit form
import VolunteerAddQualification from "./components/VolunteerAddQualification";

/** Safely parse JSON from localStorage */
const safeParse = (raw, fallback = null) => {
  try {
    if (!raw || raw === "undefined" || raw === "null") return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

function App() {
  const [volunteer, setVolunteer] = useState(null);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);

  // Rehydrate axios Authorization header on first load (in case of refresh)
  useEffect(() => {
    api.auth.setFromStorage();
  }, []);

  // Boot-up: detect existing sessions
  useEffect(() => {
    // Volunteer
    const v = safeParse(localStorage.getItem("volunteer"));
    if (v?.volunteer_id) {
      setVolunteer(v);
    } else {
      localStorage.removeItem("volunteer");
      setVolunteer(null);
    }

    // Admin: require both an admin object and an access token
    const a = safeParse(localStorage.getItem("admin"));
    const access = localStorage.getItem("access_token");
    setAdminLoggedIn(!!a && !!access);
  }, []);

  // Keep state in sync across tabs (and when tokens are cleared by refresh failures)
  useEffect(() => {
    const onStorage = (e) => {
      if (["admin", "access_token", "refresh_token"].includes(e.key)) {
        const a = safeParse(localStorage.getItem("admin"));
        const access = localStorage.getItem("access_token");
        setAdminLoggedIn(!!a && !!access);
      }
      if (e.key === "volunteer") {
        const v = safeParse(localStorage.getItem("volunteer"));
        setVolunteer(v?.volunteer_id ? v : null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Volunteer login/logout
  const handleVolunteerLogin = (volunteerData) => {
    const normalized = {
      volunteer_id: volunteerData.volunteer_id,
      name: volunteerData.name,
      email: volunteerData.email,
      emergency_contact: volunteerData.emergency_contact ?? null,
    };
    localStorage.setItem("volunteer", JSON.stringify(normalized));
    setVolunteer(normalized);
  };

  const handleVolunteerLogout = () => {
    // NOTE: We do NOT clear JWT tokens here to avoid logging out an active admin.
    localStorage.removeItem("volunteer");
    setVolunteer(null);
  };

  // Admin login/logout
  const handleAdminLogin = () => {
    setAdminLoggedIn(true);
  };

  const handleAdminLogout = () => {
    api.auth.logout(); // clears tokens + removes "admin"
    setAdminLoggedIn(false);
  };

  const AdminGuard = (component) =>
    adminLoggedIn ? component : <Navigate to="/admin-login" />;

  const VolunteerGuard = (component) =>
    volunteer ? component : <Navigate to="/volunteer-login" />;

  return (
    <Router>
      {/* Admin Navbar (only when admin is logged in) */}
      {adminLoggedIn && <Navbar onLogout={handleAdminLogout} />}

      <Routes>
        {/* -------------------- Admin Auth Routes -------------------- */}
        <Route path="/admin-login" element={<AdminLogin onLogin={handleAdminLogin} />} />
        <Route path="/admin-register" element={<AdminRegister />} />

        {/* Admin password reset (no separate "forgot" page) */}
        <Route path="/admin-reset-password" element={<AdminResetPassword />} />

        {/* -------------------- Admin Protected Routes -------------------- */}
        <Route path="/volunteers" element={AdminGuard(<VolunteerList />)} />
        <Route path="/volunteers/add" element={AdminGuard(<VolunteerForm />)} />

        {/* Admin attendance console (everyone) */}
        <Route path="/admin/attendance" element={AdminGuard(<VolunteerAttendance />)} />

        {/* Mixed attendance route:
            - Admins: show admin console (everyone)
            - Volunteers: show self-only page */}
        <Route
          path="/volunteers/:volunteerId/attendance"
          element={
            adminLoggedIn
              ? AdminGuard(<VolunteerAttendance />)
              : VolunteerGuard(<MyAttendance />)
          }
        />

        {/* Trainings (admin) */}
        <Route path="/trainings" element={AdminGuard(<TrainingsList />)} />
        <Route path="/trainings/add" element={AdminGuard(<TrainingForm />)} />

        {/* Admin Reminders */}
        <Route path="/admin/reminders" element={AdminGuard(<AdminReminders />)} />

        {/* Qualifications entry point: list volunteers with link to their quals (admin area) */}
        <Route
          path="/qualifications"
          element={AdminGuard(<VolunteerList showQualificationsLink={true} />)}
        />

        {/* View a volunteer's qualifications (admin or that volunteer) */}
        <Route
          path="/volunteers/:volunteerId/qualifications"
          element={
            adminLoggedIn
              ? AdminGuard(<QualificationsList />)
              : VolunteerGuard(<QualificationsList />)
          }
        />

        {/* Admin-only quick add/edit (back-compat) */}
        <Route path="/qualifications/add" element={AdminGuard(<AddQualification />)} />
        <Route path="/qualifications/edit" element={AdminGuard(<AddQualification />)} />

        {/* Volunteer-friendly Add/Edit (no id in URL, volunteers only) */}
        <Route
          path="/volunteer/qualifications/add"
          element={VolunteerGuard(<VolunteerAddQualification />)}
        />

        {/* Dual route: if admin hits it, show admin form; if volunteer hits it, show volunteer form */}
        <Route
          path="/volunteers/:volunteerId/qualifications/add"
          element={
            adminLoggedIn
              ? AdminGuard(<AddQualification />)
              : VolunteerGuard(<VolunteerAddQualification />)
          }
        />

        {/* EOIs (Admin) */}
        <Route path="/admin/eois" element={AdminGuard(<EOIList />)} />

        {/* Admin Course Panel */}
        <Route
          path="/admin/trainings/:trainingId/panel"
          element={AdminGuard(<AdminCoursePanel />)}
        />

        {/* Training Results (Admin) */}
        <Route
          path="/admin/trainings/:trainingId/results"
          element={AdminGuard(<TrainingResultsAdmin />)}
        />
        <Route
          path="/admin/training-results"
          element={AdminGuard(<TrainingResultsAdmin />)}
        />

        {/* -------------------- Volunteer Routes -------------------- */}
        <Route
          path="/volunteer-login"
          element={<VolunteerLogin onLogin={handleVolunteerLogin} />}
        />
        <Route path="/volunteer-register" element={<VolunteerRegister />} />

        {/* Volunteer password reset flow */}
        <Route path="/volunteer-forgot-password" element={<VolunteerForgotPassword />} />
        <Route path="/volunteer-reset-password" element={<VolunteerResetPassword />} />

        <Route
          path="/volunteer/dashboard"
          element={VolunteerGuard(
            <VolunteerDashboard volunteer={volunteer} onLogout={handleVolunteerLogout} />
          )}
        />
        <Route
          path="/volunteer/profile"
          element={VolunteerGuard(
            <VolunteerProfile volunteer={volunteer} onLogout={handleVolunteerLogout} />
          )}
        />
        <Route path="/volunteer/my-eois" element={VolunteerGuard(<MyEOIs />)} />

        {/* -------------------- Smart landings -------------------- */}
        <Route
          path="/"
          element={
            adminLoggedIn ? (
              <Navigate to="/admin/reminders" />
            ) : volunteer ? (
              <Navigate to="/volunteer/dashboard" />
            ) : (
              <Navigate to="/volunteer-login" />
            )
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
