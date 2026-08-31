import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useAuth } from "../context/AuthContext";
import Loading from "../ui/Loading";

const ProtectedRoute = ({ allowRole }) => {
  const location = useLocation();
  const { isLoading: isAdminLoading, adminExists, isAuthorized } = useAdminAuth();
  const { user, token, role: authRole } = useAuth();

  // If protecting an Admin route, use the comprehensive useAdminAuth hook
  if (allowRole === "admin") {
    if (isAdminLoading) {
      return <Loading />;
    }

    if (adminExists === false) {
      return <Navigate to="/admin/register" replace state={{ from: location }} />;
    }

    if (!isAuthorized) {
      return <Navigate to="/admin/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
  }

  // Employee role validation
  const stateRole = location.state?.role;
  const storedRole =
    typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
  const hasEmpToken =
    typeof window !== "undefined" &&
    (localStorage.getItem("employeeToken") || localStorage.getItem("token") || token);

  const role =
    authRole ||
    stateRole ||
    storedRole ||
    (location.pathname.startsWith("/employee") ? "employee" : "admin");

  if (role !== "employee" && !hasEmpToken && !user) {
    return <Navigate to="/employee/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

