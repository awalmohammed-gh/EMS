import axios from "axios";

/**
 * Robust Base URL resolution
 * Ensures the API base always includes /api even if VITE_API_URL is supplied without it
 */
const getBaseURL = () => {
  if (typeof window !== "undefined" && import.meta?.env?.VITE_API_URL) {
    let url = String(import.meta.env.VITE_API_URL).trim();
    if (url && !url.endsWith("/api")) {
      url = url.replace(/\/+$/, "") + "/api";
    }
    return url;
  }
  return "/api";
};

/**
 * Shared API client with withCredentials: true
 * Enables automatic transmission of secure HTTP-only cookies
 */
export const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Interceptor to strip hardcoded Content-Type on FormData payloads so the browser attaches the multipart boundary
api.interceptors.request.use((config) => {
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

export default api;
