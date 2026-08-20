import { Navigate, Outlet, useLocation } from "react-router-dom";

const ProtectedRoute = ({ allowRole }) => {
  const location = useLocation();
  const stateRole = location.state?.role;
  const storedRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;

  // Determine active role
  const role = stateRole || storedRole || (location.pathname.startsWith(`/${allowRole}`) ? allowRole : "admin");

  // Keep stored role in sync
  if (role && typeof window !== "undefined") {
    localStorage.setItem("userRole", role);
  }

  if (role !== allowRole) {
    return <Navigate to="/welcome" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
