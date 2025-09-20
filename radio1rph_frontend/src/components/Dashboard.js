import React from "react";
import { Link } from "react-router-dom";
import "./Dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <h1 tabIndex="0">Admin Dashboard</h1>
      <nav aria-label="Main Dashboard Navigation">
        <ul>
          <li>
            <Link to="/volunteers">View Volunteers</Link>
          </li>
          <li>
            <Link to="/volunteer/add">Add New Volunteer</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Dashboard;
