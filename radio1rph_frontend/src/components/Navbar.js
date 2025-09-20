// src/components/Navbar.js
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = ({ onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Only show this navbar for admins
  const isAdmin = location.pathname.startsWith("/admin") || location.pathname.startsWith("/volunteers") || location.pathname.startsWith("/trainings") || location.pathname.startsWith("/qualifications");
  if (!isAdmin) return null;

  return (
    <nav
      role="navigation"
      aria-label="Admin Navigation"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        backgroundColor: "#2c3e50",
        color: "#fff",
        padding: "1rem 2rem",
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
      }}
    >
      {/* Header with title + menu button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }} tabIndex="0">
          Admin Dashboard
        </h1>

        <button
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          className="hamburger"
        >
          &#9776;
        </button>
      </div>

      {/* Admin Navigation links */}
      <ul className={`nav-links ${menuOpen ? "open" : ""}`}>
        <li>
          <Link to="/volunteers" style={linkStyle}>
            Volunteers
          </Link>
        </li>
        <li>
          <Link to="/trainings" style={linkStyle}>
            Trainings
          </Link>
        </li>
        <li>
          <Link to="/qualifications" style={linkStyle}>
            Qualifications
          </Link>
        </li>
        <li>
          <Link to="/admin/eois" style={linkStyle}>
            EOIs
          </Link>
        </li>
        <li>
          <button
            onClick={onLogout}
            style={{
              ...linkStyle,
              backgroundColor: "#e74c3c",
              border: "none",
              padding: "0.4rem 0.8rem",
              borderRadius: "5px",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            Logout
          </button>
        </li>
      </ul>

      {/* Inline styles for responsiveness */}
      <style>
        {`
          .hamburger {
            display: none;
            background: none;
            border: none;
            color: #fff;
            font-size: 1.8rem;
            cursor: pointer;
          }

          .nav-links {
            display: flex;
            flex-direction: row;
            list-style: none;
            padding: 0;
            margin-top: 1rem;
            gap: 1.5rem;
            transition: max-height 0.3s ease, opacity 0.3s ease;
          }

          @media (max-width: 768px) {
            .hamburger {
              display: block;
            }

            .nav-links {
              flex-direction: column;
              max-height: 0;
              opacity: 0;
              overflow: hidden;
              transition: max-height 0.3s ease, opacity 0.3s ease;
            }

            .nav-links.open {
              max-height: 500px;
              opacity: 1;
            }
          }

          a:hover, a:focus {
            color: #1abc9c;
            outline: 2px solid #1abc9c;
            outline-offset: 2px;
          }

          button:hover, button:focus {
            opacity: 0.8;
            outline: 2px solid #fff;
            outline-offset: 2px;
          }
        `}
      </style>
    </nav>
  );
};

const linkStyle = {
  textDecoration: "none",
  color: "#fff",
  fontWeight: "bold",
  padding: "0.4rem 0.8rem",
  borderRadius: "5px",
  transition: "0.3s",
};

export default Navbar;
