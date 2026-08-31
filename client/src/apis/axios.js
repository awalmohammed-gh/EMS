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

/**
 * Request Interceptor:
 * Attaches JWT Bearer token and role identifiers to all outgoing requests
 */
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      // Look up JWT tokens from standard storage keys
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("employeeToken") ||
        sessionStorage.getItem("token");

      if (token) {
        // Standard RFC 6750 Authorization Bearer header
        config.headers.Authorization = `Bearer ${token}`;
        // Multi-role custom header compatibility
        config.headers["x-admin-token"] = token;
        config.headers["x-employee-token"] = token;
      }

      // Add user role header if present
      const role = localStorage.getItem("userRole");
      if (role) {
        config.headers["x-role"] = role;
      }

      // Flag for AJAX requests
      config.headers["X-Requested-With"] = "XMLHttpRequest";
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
   * Helper to set / overwrite token in storage and runtime headers
   */
  setToken: (token, role = "admin") => {
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("token", token);
        if (role === "admin") {
          localStorage.setItem("adminToken", token);
        } else {
          localStorage.setItem("employeeToken", token);
        }
      }
    }
  },

  /**
   * Helper to clear auth tokens from storage
   */
  clearToken: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("employeeToken");
      localStorage.removeItem("adminData");
      localStorage.removeItem("employeeData");
      localStorage.removeItem("userRole");
    }
  },

  /**
   * Helper to retrieve currently stored token
   */
  getToken: () => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("employeeToken") ||
        null
      );
    }
    return null;
  },
};

export default api;
