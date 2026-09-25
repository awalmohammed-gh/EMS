import { Navigate, useLocation } from "react-router-dom";
import { useBranding } from "../context/BrandingContext";
import WorkspaceLoader from "../components/ui/WorkspaceLoader";

export const OnboardingGate = ({ children }) => {
  const { requiresSetup, hasExistingCompany, isConfigured, isLoading } = useBranding();
  const location = useLocation();

  if (isLoading) {
    return <WorkspaceLoader fullScreen />;
  }

  const isSetupRoute =
    location.pathname === "/setup" ||
    location.pathname === "/system-setup" ||
    location.pathname === "/admin/setup" ||
    location.pathname === "/setup-admin" ||
    location.pathname === "/setup-company";

  // If no company exists or setup is required, redirect to initial setup wizard /setup
  const needsInitialization = requiresSetup || !hasExistingCompany || !isConfigured;
  if (needsInitialization && !isSetupRoute) {
    return <Navigate to="/setup" replace />;
  }

  return children;
};

export default OnboardingGate;
