import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "../hooks/useAdminAuth";
import Loading from "../ui/Loading";

const ProtectedRoute = ({ allowRole }) => {
  const location = useLocation();
  const { isLoading, adminExists, isAuthorized } = useAdminAuth();

  // If protecting an Admin route, use the comprehensive useAdminAuth hook
  if (allowRole === "admin") {
    if (isLoading) {
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
    (localStorage.getItem("employeeToken") || localStorage.getItem("token"));

  const role =
    stateRole ||
    storedRole ||
    (location.pathname.startsWith("/employee") ? "employee" : "admin");

  if (role !== "employee" && !hasEmpToken) {
    return <Navigate to="/employee/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
