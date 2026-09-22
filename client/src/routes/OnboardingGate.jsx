import { Navigate, useLocation } from "react-router-dom";
import { useBranding } from "../context/BrandingContext";
import WorkspaceLoader from "../components/ui/WorkspaceLoader";

export const OnboardingGate = ({ children }) => {
  const { requiresSetup, hasExistingCompany, isConfigured, isLoading } = useBranding();
  const location = useLocation();

  if (isLoading) {
    return <WorkspaceLoader fullScreen />;
  }

  const isSetupOrLandingRoute =
    location.pathname === "/setup" ||
    location.pathname === "/setup-admin" ||
    location.pathname === "/setup-company" ||
    location.pathname === "/" ||
    location.pathname === "/landing" ||
    location.pathname === "/welcome" ||
    location.pathname === "/admin/login" ||
    location.pathname === "/admin/auth" ||
    location.pathname === "/management/login" ||
    location.pathname === "/login" ||
    location.pathname === "/employee/login";

  // If no company exists or setup is required and user is not on an allowed route, redirect to /admin/login?mode=signup
  const needsInitialization = requiresSetup || !hasExistingCompany || !isConfigured;
  if (needsInitialization && !isSetupOrLandingRoute) {
    return <Navigate to="/admin/login?mode=signup" replace />;
  }

  return children;
};

export default OnboardingGate;
