import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useAuth } from "../context/AuthContext";
import WorkspaceLoader from "../components/ui/WorkspaceLoader";

const ProtectedRoute = ({ allowRole }) => {
  const location = useLocation();
  const { user, role: authRole, isLoading: isAuthLoading, isInitializing } = useAuth();
  const { isLoading: isAdminLoading, adminExists, isAuthorized } = useAdminAuth();

  const effectiveRole = authRole || user?.role || null;

  // Ensure that when a user refreshes the page, the application waits for the session check
  // to complete before deciding to redirect, thus preserving the current route
  if (isInitializing || isAuthLoading || (allowRole === "admin" && isAdminLoading)) {
    return (
      <WorkspaceLoader
        fullScreen
        mode="auto"
      />
    );
  }

  // Session check completed. If there is no authenticated user, redirect to Admin Auth
  if (!user) {
    return <Navigate to="/admin/auth" replace state={{ from: location }} />;
  }

  // If protecting an Admin route
  if (allowRole === "admin") {
    if (adminExists === false) {
      return <Navigate to="/admin/auth" replace state={{ from: location }} />;
    }

    // Explicitly reject logged-in employees attempting to access admin routes
    if (effectiveRole === "employee" && !isAuthorized && user?.role !== "admin") {
      return <Navigate to="/employee/dashboard" replace state={{ from: location }} />;
    }

    const isAdminUser =
      effectiveRole === "admin" ||
      effectiveRole === "company_admin" ||
      effectiveRole === "manager" ||
      isAuthorized ||
      user?.role === "admin";

    if (!isAdminUser) {
      return <Navigate to="/admin/auth" replace state={{ from: location }} />;
    }

    return <Outlet />;
  }

  // If protecting an Employee route
  if (allowRole === "employee") {
    const isEmployeeAuthenticated =
      effectiveRole === "employee" ||
      effectiveRole === "admin" ||
      effectiveRole === "manager" ||
      isAuthorized ||
      Boolean(user?.employeeId) ||
      Boolean(user?._id || user?.id);

    if (!isEmployeeAuthenticated) {
      return <Navigate to="/admin/auth" replace state={{ from: location }} />;
    }

    return <Outlet />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
