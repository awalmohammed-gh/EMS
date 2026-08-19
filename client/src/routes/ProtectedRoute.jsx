import { Navigate, Outlet, useLocation } from "react-router-dom";

const ProtectedRoute = ({ allowRole }) => {
  const location = useLocation();
  const role = location.state?.role || "admin";

  if (role !== allowRole) {
    return <Navigate to="/welcome" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
