import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getAuthMe,
  getAdminMe,
  getEmployee,
  authLogout,
  adminLogout,
  employeeLogout,
} from "../apis/fontApis";

const AuthContext = createContext(null);

/**
 * Safely decodes a JWT token string payload in browser environment
 */
const parseJwt = (token) => {
  try {
    if (!token || typeof token !== "string") return null;
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const storedRole = localStorage.getItem("userRole");
        if (storedRole === "employee" || window.location.pathname.startsWith("/employee")) {
          const storedEmp = localStorage.getItem("employeeData");
          if (storedEmp) return JSON.parse(storedEmp);
        } else {
          const storedAdmin = localStorage.getItem("adminData");
          if (storedAdmin) return JSON.parse(storedAdmin);
        }

        const token =
          localStorage.getItem("token") ||
          localStorage.getItem("adminToken") ||
          localStorage.getItem("employeeToken");
        if (token) {
          const decoded = parseJwt(token);
          if (decoded) {
            return {
              _id: decoded.id || decoded._id,
              id: decoded.id || decoded._id,
              fullName: decoded.fullName || (decoded.role === "admin" ? "Admin" : "Employee"),
              email: decoded.email || "",
              role: decoded.role || (window.location.pathname.startsWith("/employee") ? "employee" : "admin"),
              employeeId: decoded.employeeId || "",
            };
          }
        }
      } catch (e) {
        console.warn("AuthContext user initial state error:", e);
      }
    }
    return null;
  });

  const [role, setRole] = useState(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname.startsWith("/employee")) return "employee";
      if (window.location.pathname.startsWith("/admin")) return "admin";
      return localStorage.getItem("userRole") || (localStorage.getItem("employeeToken") ? "employee" : "admin");
    }
    return "admin";
  });

  const [token, setToken] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("employeeToken") ||
        null
      );
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Synchronize and refresh active user state from server
  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const activeToken =
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("employeeToken");

      if (!activeToken) {
        setIsLoading(false);
        return null;
      }

      // Try getAuthMe
      try {
        const { data } = await getAuthMe();
        if (data && data.success && data.user) {
          setUser(data.user);
          const resolvedRole = data.role || data.user.role || (data.user.employeeId ? "employee" : "admin");
          setRole(resolvedRole);
          localStorage.setItem("userRole", resolvedRole);
          if (resolvedRole === "admin") {
            localStorage.setItem("adminData", JSON.stringify(data.user));
          } else {
            localStorage.setItem("employeeData", JSON.stringify(data.user));
          }
          setIsLoading(false);
          return data.user;
        }
      } catch (err) {
        console.warn("getAuthMe query fallback:", err?.message || err);
      }

      // Fallback based on stored role
      const storedRole = localStorage.getItem("userRole") || role;
      if (storedRole === "admin") {
        try {
          const { data } = await getAdminMe();
          if (data && (data.admin || data.user)) {
            const adminDoc = data.admin || data.user;
            setUser(adminDoc);
            setRole("admin");
            localStorage.setItem("adminData", JSON.stringify(adminDoc));
            localStorage.setItem("userRole", "admin");
            setIsLoading(false);
            return adminDoc;
          }
        } catch {
          // ignore
        }
      } else {
        try {
          const { data } = await getEmployee();
          if (data && (data.employee || data.user)) {
            const empDoc = data.employee || data.user;
            setUser(empDoc);
            setRole("employee");
            localStorage.setItem("employeeData", JSON.stringify(empDoc));
            localStorage.setItem("userRole", "employee");
            setIsLoading(false);
            return empDoc;
          }
        } catch {
          // ignore
        }
      }
    } catch (error) {
      console.warn("Error refreshing auth user:", error);
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Login handler
  const login = (userData, userRole = "admin", userToken = null) => {
    setUser(userData);
    setRole(userRole);
    if (userToken) setToken(userToken);

    localStorage.setItem("userRole", userRole);
    if (userRole === "admin") {
      localStorage.setItem("adminData", JSON.stringify(userData));
      if (userToken) {
        localStorage.setItem("adminToken", userToken);
        localStorage.setItem("token", userToken);
      }
    } else {
      localStorage.setItem("employeeData", JSON.stringify(userData));
      if (userToken) {
        localStorage.setItem("employeeToken", userToken);
        localStorage.setItem("token", userToken);
      }
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      if (role === "admin") {
        await adminLogout().catch(() => {});
      } else {
        await employeeLogout().catch(() => {});
      }
      await authLogout().catch(() => {});
    } catch (e) {
      console.warn("Logout API call error:", e);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem("token");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("employeeToken");
      localStorage.removeItem("adminData");
      localStorage.removeItem("employeeData");
      localStorage.removeItem("userRole");
      localStorage.removeItem("isLoggedIn");
    }
  };

  const isAuthenticated = Boolean(user || token);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        role,
        setRole,
        token,
        setToken,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
