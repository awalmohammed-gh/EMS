import { useState, useEffect, useCallback } from "react";
import { checkAdminExists, getAdminMe } from "../apis/fontApis";
import { useManagement } from "../context/ManagementContextProvider";

/**
 * Custom React hook that verifies the existence of an admin account on mount
 * and provides a loading and authorized state to protect Admin dashboard routes.
 */
export const useAdminAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [adminExists, setAdminExists] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState(null);

  const { user, role, setUser, setRole } = useManagement();

  const verifyAdminStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Check if an admin account exists in the database
      const existsRes = await checkAdminExists();
      const exists = Boolean(existsRes.data?.exists);
      setAdminExists(exists);

      if (!exists) {
        // No admin registered yet -> self-setup is required
        setIsAuthorized(false);
        setIsLoading(false);
        return { adminExists: false, isAuthorized: false };
      }

      // 2. Check client-side stored session tokens and credentials
      const storedRole =
        typeof window !== "undefined"
          ? localStorage.getItem("userRole")
          : null;
      const storedAdminData =
        typeof window !== "undefined"
          ? localStorage.getItem("adminData")
          : null;
      const adminToken =
        typeof window !== "undefined"
          ? localStorage.getItem("adminToken")
          : null;

      // If actively logged in as standard employee without admin credentials, strictly deny admin access
      if (storedRole === "employee" && !adminToken && !storedAdminData) {
        setIsAuthorized(false);
        setIsLoading(false);
        return { adminExists: exists, isAuthorized: false };
      }

      const token =
        adminToken ||
        (typeof window !== "undefined" && storedRole === "admin"
          ? localStorage.getItem("token")
          : null);

      // If user is already set in context with admin role
      if (user && (user.role === "admin" || role === "admin")) {
        setIsAuthorized(true);
        setIsLoading(false);
        return { adminExists: true, isAuthorized: true };
      }

      // If tokens or stored admin data exist, attempt verification
      if (token || storedRole === "admin" || storedAdminData) {
        try {
          const profileRes = await getAdminMe();
          if (profileRes.data?.success && profileRes.data?.admin) {
            const adminUser = profileRes.data.admin;
            if (setUser) setUser(adminUser);
            if (setRole) setRole("admin");
            setIsAuthorized(true);
            setIsLoading(false);
            return { adminExists: true, isAuthorized: true };
          }
        } catch {
          // If profile endpoint returns 401 or offline, fallback to valid stored admin session
          if (storedRole === "admin" && storedAdminData) {
            try {
              const parsed = JSON.parse(storedAdminData);
              if (parsed && (parsed.email || parsed.id || parsed._id)) {
                if (setUser) setUser(parsed);
                if (setRole) setRole("admin");
                setIsAuthorized(true);
                setIsLoading(false);
                return { adminExists: true, isAuthorized: true };
              }
            } catch {
              // ignore json parse error
            }
          }
        }
      }

      setIsAuthorized(false);
      setIsLoading(false);
      return { adminExists: true, isAuthorized: false };
    } catch (err) {
      console.warn("useAdminAuth verification error:", err);
      setError(err.message || "Failed to verify admin status.");
      // Graceful fallback for offline/transient state
      const storedRole =
        typeof window !== "undefined"
          ? localStorage.getItem("userRole")
          : null;
      const hasAdminAuth =
        role === "admin" ||
        storedRole === "admin" ||
        Boolean(localStorage.getItem("adminData"));

      setAdminExists(true);
      setIsAuthorized(hasAdminAuth);
      setIsLoading(false);
      return { adminExists: true, isAuthorized: hasAdminAuth };
    }
  }, [user, role, setUser, setRole]);

  useEffect(() => {
    let isMounted = true;

    verifyAdminStatus().then(() => {
      if (!isMounted) return;
    });

    return () => {
      isMounted = false;
    };
  }, [verifyAdminStatus]);

  return {
    isLoading,
    loading: isLoading,
    adminExists,
    isAuthorized,
    isAuthenticated: isAuthorized,
    user,
    error,
    recheck: verifyAdminStatus,
  };
};

export default useAdminAuth;
