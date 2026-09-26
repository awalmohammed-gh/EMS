import { Link, useNavigate } from "react-router-dom";
import DefaultPlatformLogo from "./DefaultPlatformLogo";

/**
 * PublicHeader
 * Pre-authentication header/navbar used strictly for public-facing routes.
 * Strictly uses default SaaS platform branding and does NOT fetch or display tenant company logos.
 */
export const PublicHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Default Platform Branding */}
          <Link to="/" className="flex items-center gap-3 select-none">
            <DefaultPlatformLogo className="w-10 h-10" />
            <span className="text-lg font-black tracking-tight text-[#0B1E48] dark:text-white leading-tight">
              WorkPulse
            </span>
          </Link>

          {/* Public Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/welcome")}
              className="px-4 py-2 text-xs font-semibold text-[#002185] dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/auth")}
              className="px-4 py-2 text-xs font-bold text-white bg-[#002185] hover:bg-[#ff5500] dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl transition shadow-xs"
            >
              Management Login
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;
