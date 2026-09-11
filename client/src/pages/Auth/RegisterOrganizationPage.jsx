import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { OnboardingWizard } from "../../components/OnboardingWizard";

/**
 * RegisterOrganizationPage
 * Streamlined commercial workspace provisioning gateway.
 * Embeds the 2-step OnboardingWizard with Framer Motion transitions.
 */
export const RegisterOrganizationPage = () => {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Register Your Organization | WorkPulse";
    }
  }, []);

  return (
    <div
      id="register-organization-page"
      className="min-h-screen bg-[#F4F7FB] flex flex-col justify-between items-center px-4 py-8 relative selection:bg-[#0B1E48]/10 selection:text-[#0B1E48] font-sans"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/35 via-transparent to-transparent pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="relative z-10 w-full max-w-3xl flex items-center justify-between py-2 mb-2">
        <Link
          to="/"
          id="btn-back-home"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0B1E48] transition-colors group"
        >
          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center group-hover:border-slate-300">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <span>Back to WorkPulse</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Already registered?
          </span>
          <Link
            to="/admin/login"
            id="link-nav-admin-login"
            className="text-xs font-bold text-[#0B1E48] hover:underline px-2 py-1"
          >
            Management Login &rarr;
          </Link>
        </div>
      </header>

      {/* Main Registration Wizard Container */}
      <main className="relative z-10 w-full max-w-3xl my-auto py-4">
        {/* Header Copy */}
        <div className="text-center max-w-xl mx-auto mb-6">
          <h1
            id="register-org-title"
            className="text-3xl font-extrabold text-[#0B1E48] tracking-tight mb-2"
          >
            Register Your Organization
          </h1>
          <p
            id="register-org-subtitle"
            className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto"
          >
            Provision your company workspace and administrative credentials in three simple steps.
          </p>
        </div>

        {/* 2-Step Onboarding Wizard Component */}
        <OnboardingWizard />

        {/* Existing organization link */}
        <div className="mt-6 pt-4 border-t border-slate-200/60 text-center">
          <Link
            to="/admin/login"
            id="link-footer-admin-login"
            className="text-xs font-semibold text-slate-600 hover:text-[#0B1E48] inline-flex items-center gap-1.5"
          >
            <span>Already registered?</span>
            <span className="text-[#0B1E48] font-bold hover:underline">
              Sign in with personal or company email &rarr;
            </span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-3xl text-center py-2 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} WorkPulse Enterprise Platform. All rights reserved.
      </footer>
    </div>
  );
};

export default RegisterOrganizationPage;
