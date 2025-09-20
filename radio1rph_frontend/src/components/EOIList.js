// src/components/EOIList.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./EOIList.css"; // Import the CSS file

const EOIList = () => {
  const [eois, setEois] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all pending EOIs
  const fetchEOIs = async () => {
    try {
      const res = await axios.get("http://localhost:5000/eois/pending");
      setEois(res.data);
    } catch (err) {
      console.error("Error fetching EOIs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEOIs();
  }, []);

  // Approve EOI
  const approveEOI = async (id) => {
    try {
      await axios.put(`http://localhost:5000/eois/${id}/approve`);
      fetchEOIs();
    } catch (err) {
      console.error("Error approving EOI:", err);
    }
  };

  // Reject EOI
  const rejectEOI = async (id) => {
    try {
      await axios.put(`http://localhost:5000/eois/${id}/reject`);
      fetchEOIs();
    } catch (err) {
      console.error("Error rejecting EOI:", err);
    }
  };

  if (loading) return <p className="loading-text">Loading EOIs...</p>;

  return (
    <div className="eoi-container">
      <h2 className="eoi-title">Expression of Interest (EOI) List</h2>

      {eois.length === 0 ? (
        <p className="no-data">No EOIs found.</p>
      ) : (
        <div className="table-wrapper">
          <table className="eoi-table">
            <thead>
              <tr>
                <th>Volunteer Name</th>
                <th>Training Title</th>
                <th>Submitted At</th>
                <th>Status</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {eois.map((eoi) => (
                <tr key={eoi.id}>
                  <td>{eoi.volunteer_name}</td>
                  <td>{eoi.training_title}</td>
                  <td>{new Date(eoi.submitted_at).toLocaleString()}</td>
                  <td className={`status ${eoi.status}`}>{eoi.status}</td>
                  <td>
                    {eoi.status === "pending" ? (
                      <div className="action-buttons">
                        <button
                          onClick={() => approveEOI(eoi.id)}
                          className="btn btn-approve"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectEOI(eoi.id)}
                          className="btn btn-reject"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="no-actions">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EOIList;
