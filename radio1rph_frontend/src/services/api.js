// src/services/api.js
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

/* ---------------------------------
   Storage keys
---------------------------------- */
const ADMIN_ACCESS = "access_token";
const ADMIN_REFRESH = "refresh_token";

// Current keys used across the app
const VOL_ACCESS = "vol_access";
const VOL_REFRESH = "vol_refresh";

// Legacy/compat keys some parts of the UI still read (e.g., openProtectedFile)
const VOL_ACCESS_LEGACY = "vol_access_token";
const VOL_REFRESH_LEGACY = "vol_refresh_token";

const ADMIN_KEY = "admin";
const VOLUNTEER_KEY = "volunteer";

/* ---------------------------------
   Helpers
---------------------------------- */
const getJSON = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || "null");
  } catch {
    return null;
  }
};
const setJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v ?? null));
const getAdminIdentity = () => getJSON(ADMIN_KEY);
const setAdminIdentity = (obj) => setJSON(ADMIN_KEY, obj);
const getVolunteerIdentity = () => getJSON(VOLUNTEER_KEY);
const setVolunteerIdentity = (obj) => setJSON(VOLUNTEER_KEY, obj);

const getActiveVolunteerId = () => {
  const v = getVolunteerIdentity();
  return v ? Number(v.volunteer_id ?? v.id) : null;
};

const tokens = {
  getAdmin: () => ({
    access: localStorage.getItem(ADMIN_ACCESS),
    refresh: localStorage.getItem(ADMIN_REFRESH),
  }),
  getVol: () => ({
    // Read from both current and legacy keys
    access:
      localStorage.getItem(VOL_ACCESS) ||
      localStorage.getItem(VOL_ACCESS_LEGACY),
    refresh:
      localStorage.getItem(VOL_REFRESH) ||
      localStorage.getItem(VOL_REFRESH_LEGACY),
  }),
  setAdmin: (access, refresh) => {
    if (access) localStorage.setItem(ADMIN_ACCESS, access);
    if (refresh) localStorage.setItem(ADMIN_REFRESH, refresh);
  },
  setVol: (access, refresh) => {
    if (access) {
      localStorage.setItem(VOL_ACCESS, access);
      // Also set legacy key for components using fetch (e.g., openProtectedFile)
      localStorage.setItem(VOL_ACCESS_LEGACY, access);
    }
    if (refresh) {
      localStorage.setItem(VOL_REFRESH, refresh);
      localStorage.setItem(VOL_REFRESH_LEGACY, refresh);
    }
  },
  clearAll: () => {
    [
      ADMIN_ACCESS,
      ADMIN_REFRESH,
      VOL_ACCESS,
      VOL_REFRESH,
      VOL_ACCESS_LEGACY,
      VOL_REFRESH_LEGACY,
    ].forEach((k) => localStorage.removeItem(k));
  },
};

const pickActiveRole = () => {
  if (tokens.getAdmin().access) return "admin";
  if (tokens.getVol().access) return "vol";
  return null;
};

/* ---------------------------------
   Axios Instances
---------------------------------- */
const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  timeout: 15000,
  headers: { Accept: "application/json" },
});
const PUB = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  timeout: 15000,
  headers: { Accept: "application/json" },
});

/* ---------------------------------
   Request Interceptor (role-aware)
---------------------------------- */
API.interceptors.request.use((config) => {
  const url = (config.url || "").toLowerCase();
  const method = (config.method || "get").toLowerCase();

  // self-edit detection when PUT /volunteers/:id
  const matchVolunteerId = url.match(/^\/volunteers\/(\d+)(?:\/|$)/);
  const targetVolunteerId = matchVolunteerId ? Number(matchVolunteerId[1]) : null;
  const vIdent = getVolunteerIdentity();
  const selfVolunteerId = vIdent ? Number(vIdent.id ?? vIdent.volunteer_id) : null;

  let needsAdmin = false;

  // Admin-only areas
  if (
    url.startsWith("/training-results") ||
    /\/trainings\/\d+\/results$/.test(url) ||
    url.startsWith("/eois/pending") ||
    (url.startsWith("/eois/") && ["put", "delete"].includes(method)) ||
    (url.startsWith("/trainings") && ["post", "put", "delete"].includes(method)) ||
    (url.startsWith("/qualifications") && method === "delete") ||
    url.startsWith("/admin/notifications")
  ) {
    needsAdmin = true;
  }

  // Volunteers CRUD: POST/DELETE admin; self PUT allowed
  if (url.startsWith("/volunteers")) {
    if (method === "post" || method === "delete") {
      needsAdmin = true;
    } else if (method === "put") {
      needsAdmin = !(
        targetVolunteerId &&
        selfVolunteerId &&
        targetVolunteerId === selfVolunteerId
      );
    }
  }

  let role = pickActiveRole();
  if (needsAdmin) role = "admin";

  const token =
    role === "admin"
      ? tokens.getAdmin().access
      : role === "vol"
      ? tokens.getVol().access
      : null;

  if (token) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;

  config.__role = role;
  return config;
});

