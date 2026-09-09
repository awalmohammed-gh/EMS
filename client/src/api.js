import axios from "axios";

/**
 * Shared API client with withCredentials: true
 * Enables automatic transmission of secure HTTP-only cookies
 */
export const api = axios.create({
  baseURL: (typeof window !== "undefined" && import.meta?.env?.VITE_API_URL) || "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

export default api;
