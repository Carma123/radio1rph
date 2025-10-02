// src/services/api.js
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

/* ---------------------------------
   Storage keys
---------------------------------- */
// Admin tokens keep legacy keys for back-compat
const ADMIN_ACCESS = "access_token";
const ADMIN_REFRESH = "refresh_token";

// Volunteer tokens are separate (don’t clobber admin)
const VOL_ACCESS = "vol_access_token";
const VOL_REFRESH = "vol_refresh_token";

const ADMIN_KEY = "admin";
const VOLUNTEER_KEY = "volunteer";

/* ---------------------------------
   Helpers
---------------------------------- */
const getJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const setJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v ?? null));

const getAdminIdentity = () => getJSON(ADMIN_KEY);
const setAdminIdentity = (obj) => setJSON(ADMIN_KEY, obj);
const getVolunteerIdentity = () => getJSON(VOLUNTEER_KEY);
const setVolunteerIdentity = (obj) => setJSON(VOLUNTEER_KEY, obj);

const tokens = {
  getAdmin: () => ({
    access: localStorage.getItem(ADMIN_ACCESS),
    refresh: localStorage.getItem(ADMIN_REFRESH),
  }),
  getVol: () => ({
    access: localStorage.getItem(VOL_ACCESS),
    refresh: localStorage.getItem(VOL_REFRESH),
  }),
  setAdmin: (access, refresh) => {
    if (access) localStorage.setItem(ADMIN_ACCESS, access);
    if (refresh) localStorage.setItem(ADMIN_REFRESH, refresh);
  },
  setVol: (access, refresh) => {
    if (access) localStorage.setItem(VOL_ACCESS, access);
    if (refresh) localStorage.setItem(VOL_REFRESH, refresh);
  },
  clearAll: () => {
    [ADMIN_ACCESS, ADMIN_REFRESH, VOL_ACCESS, VOL_REFRESH].forEach((k) =>
      localStorage.removeItem(k)
    );
  },
};

// Prefer admin token generally
const pickActiveRole = () => {
  if (tokens.getAdmin().access) return "admin";
  if (tokens.getVol().access) return "vol";
  return null;
};

/* ---------------------------------
   Axios instances
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
   Request interceptor
   - Attach appropriate token
   - Admin required for admin routes
   - Allow volunteer to PUT their own /volunteers/:id
---------------------------------- */
API.interceptors.request.use((config) => {
  const url = (config.url || "").toLowerCase();
  const method = (config.method || "get").toLowerCase();

  // Detect if this is /volunteers/:id
  const matchVolunteerId = url.match(/^\/volunteers\/(\d+)(?:\/|$)/);
  const targetVolunteerId = matchVolunteerId ? Number(matchVolunteerId[1]) : null;

  // Logged-in volunteer id from storage (we store both id and volunteer_id)
  const vIdent = getVolunteerIdentity();
  const selfVolunteerId = vIdent ? Number(vIdent.id ?? vIdent.volunteer_id) : null;

  // Default: no admin requirement
  let needsAdmin = false;

  // Admin-only areas
  if (
    url.startsWith("/training-results") ||                       // create/update/upload/list results
    /\/trainings\/\d+\/results$/.test(url) ||                    // list results for a training
    url.startsWith("/eois/pending") ||                           // pending EOIs
    (url.startsWith("/eois/") && ["put", "delete"].includes(method)) || // approve/reject/standby/promote
    (url.startsWith("/trainings") && ["post", "put", "delete"].includes(method)) || // training CRUD
    (url.startsWith("/qualifications") && method === "delete")    // delete qualification
  ) {
    needsAdmin = true;
  }

  // Volunteers namespace rules
  if (url.startsWith("/volunteers")) {
    if (method === "post" || method === "delete") {
      // create/delete volunteers -> admin only
      needsAdmin = true;
    } else if (method === "put") {
      // UPDATE: allow volunteer to update their own record with volunteer token
      if (targetVolunteerId && selfVolunteerId && targetVolunteerId === selfVolunteerId) {
        needsAdmin = false; // self-update permitted with volunteer token
      } else {
        needsAdmin = true;  // updating others requires admin
      }
    }
  }

  // Choose role/token
  let role = pickActiveRole();
  if (needsAdmin) role = "admin"; // force admin for protected endpoints

  const token =
    role === "admin" ? tokens.getAdmin().access :
    role === "vol"   ? tokens.getVol().access   : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  // mark which role we used (for refresh logic)
  config.__role = role;
  return config;
});

