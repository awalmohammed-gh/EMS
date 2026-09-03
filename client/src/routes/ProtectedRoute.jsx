import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useAuth } from "../context/AuthContext";
import Loading from "../ui/Loading";

const ProtectedRoute = ({ allowRole }) => {
  const location = useLocation();
  const { isLoading: isAdminLoading, adminExists, isAuthorized } = useAdminAuth();
  const { user, token, role: authRole, isLoading: isAuthLoading } = useAuth();

  const storedRole =
    typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
  const hasEmpToken =
    typeof window !== "undefined" &&
    Boolean(localStorage.getItem("employeeToken") || (storedRole === "employee" && localStorage.getItem("token")));
  const hasAdminToken =
    typeof window !== "undefined" &&
    Boolean(localStorage.getItem("adminToken") || (storedRole === "admin" && localStorage.getItem("token")));

  const effectiveRole = authRole || storedRole || (user?.role ? user.role : null);

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
    if ((effectiveRole === "employee" || hasEmpToken) && !isAuthorized && !hasAdminToken) {
      return <Navigate to="/employee/dashboard" replace state={{ from: location }} />;
    }

    if (!isAuthorized && !hasAdminToken) {
      return <Navigate to="/admin/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
  }

  // If protecting an Employee route
  if (allowRole === "employee") {
    const isEmployeeAuthenticated =
      effectiveRole === "employee" ||
      hasEmpToken ||
      Boolean(user && (user.role === "employee" || user.employeeId)) ||
      (effectiveRole === "admin" || isAuthorized); // Admins can preview/inspect employee portal

    if (!isEmployeeAuthenticated && !token && !hasEmpToken) {
      return <Navigate to="/employee/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
