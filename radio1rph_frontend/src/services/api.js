// src/services/api.js
import axios from "axios";

/* ---------------------------------
   Base URL (prefer localhost:5000 in dev)
---------------------------------- */
const inferDevBase = () => {
  const h = (typeof window !== "undefined" && window.location && window.location.hostname) || "localhost";
  return (h === "localhost" || h === "127.0.0.1") ? "http://localhost:5000" : "http://127.0.0.1:5000";
};
export const BASE_URL = process.env.REACT_APP_API_URL || inferDevBase();

/* ---------------------------------
   Storage keys
---------------------------------- */
const ADMIN_ACCESS = "access_token";
const ADMIN_REFRESH = "refresh_token";
<<<<<<< Updated upstream

// Current keys used across the app
const VOL_ACCESS = "vol_access";
const VOL_REFRESH = "vol_refresh";

// Legacy/compat keys some parts of the UI still read (e.g., openProtectedFile)
const VOL_ACCESS_LEGACY = "vol_access_token";
const VOL_REFRESH_LEGACY = "vol_refresh_token";

const ADMIN_KEY = "admin";
const VOLUNTEER_KEY = "volunteer";
=======
const VOL_ACCESS   = "vol_access_token";
const VOL_REFRESH  = "vol_refresh_token";
const ADMIN_KEY    = "admin";
const VOLUNTEER_KEY= "volunteer";
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
   Axios Instances
=======
   Axios (no cookies; we use Authorization header)
>>>>>>> Stashed changes
---------------------------------- */
const COMMON_CFG = {
  baseURL: BASE_URL,
  withCredentials: false,              // IMPORTANT: backend has supports_credentials=False
  timeout: 15000,
  headers: { Accept: "application/json" },
<<<<<<< Updated upstream
});
const PUB = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  timeout: 15000,
  headers: { Accept: "application/json" },
});

/* ---------------------------------
   Request Interceptor (role-aware)
=======
};

const API = axios.create(COMMON_CFG);
const PUB = axios.create(COMMON_CFG);

/* Ensure JSON headers on mutating requests unless FormData */
const ensureJsonHeaders = (config) => {
  const method = (config.method || "get").toLowerCase();
  const isMutate = ["post", "put", "patch", "delete"].includes(method);
  const isFormData = typeof FormData !== "undefined" && config.data instanceof FormData;
  if (isMutate && !isFormData) {
    config.headers = config.headers || {};
    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }
  }
  return config;
};
API.interceptors.request.use(ensureJsonHeaders);
PUB.interceptors.request.use(ensureJsonHeaders);

