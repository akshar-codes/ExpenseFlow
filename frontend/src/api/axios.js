import axios from "axios";

// ─── Base instance ─────────────────────────────────────────────────────────────
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// ─── Request interceptor — attach JWT ─────────────────────────────────────────
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — handle expired / invalid JWT ─────────────────────
API.interceptors.response.use(
  // Pass-through on success
  (response) => response,

  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token is expired or invalid — clear all auth state and send to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Only redirect if we're not already on an auth page (prevents redirect loops)
      const publicPaths = ["/login", "/register", "/"];
      const isPublic = publicPaths.some((p) => window.location.pathname === p);

      if (!isPublic) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default API;
