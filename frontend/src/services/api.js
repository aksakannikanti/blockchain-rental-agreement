import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Authorization header if token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401s to clear token if expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-logout on failed login requests
      if (!error.config.url.includes("/auth/login")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (data) => api.post("/auth/register", data),
  getMe: () => api.get("/auth/me"),
  getUsers: (role) => api.get(`/auth/users${role ? `?role=${role}` : ""}`),
  seedDemo: () => api.post("/auth/seed-demo"),
};

export const agreementAPI = {
  create: (data) => api.post("/agreements", data),
  getAll: () => api.get("/agreements"),
  getById: (id) => api.get(`/agreements/${id}`),
  accept: (id) => api.post(`/agreements/${id}/accept`),
  reject: (id) => api.post(`/agreements/${id}/reject`),
  terminate: (id) => api.post(`/agreements/${id}/terminate`),
  getStats: () => api.get("/agreements/stats/summary"),
};

export const paymentAPI = {
  simulateGateway: (data) => api.post("/payments/simulate-gateway", data),
  verifyAndRecordOracle: (data) => api.post("/payments/oracle/verify-and-record", data),
  payAndVerify: (data) => api.post("/payments/pay-and-verify", data),
  getByAgreement: (agreementId) => api.get(`/payments/agreement/${agreementId}`),
  getHistory: () => api.get("/payments/history"),
};

export const systemAPI = {
  getHealth: () => api.get("/health"),
};

export default api;