/* ---------------------------------
   Request interceptor (roles/tokens)
>>>>>>> Stashed changes
---------------------------------- */
API.interceptors.request.use((config) => {
  const url = (config.url || "").toLowerCase();
  const method = (config.method || "get").toLowerCase();

<<<<<<< Updated upstream
  // self-edit detection when PUT /volunteers/:id
  const matchVolunteerId = url.match(/^\/volunteers\/(\d+)(?:\/|$)/);
  const targetVolunteerId = matchVolunteerId ? Number(matchVolunteerId[1]) : null;
=======
  const matchVolunteerId = url.match(/^\/volunteers\/(\d+)(?:\/|$)/);
  const targetVolunteerId = matchVolunteerId ? Number(matchVolunteerId[1]) : null;

>>>>>>> Stashed changes
  const vIdent = getVolunteerIdentity();
  const selfVolunteerId = vIdent ? Number(vIdent.id ?? vIdent.volunteer_id) : null;

  let needsAdmin = false;

  if (
    url.startsWith("/training-results") ||
    /\/trainings\/\d+\/results$/.test(url) ||
    url.startsWith("/eois/pending") ||
    (url.startsWith("/eois/") && ["put", "delete"].includes(method)) ||
    (url.startsWith("/trainings") && ["post", "put", "delete"].includes(method)) ||
<<<<<<< Updated upstream
    (url.startsWith("/qualifications") && method === "delete") ||
    url.startsWith("/admin/notifications")
=======
    (url.startsWith("/qualifications") && method === "delete")
>>>>>>> Stashed changes
  ) {
    needsAdmin = true;
  }

<<<<<<< Updated upstream
  // Volunteers CRUD: POST/DELETE admin; self PUT allowed
=======
>>>>>>> Stashed changes
  if (url.startsWith("/volunteers")) {
    if (method === "post" || method === "delete") {
      needsAdmin = true;
    } else if (method === "put") {
<<<<<<< Updated upstream
      needsAdmin = !(
        targetVolunteerId &&
        selfVolunteerId &&
        targetVolunteerId === selfVolunteerId
      );
=======
      if (targetVolunteerId && selfVolunteerId && targetVolunteerId === selfVolunteerId) {
        needsAdmin = false;
      } else {
        needsAdmin = true;
      }
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  if (token) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;
=======
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers) {
    delete config.headers.Authorization;
  }
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
    // Primary: Authorization Bearer refresh -> /auth/refresh
=======
>>>>>>> Stashed changes
    const r = await axios.post(`${BASE_URL}/auth/refresh`, null, {
      headers: { Authorization: `Bearer ${refresh}` },
    });
    const access = r.data?.access_token;
    if (!access) throw new Error("No access token (refresh)");
    if (role === "admin") tokens.setAdmin(access, refresh);
    else tokens.setVol(access, refresh);
    return access;
  } catch {
<<<<<<< Updated upstream
    // Fallback: JSON body -> /auth/refresh/json
    const r2 = await axios.post(`${BASE_URL}/auth/refresh/json`, {
      refresh_token: refresh,
    });
=======
    const r2 = await axios.post(
      `${BASE_URL}/auth/refresh/json`,
      { refresh_token: refresh },
      { withCredentials: false }
    );
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    if (!response) return Promise.reject(error);
    const isRefreshCall = config?.url?.includes("/auth/refresh");
=======
    if (!response) {
      error.message = "Network error (possible CORS or server down)";
      return Promise.reject(error);
    }

    const isRefreshCall =
      config?.url?.includes("/auth/refresh") ||
      config?.url?.includes("/auth/refresh/json");
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
   Auth Facade
=======
   Back-compat token helpers (AdminLogin.js)
---------------------------------- */
export const getAccessToken = () => localStorage.getItem(ADMIN_ACCESS);
export const getRefreshToken = () => localStorage.getItem(ADMIN_REFRESH);
export const setTokens = (access, refresh) => {
  tokens.setAdmin(access, refresh);
  if (access) API.defaults.headers.common.Authorization = `Bearer ${access}`;
};
export const clearTokens = () => {
  tokens.clearAll();
  delete API.defaults.headers.common.Authorization;
};

/* ---------------------------------
   Public auth facade
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
export const loginVolunteerAndStore = async (data) => {
  const res = await PUB.post("/volunteer/login", data, {
    headers: { "Content-Type": "application/json" },
  });
  const { access_token, refresh_token, volunteer_id, name, email, emergency_contact } = res.data || {};
  if (volunteer_id) setVolunteerIdentity({ id: volunteer_id, volunteer_id, name, email, emergency_contact });
  if (access_token && refresh_token) tokens.setVol(access_token, refresh_token);
  return res;
>>>>>>> Stashed changes
};

export const registerVolunteer = (data) =>
  PUB.post("/volunteer/register", {
    ...data,
    email: (data?.email || "").trim().toLowerCase(), // backend stores lower-case
  });

/* =========================
<<<<<<< Updated upstream
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
=======
   ADMIN AUTH
   ========================= */
export const registerAdmin = (data) =>
  PUB.post("/admin/register", data, { headers: { "Content-Type": "application/json" } });

export const loginAdminAndStore = (data) =>
  PUB.post("/admin/login", data, { headers: { "Content-Type": "application/json" } })
    .then((res) => {
      const { access_token, refresh_token, admin_id, role, access, refresh, id } = res.data || {};
      const aTok = access_token || access;
      const rTok = refresh_token || refresh;
      const aId  = admin_id || id;
      if (aId) setAdminIdentity({ admin_id: aId, role: role || "admin" });
      if (aTok && rTok) setTokens(aTok, rTok);
      return res;
    });

export const loginAdmin = loginAdminAndStore;
export const authMe = () => API.get("/auth/me");

/* ---------- Forgot / Reset password (ADMIN) ---------- */
export const requestAdminPasswordReset = (payload) =>
  axios.post(`${BASE_URL}/admin/forgot-password`, payload, {
    withCredentials: false,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });

export const resetAdminPassword = (payload) =>
  axios.post(`${BASE_URL}/admin/reset-password`, payload, {
    withCredentials: false,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
/* =========================
   QUALIFICATIONS
   ========================= */
export const addQualification = (payload) => {
  if (payload instanceof FormData) {
    return API.post("/qualifications", payload);
  }
  return API.post("/qualifications", {
    ...payload,
    issue_date: payload.issue_date ?? null,
    expiry_date: payload.expiry_date ?? null,
    document_url: payload.document_url ?? undefined,
    document_path: payload.document_path ?? undefined,
  });
};

export const updateQualification = (id, payload) => {
  if (payload instanceof FormData) {
    return API.put(`/qualifications/${id}`, payload);
  }
  return API.put(`/qualifications/${id}`, {
    ...payload,
    issue_date: payload.issue_date ?? null,
    expiry_date: payload.expiry_date ?? null,
    document_url: payload.document_url ?? undefined,
    document_path: payload.document_path ?? undefined,
  });
};

export const getQualifications = () => PUB.get("/qualifications");
export const getQualificationsByVolunteer = (volunteerId) =>
  PUB.get(`/volunteers/${volunteerId}/qualifications`);
export const deleteQualification = (id) => API.delete(`/qualifications/${id}`);

/* ===== VOLUNTEER-SCOPED QUALIFICATION ENDPOINTS ===== */
export const addVolunteerQualification = (volunteerId, formData) => {
  return API.request({
    method: "POST",
    url: `/volunteers/${volunteerId}/qualifications`,
    data: formData,
    headers: formData instanceof FormData ? {} : { "Content-Type": "application/json" },
    __role: "vol",
  });
};

export const addVolunteerQualificationJSON = (volunteerId, payload) => {
  return API.request({
    method: "POST",
    url: `/volunteers/${volunteerId}/qualifications`,
    data: {
      ...payload,
      issue_date: payload.issue_date ?? null,
      expiry_date: payload.expiry_date ?? null,
      document_url: payload.document_url ?? undefined,
    },
    headers: { "Content-Type": "application/json" },
    __role: "vol",
  });
};

export const updateVolunteerQualification = (qualificationId, payloadOrForm) => {
  const isForm = payloadOrForm instanceof FormData;
  return API.request({
    method: "PUT",
    url: `/qualifications/${qualificationId}`,
    data: isForm
      ? payloadOrForm
      : {
          ...payloadOrForm,
          issue_date: payloadOrForm.issue_date ?? null,
          expiry_date: payloadOrForm.expiry_date ?? null,
          document_url: payloadOrForm.document_url ?? undefined,
          document_path: payloadOrForm.document_path ?? undefined,
        },
    headers: isForm ? {} : { "Content-Type": "application/json" },
    __role: "vol",
  });
};

/* ===== Reminders / Notifications ===== */
export const getQualificationReminders = (volunteerId) =>
  PUB.get(`/volunteers/${volunteerId}/notifications`);
export const runReminderCheck = async () => {
  try {
    return await PUB.post(`/qualifications/reminders/run`);
  } catch (e) {
    try { return await PUB.post(`/jobs/run_reminder_check`); } catch { throw e; }
  }
};
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
   API Export (default)
========================= */
const api = {
=======
   TRAINING RESULTS
   ========================= */
export const createTrainingResult = (payload) => {
  if (payload instanceof FormData) {
    return API.post(`/training-results`, payload);
  }
  return API.post(`/training-results`, {
    volunteer_id: payload.volunteer_id,
    training_id: payload.training_id,
    result: payload.result,
    issued_by: payload.issued_by ?? "inhouse",
    assessor_name: payload.assessor_name ?? null,
    date_assessed: payload.date_assessed ?? null,
    notes: payload.notes ?? null,
    next_opportunity: payload.next_opportunity ?? null,
    certificate_path: payload.certificate_path ?? undefined,
    evidence_path: payload.evidence_path ?? undefined,
  });
};

export const updateTrainingResult = (resultId, payload) => {
  if (payload instanceof FormData) return API.put(`/training-results/${resultId}`, payload);
  return API.put(`/training-results/${resultId}`, {
    result: payload.result ?? undefined,
    issued_by: payload.issued_by ?? undefined,
    assessor_name: payload.assessor_name ?? undefined,
    date_assessed: payload.date_assessed ?? undefined,
    notes: payload.notes ?? undefined,
    next_opportunity: payload.next_opportunity ?? undefined,
    certificate_path: payload.certificate_path ?? undefined,
    evidence_path: payload.evidence_path ?? undefined,
  });
};

export const uploadResultCertificate = (resultId, file) => {
  const fd = new FormData();
  fd.append("certificate", file);
  return API.post(`/training-results/${resultId}/certificate`, fd);
};

export const uploadResultEvidence = (resultId, file) => {
  const fd = new FormData();
  fd.append("evidence", file);
  return API.post(`/training-results/${resultId}/evidence`, fd);
};

export const getTrainingResults = (trainingId) =>
  API.get(`/trainings/${trainingId}/results`);

export const getVolunteerTrainingResults = (volunteerId) =>
  API.get(`/volunteers/${volunteerId}/training-results`);

/* =========================
   VOLUNTEERS (admin CRUD)
   ========================= */
export const addVolunteer = (payload) => API.post("/volunteers", payload);
export const updateVolunteer = (id, payload) => API.put(`/volunteers/${id}`, payload);
export const deleteVolunteer = (id) => API.delete(`/volunteers/${id}`);

/* =========================
   Namespaced default export
   ========================= */
const api = {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,

>>>>>>> Stashed changes
  auth,
  touchAdminAuth,

<<<<<<< Updated upstream
  // Auth
=======
  getVolunteers,
  getVolunteerById,

  addVolunteer,
  updateVolunteer,
  deleteVolunteer,

  registerAdmin,
  loginAdminAndStore,
  loginAdmin,
  authMe,

  requestAdminPasswordReset,
  resetAdminPassword,

  registerVolunteer,
  loginVolunteerAndStore,
>>>>>>> Stashed changes
  loginVolunteer,
  loginVolunteerAndStore,
  loginAdminAndStore,
  volunteerRequestPasswordReset,
  registerAdmin, // <-- added

<<<<<<< Updated upstream
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
=======
  getTrainings,
  getPublicTrainings,
  getTrainingById,
  getTraining,
  getTrainingCapacity,
  addTraining,
  updateTraining,
  deleteTraining,

  getAttendance,
  getAttendanceByVolunteer,
  clockIn,
  clockOut,
  deleteAllAttendance,
  getAttendanceCsvUrl,

>>>>>>> Stashed changes
  getQualifications,
  getQualificationsByVolunteer,

<<<<<<< Updated upstream
  // Training Results (Admin/Volunteer)
  getTrainingResults,
  createTrainingResult,
  updateTrainingResult,
  getVolunteerTrainingResults,

  // Capacity helper
  getTrainingCapacity,
=======
  getQualificationReminders,
  runReminderCheck,
  getVolunteerNotifications,
  markNotificationRead,
>>>>>>> Stashed changes

  submitEOI,
  getVolunteerEOIs,
  cancelEOI,
  approveEOI,
  rejectEOI,
  moveEOIToStandby,
  promoteEOI,

<<<<<<< Updated upstream
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
=======
  createTrainingResult,
  updateTrainingResult,
  uploadResultCertificate,
  uploadResultEvidence,
  getTrainingResults,
  getVolunteerTrainingResults,

  addVolunteerQualification,
  addVolunteerQualificationJSON,
  updateVolunteerQualification,
>>>>>>> Stashed changes
};

export default api;
