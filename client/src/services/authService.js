import { apiService } from "../apis/axios";

/**
 * Centralized Authentication Service
 * Interacts with backend authentication endpoints and manages local auth sessions
 */
export const authService = {
  /**
   * Unified login method supporting both Administrator and Employee roles
   */
  login: async ({ identifier, email, password, role = "admin" }) => {
    const loginEmail = (identifier || email || "").trim();
    const loginPassword = password ? password.trim() : "";

    if (role === "admin") {
      const response = await apiService.post("/auth/admin/login", {
        email: loginEmail.toLowerCase(),
        password: loginPassword,
      });

      if (response.data?.success && response.data?.token) {
        authService.saveAuthSession({
          token: response.data.token,
          user: response.data.admin || response.data.user,
          role: "admin",
        });
      }
      return response.data;
    } else {
      const response = await apiService.post("/auth/employee/login", {
        email: loginEmail, // supports both email and employeeId
        password: loginPassword,
      });

      if (response.data?.success && response.data?.token) {
        authService.saveAuthSession({
          token: response.data.token,
          user: response.data.employee || response.data.user,
          role: "employee",
        });
      }
      return response.data;
    }
  },

  /**
   * Dedicated Admin login method
   */
  adminLogin: async (credentials) => {
    return authService.login({ ...credentials, role: "admin" });
  },

  /**
   * Dedicated Employee login method
   */
  employeeLogin: async (credentials) => {
    return authService.login({ ...credentials, role: "employee" });
  },

  /**
   * Checks if an administrator account has been set up in the database
   */
  checkAdminExists: async () => {
    const response = await apiService.get("/auth/admin/exists");
    return response.data;
  },

  /**
   * Registers primary admin account
   */
  registerAdmin: async (data) => {
    const response = await apiService.post("/auth/admin/register", data);
    if (response.data?.success && response.data?.token) {
      authService.saveAuthSession({
        token: response.data.token,
        user: response.data.admin || response.data.user,
        role: "admin",
      });
    }
    return response.data;
  },

  /**
   * Retrieves current authenticated user profile
   */
  getCurrentUser: async () => {
    const response = await apiService.get("/auth/me");
    return response.data;
  },

  /**
   * Logs out user from backend session and clears local storage
   */
  logout: async (role = "admin") => {
    try {
      if (role === "admin") {
        await apiService.post("/auth/admin/logout").catch(() => {});
      } else {
        await apiService.post("/auth/employee/logout").catch(() => {});
      }
      await apiService.post("/auth/logout").catch(() => {});
    } finally {
      authService.clearAuthSession();
    }
  },

  /**
   * Persists authentication session into browser storage
   */
  saveAuthSession: ({ token, user, role }) => {
    if (typeof window === "undefined") return;

    if (token) {
      localStorage.setItem("token", token);
      if (role === "admin") {
        localStorage.setItem("adminToken", token);
      } else {
        localStorage.setItem("employeeToken", token);
      }
    }

    if (role) {
      localStorage.setItem("userRole", role);
    }

    if (user) {
      const userPayload = JSON.stringify(user);
      if (role === "admin") {
        localStorage.setItem("adminData", userPayload);
      } else {
        localStorage.setItem("employeeData", userPayload);
      }
    }
  },

  /**
   * Clears all authentication session keys from browser storage
   */
  clearAuthSession: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("employeeToken");
    localStorage.removeItem("adminData");
    localStorage.removeItem("employeeData");
    localStorage.removeItem("userRole");
    localStorage.removeItem("isLoggedIn");
  },

  /**
   * Retrieves active JWT token
   */
  getStoredToken: () => {
    return apiService.getToken();
  },

  /**
   * Retrieves active stored user
   */
  getStoredUser: () => {
    if (typeof window === "undefined") return null;
    const role = localStorage.getItem("userRole");
    try {
      if (role === "employee") {
        const emp = localStorage.getItem("employeeData");
        return emp ? JSON.parse(emp) : null;
      }
      const admin = localStorage.getItem("adminData");
      return admin ? JSON.parse(admin) : null;
    } catch {
      return null;
    }
  },

  /**
   * Retrieves active stored role
   */
  getStoredRole: () => {
    if (typeof window === "undefined") return "admin";
    return localStorage.getItem("userRole") || "admin";
  },
};

export default authService;
