import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import WorkspaceLoader from "../components/ui/WorkspaceLoader";

/**
 * EmployeeRoute Wrapper
 * Validates authenticated employee session.
 * Displays the dynamic WorkspaceLoader during session verification.
 */
export const EmployeeRoute = ({ children }) => {
  const location = useLocation();
  const { user, role: authRole, isLoading, isInitializing } = useAuth();

  // Wait for persistent session check on mount / page refresh
  if (isInitializing || isLoading) {
    return <WorkspaceLoader fullScreen />;
  }

  const effectiveRole = authRole || user?.role || null;

  // Unauthenticated visitors redirect to Employee Login
  if (!user) {
    return <Navigate to="/employee/login" replace state={{ from: location }} />;
  }

  // Company Admins / Managers attempting to access employee self-service are redirected
  if (effectiveRole === "admin" || effectiveRole === "company_admin") {
    return <Navigate to="/admin/dashboard" replace state={{ from: location }} />;
  }

  return children ? children : <Outlet />;
};

export default EmployeeRoute;