/* ---------------------------------
   Refresh Token Handling
---------------------------------- */
let isRefreshing = false;
let waiters = [];
const queueWaiter = (cb) => waiters.push(cb);
const flushWaiters = (val) => {
  waiters.forEach((cb) => cb(val));
  waiters = [];
};

const refreshForRole = async (role) => {
  const refresh =
    role === "admin" ? tokens.getAdmin().refresh : role === "vol" ? tokens.getVol().refresh : null;

  if (!refresh) throw new Error("No refresh token");

  try {
    // Primary: Authorization Bearer refresh -> /auth/refresh
    const r = await axios.post(`${BASE_URL}/auth/refresh`, null, {
      headers: { Authorization: `Bearer ${refresh}` },
    });
    const access = r.data?.access_token;
    if (!access) throw new Error("No access token (refresh)");
    if (role === "admin") tokens.setAdmin(access, refresh);
    else tokens.setVol(access, refresh);
    return access;
  } catch {
    // Fallback: JSON body -> /auth/refresh/json
    const r2 = await axios.post(`${BASE_URL}/auth/refresh/json`, {
      refresh_token: refresh,
    });
    const access = r2.data?.access_token;
    if (!access) throw new Error("No access token (refresh/json)");
    if (role === "admin") tokens.setAdmin(access, refresh);
    else tokens.setVol(access, refresh);
    return access;
  }
};

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error || {};
    if (!response) return Promise.reject(error);
    const isRefreshCall = config?.url?.includes("/auth/refresh");
    if (isRefreshCall) return Promise.reject(error);
    if (response.status !== 401 || config._retry) return Promise.reject(error);

    config._retry = true;
    const role = config.__role || pickActiveRole();
    const hasRefresh =
      role === "admin" ? !!tokens.getAdmin().refresh : role === "vol" ? !!tokens.getVol().refresh : false;

    if (!hasRefresh) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queueWaiter((newAccess) => {
          if (!newAccess) return reject(error);
          config.headers.Authorization = `Bearer ${newAccess}`;
          resolve(API(config));
        });
      });
    }

    isRefreshing = true;
    try {
      const newAccess = await refreshForRole(role);
      isRefreshing = false;
      flushWaiters(newAccess);
      config.headers.Authorization = `Bearer ${newAccess}`;
      return API(config);
    } catch (e) {
      isRefreshing = false;
      flushWaiters(null);
      return Promise.reject(e);
    }
  }
);

/* ---------------------------------
   Auth Facade
---------------------------------- */
const auth = {
  setFromStorage() {
    const adminAccess = tokens.getAdmin().access;
    if (adminAccess) API.defaults.headers.common.Authorization = `Bearer ${adminAccess}`;
    else delete API.defaults.headers.common.Authorization;
  },
  logout() {
    tokens.clearAll();
    localStorage.removeItem(ADMIN_KEY);
    localStorage.removeItem(VOLUNTEER_KEY);
    delete API.defaults.headers.common.Authorization;
  },
  getRole() {
    const r = pickActiveRole();
    if (r === "admin") return "admin";
    if (r === "vol") return "volunteer";
    return null;
  },
  getAdminIdentity,
  getVolunteerIdentity,
};

export const touchAdminAuth = () => auth.setFromStorage();

