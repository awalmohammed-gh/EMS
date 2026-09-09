import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useAuth } from "../context/AuthContext";
import Loading from "../ui/Loading";

const ProtectedRoute = ({ allowRole }) => {
  const location = useLocation();
  const { isLoading: isAdminLoading, adminExists, isAuthorized } = useAdminAuth();
  const { user, role: authRole, isLoading: isAuthLoading } = useAuth();

  const effectiveRole = authRole || user?.role || null;

  // Await full hydration before any redirect evaluation
  if (isAuthLoading || (allowRole === "admin" && isAdminLoading)) {
    return <Loading />;
  }

  // If protecting an Admin route
  if (allowRole === "admin") {
    if (adminExists === false) {
      return <Navigate to="/admin/register" replace state={{ from: location }} />;
    }

    // Explicitly reject logged-in employees attempting to access admin routes
    if (user && effectiveRole === "employee" && !isAuthorized) {
      return <Navigate to="/employee/dashboard" replace state={{ from: location }} />;
    }

    const isAdminUser =
      Boolean(user) &&
      (effectiveRole === "admin" || effectiveRole === "super_admin" || isAuthorized);

    if (!isAdminUser) {
      return <Navigate to="/admin/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
  }

  // If protecting an Employee route
  if (allowRole === "employee") {
    const isEmployeeAuthenticated =
      Boolean(user) &&
      (effectiveRole === "employee" ||
        effectiveRole === "admin" ||
        effectiveRole === "super_admin" ||
        isAuthorized ||
        Boolean(user?.employeeId));

    if (!isEmployeeAuthenticated) {
      return <Navigate to="/employee/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