/* ---------------------------------
   Refresh logic (per role)
---------------------------------- */
let isRefreshing = false;
let waiters = [];
const queueWaiter = (cb) => waiters.push(cb);
const flushWaiters = (val) => { waiters.forEach((cb) => cb(val)); waiters = []; };

const refreshForRole = async (role) => {
  const refresh =
    role === "admin" ? tokens.getAdmin().refresh :
    role === "vol"   ? tokens.getVol().refresh   : null;

  if (!refresh) throw new Error("No refresh token");

  try {
    // Primary path: Authorization: Bearer <refresh>
    const r = await axios.post(`${BASE_URL}/auth/refresh`, null, {
      headers: { Authorization: `Bearer ${refresh}` },
      withCredentials: false,
    });
    const access = r.data?.access_token;
    if (!access) throw new Error("No access token (refresh)");
    if (role === "admin") tokens.setAdmin(access, refresh);
    else tokens.setVol(access, refresh);
    return access;
  } catch {
    // Fallback: body { refresh_token }
    const r2 = await axios.post(
      `${BASE_URL}/auth/refresh/json`,
      { refresh_token: refresh },
      { withCredentials: false }
    );
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

    const isRefreshCall =
      config?.url?.includes("/auth/refresh") ||
      config?.url?.includes("/auth/refresh/json");
    if (isRefreshCall) return Promise.reject(error);

    if (response.status !== 401 || config._retry) return Promise.reject(error);
    config._retry = true;

    const role = config.__role || pickActiveRole();
    const hasRefresh =
      role === "admin" ? !!tokens.getAdmin().refresh :
      role === "vol"   ? !!tokens.getVol().refresh   : false;

    if (!hasRefresh) {
      auth.logout();
      return Promise.reject(error);
    }

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
      auth.logout();
      return Promise.reject(e);
    }
  }
);

