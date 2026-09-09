import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, apiService } from "../apis/axios";
import { adminLogout, employeeLogout } from "../apis/fontApis";

const AuthContext = createContext(null);

/**
 * Authentication Context Provider
 * Strictly uses HTTP-only cookie-based authentication with zero localStorage usage.
 * Automatically hydratres user session from /api/auth/me on initial page load and refresh.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dedicated Session Hydration
  const checkAuthSession = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.data?.success && res.data?.user) {
        const fetchedUser = res.data.user;
        setUser(fetchedUser);

        // If employee has an active ongoing shift returned by session endpoint, notify attendance listeners
        if (res.data.activeShift || res.data.hasActiveShift) {
          const ongoing = res.data.activeShift || res.data.todayRecord;
          if (ongoing && typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("attendance-updated", {
                detail: { action: "auth_me_active_shift", data: ongoing },
              })
            );
          }
        }
        return fetchedUser;
      } else {
        setUser(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthSession();
  }, [checkAuthSession]);

  // Login handler updating in-memory state and tokens
  const login = (userData, userRole = "admin", userToken = null, authPayload = null) => {
    if (userToken) {
      apiService.setToken(userToken);
    }
    const resolvedRole = userData?.role || userRole;
    const resolvedUser = userData
      ? {
          ...userData,
          role: resolvedRole,
        }
      : null;
    setUser(resolvedUser);

    // If attendance information is attached, notify client components
    if (authPayload && typeof window !== "undefined") {
      const activeShift = authPayload.activeShift;
      const todayRec = authPayload.todayRecord || authPayload.attendance;
      const ongoing =
        activeShift ||
        (todayRec && (todayRec.clockIn || todayRec.clockInTime) && (!todayRec.clockOut && !todayRec.clockOutTime)
          ? todayRec
          : null);

      if (ongoing) {
        window.dispatchEvent(
          new CustomEvent("attendance-updated", {
            detail: { action: "auth_login_shift", data: ongoing },
          })
        );
      } else if (todayRec) {
        window.dispatchEvent(
          new CustomEvent("attendance-updated", {
            detail: { action: "auth_login_record", data: todayRec },
          })
        );
      }
    }
  };

  // Logout handler clearing cookies and local tokens
  const logout = async () => {
    try {
      await api.post("/auth/logout").catch(() => {});
      if (user?.role === "admin") {
        await adminLogout().catch(() => {});
      } else {
        await employeeLogout().catch(() => {});
      }
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      apiService.clearToken();
      setUser(null);
    }
  };

  const role =
    user?.role ||
    (typeof window !== "undefined" && window.location.pathname.startsWith("/employee")
      ? "employee"
      : "admin");

  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        role,
        setRole: (newRole) => {
          setUser((prev) => (prev ? { ...prev, role: newRole } : prev));
        },
        token: user ? "cookie-session" : null,
        setToken: () => {},
        isAuthenticated,
        loading,
        isLoading: loading,
        login,
        logout,
        refreshUser: checkAuthSession,
        checkAuthSession,
      }}
    >
      {!loading && children}
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
