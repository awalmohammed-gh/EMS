import axios from "axios";

/**
 * Centralized Base URL resolution
 * Defaults to relative /api or custom Vite environment variable
 */
const getBaseURL = () => {
  if (typeof window !== "undefined" && import.meta?.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return "/api";
};

/**
 * Core Axios instance configured for API communication
 */
export const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // 30 seconds timeout
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

let inMemoryToken =
  typeof window !== "undefined"
    ? localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("employeeToken") ||
      localStorage.getItem("adminToken") ||
      sessionStorage.getItem("token") ||
      null
    : null;

if (inMemoryToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${inMemoryToken}`;
}

/**
 * Request Interceptor:
 * Automatically attaches Authorization Bearer and role headers if token exists,
 * while preserving cookie transmission via withCredentials: true.
 */
api.interceptors.request.use(
  (config) => {
    // Flag for AJAX requests
    config.headers["X-Requested-With"] = "XMLHttpRequest";

    const token =
      inMemoryToken ||
      (typeof window !== "undefined"
        ? localStorage.getItem("token") ||
          localStorage.getItem("auth_token") ||
          localStorage.getItem("employeeToken") ||
          localStorage.getItem("adminToken") ||
          sessionStorage.getItem("token")
        : null);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers["x-employee-token"] = token;
      config.headers["x-admin-token"] = token;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor:
 * Handles global error statuses, token invalidation, and response normalization
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.message ||
      "An unexpected network error occurred.";

    if (status === 401) {
      console.warn("[API Service] 401 Unauthorized encountered:", message);

      // If user had a local token that is now rejected, notify window listeners
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("auth:unauthorized", {
            detail: { status, message },
          })
        );
      }
    } else if (status === 403) {
      console.warn("[API Service] 403 Forbidden - Access denied:", message);
    } else if (status >= 500) {
      console.error("[API Service] Server error:", status, message);
    }

    // Attach normalized error message for clean consumption in components
    error.normalizedMessage = message;
    return Promise.reject(error);
  }
);

/**
 * Centralized API service helper with common REST operations
 */
export const apiService = {
  /**
   * HTTP GET request
   */
  get: (url, config = {}) => api.get(url, config),

  /**
   * HTTP POST request
   */
  post: (url, data = {}, config = {}) => api.post(url, data, config),

  /**
   * HTTP PUT request
   */
  put: (url, data = {}, config = {}) => api.put(url, data, config),

  /**
   * HTTP PATCH request
   */
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),

  /**
   * HTTP DELETE request
   */
  delete: (url, config = {}) => api.delete(url, config),

  /**
   * Multipart Form-Data upload helper
   */
  upload: (url, formData, onUploadProgress = null, config = {}) => {
    return api.post(url, formData, {
      ...config,
      headers: {
        ...(config.headers || {}),
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress,
    });
  },

  /**
   * Helper to set and store active token
   */
  setToken: (token) => {
    inMemoryToken = token || null;
    if (typeof window !== "undefined") {
      if (token) {
        try {
          localStorage.setItem("token", token);
          localStorage.setItem("auth_token", token);
        } catch {
          // ignore
        }
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } else {
        try {
          localStorage.removeItem("token");
          localStorage.removeItem("auth_token");
        } catch {
          // ignore
        }
        delete api.defaults.headers.common["Authorization"];
      }
    }
  },

  /**
   * Helper to clear auth tokens
   */
  clearToken: () => {
    inMemoryToken = null;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("employeeToken");
        localStorage.removeItem("adminToken");
      } catch {
        // ignore
      }
      delete api.defaults.headers.common["Authorization"];
    }
  },

  /**
   * Helper to retrieve currently stored token
   */
  getToken: () => {
    if (inMemoryToken) return inMemoryToken;
    if (typeof window !== "undefined") {
      try {
        return (
          localStorage.getItem("token") ||
          localStorage.getItem("auth_token") ||
          localStorage.getItem("employeeToken") ||
          localStorage.getItem("adminToken") ||
          sessionStorage.getItem("token") ||
          null
        );
      } catch {
        return null;
      }
    }
    return null;
  },
};

export default api;
