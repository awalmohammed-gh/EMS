import { useMemo } from "react";
import { Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useBranding } from "../../context/BrandingContext";

/**
 * Safely extracts cached branding context from web storage
 * to eliminate layout flash during initial page load before React state hydrates.
 */
const getStorageCache = () => {
  if (typeof window === "undefined") return {};
  try {
    const adminData =
      sessionStorage.getItem("adminData") || localStorage.getItem("adminData");
    let parsedAdmin = null;
    if (adminData) {
      try {
        parsedAdmin = JSON.parse(adminData);
      } catch {
        // ignore
      }
    }

    const employeeData =
      sessionStorage.getItem("employeeData") || localStorage.getItem("employeeData");
    let parsedEmployee = null;
    if (employeeData) {
      try {
        parsedEmployee = JSON.parse(employeeData);
      } catch {
        // ignore
      }
    }

    return {
      admin: parsedAdmin,
      employee: parsedEmployee,
    };
  } catch {
    return {};
  }
};

/**
 * WorkspaceLoader
 * 
 * Clean, single-company system loading component that displays the company branding,
 * name, and animated loader during session verification or route transitions.
 */
export const WorkspaceLoader = ({
  companyName: propCompanyName,
  title,
  message,
  subtext,
  logoUrl: propLogoUrl,
  fullScreen = true,
  compact = false,
  className = "",
}) => {
  const authContext = useAuth();
  const brandingContext = useBranding();

  const user = authContext?.user;
  const cache = useMemo(() => getStorageCache(), []);

  const resolvedCompanyName = useMemo(() => {
    if (propCompanyName && typeof propCompanyName === "string" && propCompanyName.trim()) {
      return propCompanyName.trim();
    }

    if (brandingContext?.companyName && brandingContext.companyName.trim()) {
      return brandingContext.companyName.trim();
    }

    const userCompany =
      user?.company?.name ||
      user?.company?.companyName ||
      user?.companyName;
    if (userCompany && typeof userCompany === "string" && userCompany.trim()) {
      return userCompany.trim();
    }

    const cachedOrg =
      cache.admin?.company?.name ||
      cache.admin?.companyName ||
      cache.employee?.company?.name ||
      cache.employee?.companyName;
    if (cachedOrg && typeof cachedOrg === "string" && cachedOrg.trim()) {
      return cachedOrg.trim();
    }

    return "WorkPulse";
  }, [propCompanyName, brandingContext, user, cache]);

  // Resolve Logo & Brand Theme
  const resolvedLogoUrl = useMemo(() => {
    return (
      propLogoUrl ||
      brandingContext?.logoUrl ||
      user?.company?.logoUrl ||
      null
    );
  }, [propLogoUrl, brandingContext, user]);

  const primaryColor = useMemo(() => {
    return (
      brandingContext?.primaryColor ||
      "#0B1E48" // WorkPulse Navy
    );
  }, [brandingContext]);

  // Monogram Initials
  const monogram = useMemo(() => {
    if (!resolvedCompanyName || resolvedCompanyName === "WorkPulse") return "WP";
    const words = resolvedCompanyName.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return resolvedCompanyName.slice(0, 2).toUpperCase();
  }, [resolvedCompanyName]);

  // Dynamic Titles and Subtext
  const displayTitle = useMemo(() => {
    if (title) return title;
    if (resolvedCompanyName && resolvedCompanyName !== "WorkPulse") {
      return `Loading ${resolvedCompanyName}...`;
    }
    return "Loading WorkPulse...";
  }, [title, resolvedCompanyName]);

  const displaySubtitle = useMemo(() => {
    if (subtext) return subtext;
    if (message) return message;
    return "Verifying secure session and loading workforce data...";
  }, [subtext, message]);

  // Compact Render
  if (compact) {
    return (
      <div
        id="workspace-loader-compact"
        className={`flex items-center gap-3 py-3 px-4 text-slate-600 dark:text-slate-300 ${className}`}
        role="status"
        aria-live="polite"
      >
        <svg
          className="w-4 h-4 animate-spin shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <div className="flex items-center gap-2 text-xs font-medium truncate">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {resolvedCompanyName}
          </span>
          <span className="text-slate-400 dark:text-slate-500">•</span>
          <span className="text-slate-500 dark:text-slate-400 truncate">{displaySubtitle}</span>
        </div>
      </div>
    );
  }

  const cardContent = (
    <div
      id="workspace-loader-card"
      className="relative flex flex-col items-center justify-center text-center max-w-sm w-full mx-auto px-6 py-8 select-none"
    >
      {/* Brand Icon / Logo / Monogram Container with Animated Pulse & SVG Ring */}
      <div className="relative mb-6">
        <div
          className="absolute -inset-3 rounded-3xl opacity-20 dark:opacity-25 blur-lg transition-all animate-pulse"
          style={{ backgroundColor: primaryColor }}
        />

        <div
          id="workspace-loader-monogram"
          className="relative w-20 h-20 rounded-2xl bg-white dark:bg-[#0B132B] border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center p-3 transition-colors overflow-hidden"
        >
          {resolvedLogoUrl ? (
            <img
              src={resolvedLogoUrl}
              alt={resolvedCompanyName}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div
              className="w-full h-full rounded-xl flex items-center justify-center text-white font-bold text-2xl tracking-wider shadow-none"
              style={{ backgroundColor: primaryColor }}
            >
              {monogram}
            </div>
          )}

          <svg
            className="absolute inset-0 w-full h-full animate-spin pointer-events-none p-0.5"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="24"
              cy="24"
              r="22"
              stroke={primaryColor}
              strokeWidth="2.5"
              strokeDasharray="40 100"
              strokeLinecap="round"
              className="opacity-80"
            />
          </svg>
        </div>
      </div>

      <div className="mb-3">
        <span
          id="workspace-loader-badge-company"
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80"
        >
          <Building2 className="w-3 h-3 text-slate-400" />
          {resolvedCompanyName}
        </span>
      </div>

      <h2
        id="workspace-loader-title"
        className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white"
      >
        {displayTitle}
      </h2>

      <p
        id="workspace-loader-subtext"
        className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-xs"
      >
        {displaySubtitle}
      </p>

      <div className="w-36 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mt-6 overflow-hidden relative">
        <div
          className="h-full rounded-full animate-[pulse_1.5s_ease-in-out_infinite]"
          style={{
            backgroundColor: primaryColor,
            width: "60%",
            marginLeft: "20%",
          }}
        />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        id="workspace-loader-fullscreen"
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#070B14] text-slate-900 dark:text-white p-4 transition-colors ${className}`}
        role="status"
        aria-live="polite"
      >
        {cardContent}
      </div>
    );
  }

  return (
    <div
      id="workspace-loader-inline"
      className={`flex flex-col items-center justify-center py-16 px-4 w-full min-h-[280px] bg-transparent text-slate-900 dark:text-white ${className}`}
      role="status"
      aria-live="polite"
    >
      {cardContent}
    </div>
  );
};

export default WorkspaceLoader;