/* ---------------------------------
   Back-compat token helpers (used by AdminLogin.js)
---------------------------------- */
// These map to ADMIN tokens on purpose (legacy behavior).
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
---------------------------------- */
const auth = {
  setFromStorage() {
    const adminAccess = tokens.getAdmin().access;
    if (adminAccess) {
      API.defaults.headers.common.Authorization = `Bearer ${adminAccess}`;
    } else {
      delete API.defaults.headers.common.Authorization;
    }
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

// tiny helper we can call before admin actions
export const touchAdminAuth = () => auth.setFromStorage();

/* =========================
   VOLUNTEERS (read + auth)
   ========================= */
export const getVolunteers = () => PUB.get("/volunteers");
export const getVolunteerById = (id) => PUB.get(`/volunteers/${id}`);
export const registerVolunteer = (data) => PUB.post("/volunteer/register", data);

export const loginVolunteerAndStore = async (data) => {
  const res = await PUB.post("/volunteer/login", data);
  const { access_token, refresh_token, volunteer_id, name, email, emergency_contact } = res.data || {};
  // Store both id and volunteer_id to simplify downstream usage
  if (volunteer_id) setVolunteerIdentity({ id: volunteer_id, volunteer_id, name, email, emergency_contact });
  if (access_token && refresh_token) tokens.setVol(access_token, refresh_token); // don't touch admin tokens
  return res;
};
export const loginVolunteer = loginVolunteerAndStore;

/* ---------- Forgot / Reset password (VOLUNTEER) ---------- */
export const volunteerRequestPasswordReset = (email) =>
  axios.post(`${BASE_URL}/volunteer/request-password-reset`, { email }, { withCredentials: false });

export const volunteerResetPassword = (payload) =>
  axios.post(`${BASE_URL}/volunteer/reset-password`, payload, { withCredentials: false });

/* =========================
   ADMIN AUTH
   ========================= */
export const registerAdmin = (data) => PUB.post("/admin/register", data);

export const loginAdminAndStore = (data) =>
  PUB.post("/admin/login", data).then((res) => {
    const { access_token, refresh_token, admin_id, role } = res.data || {};
    if (admin_id) setAdminIdentity({ admin_id, role: role || "admin" });
    if (access_token && refresh_token) setTokens(access_token, refresh_token); // back-compat helper
    return res;
  });
export const loginAdmin = loginAdminAndStore;
export const authMe = () => API.get("/auth/me");

/* ---------- Forgot / Reset password (ADMIN) ---------- */
export const requestAdminPasswordReset = (payload) =>
  axios.post(`${BASE_URL}/admin/forgot-password`, payload, {
    withCredentials: false,
    headers: { Accept: "application/json" },
  });

export const resetAdminPassword = (payload) =>
  axios.post(`${BASE_URL}/admin/reset-password`, payload, {
    withCredentials: false,
    headers: { Accept: "application/json" },
  });

/* =========================
   TRAININGS
   ========================= */
export const getTrainings = (params = {}) => PUB.get("/trainings", { params });
export const getPublicTrainings = getTrainings;

export const getTrainingById = (id) => PUB.get(`/trainings/${id}`);
export const getTraining = getTrainingById;
export const getTrainingCapacity = (id) => PUB.get(`/trainings/${id}/capacity`);

const buildTrainingPayload = (data) => ({
  title: data.title,
  description: data.description ?? null,
  start_date: data.start_date ?? null,
  end_date: data.end_date ?? null,
  type: data.type ?? "internal",
  provider: data.provider ?? null,
  trainer_name: data.trainer_name ?? null,
  accreditation: data.accreditation ?? "in_house",
  delivery_mode: data.delivery_mode ?? "in_person",
  venue: data.venue ?? null,
  cost: data.cost ?? null,
  prerequisites: data.prerequisites ?? null,
  capacity: data.capacity ?? null,
  eoi_close_date: data.eoi_close_date ?? null,
});

export const addTraining = (data) => API.post("/trainings", buildTrainingPayload(data));
export const updateTraining = (id, data) => API.put(`/trainings/${id}`, buildTrainingPayload(data));
export const deleteTraining = (id) => API.delete(`/trainings/${id}`);

/* =========================
   ATTENDANCE
   ========================= */
export const getAttendance = () => PUB.get("/attendance");
export const getAttendanceByVolunteer = (volunteerId) =>
  PUB.get(`/volunteers/${volunteerId}/attendance`);

export const clockIn = (volunteerId) =>
  PUB.post(`/attendance/clockin`, { volunteer_id: volunteerId });

export const clockOut = (volunteerId) =>
  PUB.post(`/attendance/clockout`, { volunteer_id: volunteerId });

export const deleteAllAttendance = () => API.delete(`/attendance`);

export const getAttendanceCsvUrl = (dateStr) =>
  `${BASE_URL}/attendance/export?date=${encodeURIComponent(dateStr)}`;



/* =========================
   QUALIFICATIONS
   ========================= */
export const addQualification = (payload) => {
  if (payload instanceof FormData) {
    return API.post("/qualifications", payload); // file upload
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
    return API.put(`/qualifications/${id}`, payload); // file upload
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
// Always use the volunteer token for these (even if admin token exists)
export const addVolunteerQualification = (volunteerId, formData) => {
  return API.request({
    method: "POST",
    url: `/volunteers/${volunteerId}/qualifications`,
    data: formData,
    headers: formData instanceof FormData
      ? {} // let browser set multipart boundary
      : { "Content-Type": "application/json" },
    __role: "vol", // force volunteer token in interceptor
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
    method: "PUT", // keep consistent with your existing admin update
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
  // Primary (matches your Flask app.py)
  try {
    return await PUB.post(`/qualifications/reminders/run`);
  } catch (e) {
    // Optional fallback to legacy path if you ever bring it back
    try { return await PUB.post(`/jobs/run_reminder_check`); } catch { throw e; }
  }
};

export const getVolunteerNotifications = (volunteerId) =>
  PUB.get(`/volunteers/${volunteerId}/notifications`);
export const markNotificationRead = (notificationId) =>
  PUB.post(`/notifications/${notificationId}/read`);

/* =========================
   EOIs
   ========================= */
export const submitEOI = (volunteerId, trainingId) =>
  PUB.post(`/eois`, { volunteer_id: volunteerId, training_id: trainingId });

export const getVolunteerEOIs = (volunteerId) =>
  PUB.get(`/volunteers/${volunteerId}/eois`);

export const getPendingEOIs = (params = {}) => API.get(`/eois/pending`, { params });
export const getEOIs = (params = {}) => PUB.get(`/eois`, { params });
export const getPublicEOIs = getEOIs;

export const approveEOI = (eoiId) => API.put(`/eois/${eoiId}/approve`);
export const rejectEOI = (eoiId) => API.put(`/eois/${eoiId}/reject`);
export const moveEOIToStandby = (eoiId) => API.put(`/eois/${eoiId}/standby`);
export const promoteEOI = (eoiId) => API.put(`/eois/${eoiId}/promote`);
export const cancelEOI = (eoiId) => PUB.put(`/eois/${eoiId}/cancel`);

/* =========================
   TRAINING RESULTS
   ========================= */
export const createTrainingResult = (payload) => {
  if (payload instanceof FormData) {
    return API.post(`/training-results`, payload);
  }
  return API.post(`/training-results`, {
    volunteer_id: payload.volunteer_id,
    training_id: payload.training_id,
    result: payload.result, // 'competent' | 'not_yet_competent' | 'not_assessed' | 'participated'
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
// Admin-only create/update/delete; reads can be public (defined above)
export const addVolunteer = (payload) => API.post("/volunteers", payload);
export const updateVolunteer = (id, payload) => API.put(`/volunteers/${id}`, payload);
export const deleteVolunteer = (id) => API.delete(`/volunteers/${id}`);

/* =========================
   Namespaced default export
   ========================= */
const api = {
  // back-compat token helpers (AdminLogin needs these)
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,

  // auth facade
  auth,
  touchAdminAuth,
  getAdminIdentity,
  getVolunteerIdentity,

  // volunteers (public reads)
  getVolunteers,
  getVolunteerById,

  // volunteers (admin CRUD + self update path uses same function)
  addVolunteer,
  updateVolunteer,
  deleteVolunteer,

  // admin auth
  registerAdmin,
  loginAdminAndStore,
  loginAdmin,
  authMe,

  // admin password reset
  requestAdminPasswordReset,
  resetAdminPassword,

  // volunteer auth + password reset
  registerVolunteer,
  loginVolunteerAndStore,
  loginVolunteer,
  volunteerRequestPasswordReset,
  volunteerResetPassword,

  // trainings
  getTrainings,
  getPublicTrainings,
  getTrainingById,
  getTraining,
  getTrainingCapacity,
  addTraining,
  updateTraining,
  deleteTraining,

  // attendance
  getAttendance,
  getAttendanceByVolunteer,
  clockIn,
  clockOut,
  deleteAllAttendance, 
  getAttendanceCsvUrl,

  // qualifications
  getQualifications,
  getQualificationsByVolunteer,
  addQualification,
  updateQualification,
  deleteQualification,

  // notifications
  getQualificationReminders,
  runReminderCheck,
  getVolunteerNotifications,
  markNotificationRead,

  // EOIs
  submitEOI,
  getVolunteerEOIs,
  getPendingEOIs,
  getEOIs,
  getPublicEOIs,
  approveEOI,
  rejectEOI,
  moveEOIToStandby,
  promoteEOI,
  cancelEOI,

  // results
  createTrainingResult,
  updateTrainingResult,
  uploadResultCertificate,
  uploadResultEvidence,
  getTrainingResults,
  getVolunteerTrainingResults,



  // volunteer-scoped qualifications
  addVolunteerQualification,
  addVolunteerQualificationJSON,
  updateVolunteerQualification,

};

export default api;