/* =========================
   Volunteers (public reads & self-service)
========================= */
export const getVolunteers = () => PUB.get("/volunteers");
export const getVolunteerById = (id) => PUB.get(`/volunteers/${id}`);

// Update own volunteer profile (self-service)
// Try PUT first; fall back to PATCH if backend uses that.
export const updateVolunteer = async (id, data) => {
  try {
    return await API.put(`/volunteers/${id}`, data, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err?.response?.status === 405) {
      return API.patch(`/volunteers/${id}`, data, {
        headers: { "Content-Type": "application/json" },
      });
    }
    throw err;
  }
};

export const registerVolunteer = (data) =>
  PUB.post("/volunteer/register", {
    ...data,
    email: (data?.email || "").trim().toLowerCase(), // backend stores lower-case
  });

/* =========================
   Admin & Volunteer Auth
========================= */
export const loginVolunteerAndStore = async (data) => {
  const payload = {
    email: (data?.email || "").trim().toLowerCase(),
    password: data?.password || "",
  };
  const res = await PUB.post("/volunteer/login", payload);
  const {
    access_token,
    refresh_token,
    volunteer_id,
    name,
    email,
    emergency_contact,
  } = res.data || {};
  if (volunteer_id)
    setVolunteerIdentity({ id: volunteer_id, volunteer_id, name, email, emergency_contact });
  if (access_token && refresh_token) tokens.setVol(access_token, refresh_token);
  return res;
};
// alias used by your UI
export const loginVolunteer = (data) => loginVolunteerAndStore(data);

export const loginAdminAndStore = (data) =>
  PUB.post("/admin/login", data).then((res) => {
    const { access_token, refresh_token, admin_id, role } = res.data || {};
    if (admin_id) setAdminIdentity({ admin_id, role: role || "admin" });
    if (access_token && refresh_token) tokens.setAdmin(access_token, refresh_token);
    return res;
  });

/* Admin registration (needed by AdminRegister.js) */
export const registerAdmin = (data) =>
  PUB.post("/admin/register", {
    name: data?.name || "",
    email: (data?.email || "").trim().toLowerCase(),
    password: data?.password || "",
  });

/* Volunteer password reset — matches app.py */
export const volunteerRequestPasswordReset = (email) =>
  PUB.post("/volunteer/request-password-reset", {
    email: (email || "").trim().toLowerCase(),
  });

/* =========================
   Trainings
========================= */
export const getTrainings = (params = {}) => PUB.get("/trainings", { params });
export const getTrainingById = (id) => PUB.get(`/trainings/${id}`);
export const addTraining = (data) => API.post("/trainings", data);
export const updateTraining = (id, data) => API.put(`/trainings/${id}`, data);
export const deleteTraining = (id) => API.delete(`/trainings/${id}`);
export const getTrainingCapacity = (trainingId) =>
  API.get(`/trainings/${trainingId}/capacity`);

/* =========================
   EOIs (Public / Volunteer)
========================= */
export const getPublicTrainings = () => PUB.get("/trainings/public");
export const getPublicEOIs = (params = {}) => PUB.get("/eois", { params });

export const submitEOI = (volunteer_id, training_id) => {
  const payload = { volunteer_id, training_id };
  return PUB.post("/eois", payload, { headers: { "Content-Type": "application/json" } });
};

export const getVolunteerEOIs = (volunteerId) => PUB.get(`/eois/volunteer/${volunteerId}`);

export const cancelEOI = (eoiId) =>
  PUB.put(`/eois/${eoiId}/cancel`, null, { headers: { "Content-Type": "application/json" } });

export const approveEOI = (id) => API.put(`/eois/${id}/approve`);
export const rejectEOI = (id) => API.put(`/eois/${id}/reject`);
export const moveEOIToStandby = (id) => API.put(`/eois/${id}/standby`);
export const promoteEOI = (id) => API.put(`/eois/${id}/promote`);

/* =========================
   Qualifications
========================= */
export const getQualifications = () => PUB.get("/qualifications");
export const getQualificationsByVolunteer = (volunteerId) =>
  PUB.get(`/volunteers/${volunteerId}/qualifications`);

