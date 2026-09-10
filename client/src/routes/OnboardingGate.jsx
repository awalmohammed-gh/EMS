import { Navigate, useLocation } from "react-router-dom";
import { useBranding } from "../context/BrandingContext";

export const OnboardingGate = ({ children }) => {
  const { requiresSetup, hasExistingCompany, isConfigured, isLoading } = useBranding();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B111E]">
        <div className="w-8 h-8 rounded-full border-2 border-[#0B1E48] dark:border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const isSetupRoute = location.pathname === "/setup" || location.pathname === "/setup-admin";

  // If no company exists or setup is required and user is not on /setup, redirect to /setup
  const needsInitialization = requiresSetup || !hasExistingCompany || !isConfigured;
  if (needsInitialization && !isSetupRoute) {
    return <Navigate to="/setup" replace />;
  }

  return children;
};

export default OnboardingGate;
