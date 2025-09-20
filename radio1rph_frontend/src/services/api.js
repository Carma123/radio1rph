import axios from "axios";

// --------------------------
// Base URL for Flask backend
// --------------------------
const API = axios.create({
  baseURL: "http://127.0.0.1:5000",
  headers: {
    "Content-Type": "application/json",
  },
});

// --------------------------
// VOLUNTEERS
// --------------------------
export const getVolunteers = () => API.get("/volunteers");
export const getVolunteerById = (id) => API.get(`/volunteers/${id}`);
export const addVolunteer = (data) => API.post("/volunteers", data);
export const updateVolunteer = (id, data) => API.put(`/volunteers/${id}`, data);
export const deleteVolunteer = (id) => API.delete(`/volunteers/${id}`);

// --------------------------
// TRAININGS
// --------------------------
export const getTrainings = () => API.get("/trainings");
export const getTrainingById = (id) => API.get(`/trainings/${id}`);
export const addTraining = (data) =>
  API.post("/trainings", {
    ...data,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
  });
export const updateTraining = (id, data) =>
  API.put(`/trainings/${id}`, {
    ...data,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
  });
export const deleteTraining = (id) => API.delete(`/trainings/${id}`);

// --------------------------
// ATTENDANCE
// --------------------------
export const getAttendance = () => API.get("/attendance");
export const getAttendanceByVolunteer = (volunteerId) =>
  API.get(`/attendance/volunteer/${volunteerId}`);
export const getTodayAttendanceByVolunteer = (volunteerId) =>
  API.get(`/attendance/volunteer/${volunteerId}/today`);
export const getTodayAttendanceAll = () => API.get("/attendance/today");
export const addAttendance = (data) =>
  API.post("/attendance", {
    ...data,
    clock_in: data.clock_in || null,
    clock_out: data.clock_out || null,
  });
export const clockIn = (volunteerId) =>
  API.post(`/attendance/clockin`, { volunteer_id: volunteerId });
export const clockOut = (volunteerId) =>
  API.post(`/attendance/clockout`, { volunteer_id: volunteerId });
export const updateAttendance = (id, data) =>
  API.put(`/attendance/${id}`, {
    ...data,
    clock_in: data.clock_in || null,
    clock_out: data.clock_out || null,
  });
export const deleteAttendance = (id) => API.delete(`/attendance`);
export const deleteAllAttendance = () => API.delete("/attendance");

// --------------------------
// QUALIFICATIONS
// --------------------------
export const getQualifications = () => API.get("/qualifications");
export const getQualificationsByVolunteer = (volunteerId) =>
  API.get(`/qualifications/volunteer/${volunteerId}`);
export const addQualification = (data, isFormData = false) => {
  if (isFormData) {
    return axios.post(`${API.defaults.baseURL}/qualifications`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
  return API.post("/qualifications", {
    ...data,
    issue_date: data.issue_date || null,
    expiry_date: data.expiry_date || null,
    document_path: data.document_path || null,
  });
};
export const updateQualification = (id, data) =>
  API.put(`/qualifications/${id}`, {
    ...data,
    issue_date: data.issue_date || null,
    expiry_date: data.expiry_date || null,
    document_path: data.document_path || null,
  });
export const deleteQualification = (id) => API.delete(`/qualifications/${id}`);

// --------------------------
// VOLUNTEER AUTH
// --------------------------
export const registerVolunteer = (data) => API.post("/volunteer/register", data);
export const loginVolunteer = (data) => API.post("/volunteer/login", data);
export const updateVolunteerProfile = (id, data) => API.put(`/volunteers/${id}`, data);

// --------------------------
// ADMIN
// --------------------------
export const registerAdmin = (data) => API.post("/admin/register", data);
export const loginAdmin = (data) => API.post("/admin/login", data);

// --------------------------
// EOIs (Expression of Interest)
// --------------------------
// Correct endpoint: /eois/submit for submitting
export const submitEOI = (volunteerId, trainingId) =>
  API.post(`/eois/submit`, { volunteer_id: volunteerId, training_id: trainingId });

// Correct endpoint: /eois/volunteer/:id for fetching volunteer EOIs
export const getVolunteerEOIs = (volunteerId) =>
  API.get(`/eois/volunteer/${volunteerId}`);

// --------------------------
// DEFAULT EXPORT
// --------------------------
const api = {
  // Volunteers
  getVolunteers,
  getVolunteerById,
  addVolunteer,
  updateVolunteer,
  deleteVolunteer,
  updateVolunteerProfile,

  // Trainings
  getTrainings,
  getTrainingById,
  addTraining,
  updateTraining,
  deleteTraining,

  // Attendance
  getAttendance,
  getAttendanceByVolunteer,
  getTodayAttendanceByVolunteer,
  getTodayAttendanceAll,
  addAttendance,
  updateAttendance,
  deleteAttendance,
  deleteAllAttendance,
  clockIn,
  clockOut,

  // Qualifications
  getQualifications,
  getQualificationsByVolunteer,
  addQualification,
  updateQualification,
  deleteQualification,

  // Admin
  registerAdmin,
  loginAdmin,

  // Volunteer Auth
  registerVolunteer,
  loginVolunteer,

  // EOIs
  submitEOI,
  getVolunteerEOIs,
};

export default api;