// CRUD used by admin flows / lists
export const addQualification = (data) => API.post("/qualifications", data);
export const updateQualification = (id, data) => API.put(`/qualifications/${id}`, data);
export const deleteQualification = (id) => API.delete(`/qualifications/${id}`);

/* =========================
   Attendance
========================= */
export const getAttendanceByVolunteer = (volunteerId) =>
  PUB.get(`/volunteers/${volunteerId}/attendance`);

export const clockIn = (volunteerId) =>
  PUB.post("/attendance/clockin", { volunteer_id: volunteerId });

export const clockOut = (volunteerId) =>
  PUB.post("/attendance/clockout", { volunteer_id: volunteerId });

/* CSV export helpers */
const fmtCsvDate = (day) => {
  if (!day) return new Date().toISOString().slice(0, 10);
  if (day instanceof Date) return day.toISOString().slice(0, 10);
  return String(day).slice(0, 10); // assume YYYY-MM-DD
};

export const getAttendanceCsvUrl = (day) =>
  `${BASE_URL}/attendance/export?date=${encodeURIComponent(fmtCsvDate(day))}`;

export const downloadAttendanceCsv = (day) =>
  PUB.get("/attendance/export", {
    params: { date: fmtCsvDate(day) },
    responseType: "blob",
  });

/* =========================
   Training Results (Volunteer/Admin)
========================= */
export const getTrainingResults = (trainingId) => API.get(`/trainings/${trainingId}/results`);
export const createTrainingResult = (data) => API.post("/training-results", data);
export const updateTrainingResult = (id, data) => API.put(`/training-results/${id}`, data);
export const getVolunteerTrainingResults = (volunteerId) =>
  PUB.get(`/volunteers/${volunteerId}/training-results`);

/* =========================
   Notifications / Reminders
========================= */
export const getQualificationReminders = (volunteerId) =>
  PUB.get(`/qualifications/reminders/${volunteerId ?? getActiveVolunteerId()}`);

export const getVolunteerNotifications = (volunteerId) =>
  PUB.get(`/volunteers/${volunteerId}/notifications`);

export const markNotificationRead = (notificationId) =>
  PUB.post(`/notifications/${notificationId}/read`);

export const getAdminNotifications = () => PUB.get(`/admin/notifications`);

export const runQualificationReminderScan = () => PUB.post(`/qualifications/reminders/run`);
export const runTrainingReminderScan = () => PUB.post(`/trainings/reminders/run`);

export const runReminderCheck = (volunteerId) =>
  getQualificationReminders(volunteerId ?? getActiveVolunteerId());

/* =========================
   API Export (default)
========================= */
const api = {
  auth,
  touchAdminAuth,

  // Auth
  loginVolunteer,
  loginVolunteerAndStore,
  loginAdminAndStore,
  volunteerRequestPasswordReset,
  registerAdmin, // <-- added

  // Admin reminders
  getAdminNotifications,
  markNotificationRead,
  runTrainingReminderScan,
  runQualificationReminderScan,
  runReminderCheck,
  getQualificationReminders,
  getVolunteerNotifications,

  // Public endpoints
  getPublicTrainings,
  getPublicEOIs,
  getQualifications,
  getQualificationsByVolunteer,

  // Training Results (Admin/Volunteer)
  getTrainingResults,
  createTrainingResult,
  updateTrainingResult,
  getVolunteerTrainingResults,

  // Capacity helper
  getTrainingCapacity,

  // EOIs
  submitEOI,
  getVolunteerEOIs,
  cancelEOI,
  approveEOI,
  rejectEOI,
  moveEOIToStandby,
  promoteEOI,

  // Trainings
  getTrainings,
  getTrainingById,
  addTraining,
  updateTraining,
  deleteTraining,

  // Qualifications CRUD
  addQualification,
  updateQualification,
  deleteQualification,

  // Volunteers
  getVolunteers,
  getVolunteerById,
  updateVolunteer,

  // Self-service
  registerVolunteer,

  // Attendance
  getAttendanceByVolunteer,
  clockIn,
  clockOut,
  getAttendanceCsvUrl,
  downloadAttendanceCsv,
};

export default api;
