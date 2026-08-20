import axios from "axios";

// Derive base URL from environment (Vite or standard environment variables) or default to relative /api
const getBaseURL = () => {
  if (typeof window !== "undefined") {
    if (import.meta?.env?.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
  }
  return "/api";
};

export const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor: Attach JWT token if stored locally
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("employeeToken");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        config.headers["x-admin-token"] = token;
        config.headers["x-employee-token"] = token;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle common response formats
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized API call, redirecting or refreshing token if necessary");
    }
    return Promise.reject(error);
  }
);
