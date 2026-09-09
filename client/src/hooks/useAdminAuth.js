import { useState, useEffect, useCallback } from "react";
import { checkAdminExists, getAdminMe } from "../apis/fontApis";
import { useManagement } from "../context/ManagementContextProvider";

/**
 * Custom React hook that verifies the existence of an admin account on mount
 * and provides a loading and authorized state to protect Admin dashboard routes.
 * Relies strictly on HTTP-only cookies and in-memory context state with zero localStorage.
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

      // 2. Check context user role
      if (user && (user.role === "admin" || user.role === "super_admin" || role === "admin")) {
        setIsAuthorized(true);
        setIsLoading(false);
        return { adminExists: true, isAuthorized: true };
      }

      // If user is actively logged in as employee, deny admin access
      if (user && user.role === "employee" && !user.role?.includes("admin")) {
        setIsAuthorized(false);
        setIsLoading(false);
        return { adminExists: true, isAuthorized: false };
      }

      // 3. Attempt server verification via HTTP-only cookie
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
        // Cookie missing or not authorized
      }

      setIsAuthorized(false);
      setIsLoading(false);
      return { adminExists: true, isAuthorized: false };
    } catch (err) {
      console.warn("useAdminAuth verification error:", err);
      setError(err.message || "Failed to verify admin status.");
      const hasAdminAuth = role === "admin" || user?.role === "admin" || user?.role === "super_admin";
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
