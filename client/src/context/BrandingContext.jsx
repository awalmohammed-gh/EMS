import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { brandingService } from "../services/brandingService";

const defaultBranding = {
  companyName: "Enterprise Organization",
  logoUrl: "/eyenit_logo.png",
  welcomeBackgroundUrl: "",
  primaryColor: "#0B1E48",
  contactEmail: "admin@company.com",
  isConfigured: false,
};

const getInitialBranding = () => {
  if (typeof window !== "undefined") {
    try {
      const stored =
        sessionStorage.getItem("org_branding") || localStorage.getItem("org_branding");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          return { ...defaultBranding, ...parsed };
        }
      }
    } catch (e) {
      console.warn("Error parsing stored branding:", e);
    }
  }
  return defaultBranding;
};

const BrandingContext = createContext({
  branding: defaultBranding,
  isConfigured: false,
  hasExistingCompany: false,
  requiresSetup: false,
  isLoading: true,
  refreshBranding: async () => {},
  setBranding: () => {},
});

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(getInitialBranding);
  const [isConfigured, setIsConfigured] = useState(false);
  const [hasExistingCompany, setHasExistingCompany] = useState(false);
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBranding = useCallback(async () => {
    try {
      const [brandRes, initRes, statusRes] = await Promise.allSettled([
        brandingService.getPublicBranding(),
        brandingService.getInitStatus(),
        brandingService.getCompanyStatus(),
      ]);

      if (brandRes.status === "fulfilled" && brandRes.value?.success) {
        const comp = brandRes.value.company || brandRes.value;
        setBranding((prev) => {
          const merged = {
            ...prev,
            ...comp,
            companyName: comp.companyName || comp.name || prev.companyName,
            logoUrl: comp.logoUrl || comp.logo || prev.logoUrl || "/eyenit_logo.png",
            welcomeBackgroundUrl:
              comp.welcomeBackgroundUrl || comp.backgroundUrl || prev.welcomeBackgroundUrl || "",
            primaryColor:
              comp.primaryColor || comp.themeColor || comp.themeColors?.primary || prev.primaryColor,
          };
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem("org_branding", JSON.stringify(merged));
              localStorage.setItem("org_branding", JSON.stringify(merged));
            } catch (err) {
              console.debug("Failed caching branding:", err);
            }
          }
          return merged;
        });
      }

      if (initRes.status === "fulfilled" && initRes.value?.success) {
        const hasExisting = Boolean(initRes.value.hasExistingCompany);
        const configured = Boolean(initRes.value.isConfigured);
        setHasExistingCompany(hasExisting);
        setIsConfigured(configured);
        setRequiresSetup(!hasExisting || !configured);
      } else if (statusRes.status === "fulfilled" && statusRes.value?.success) {
        const configured = Boolean(statusRes.value.isConfigured);
        setIsConfigured(configured);
        setHasExistingCompany(configured);
        setRequiresSetup(Boolean(statusRes.value.requiresSetup));
      }
    } catch (err) {
      console.warn("[BrandingProvider] Refresh branding warning:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  // Apply primary color to CSS custom property and sync document title
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (branding.primaryColor) {
        document.documentElement.style.setProperty("--brand-primary", branding.primaryColor);
      }
      if (branding.companyName && branding.companyName !== "Enterprise Organization") {
        document.title = `${branding.companyName} | Management System`;
      }
    }
  }, [branding.primaryColor, branding.companyName]);

  return (
    <BrandingContext.Provider
      value={{
        branding,
        isConfigured,
        hasExistingCompany,
        requiresSetup,
        isLoading,
        refreshBranding,
        setBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
};

export { useCompanyBranding } from "../hooks/useCompanyBranding";

export default BrandingContext;
