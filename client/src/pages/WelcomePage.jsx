import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  User,
  ArrowRight,
  Building2,
  Sparkles,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { brandingService } from "../services/brandingService";

export const WelcomePage = () => {
  const navigate = useNavigate();
  const [branding, setBranding] = useState({
    companyName: "WorkPulse",
    logoUrl: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
  });

  useEffect(() => {
    let isMounted = true;
    brandingService
      .getPublicBranding()
      .then((data) => {
        if (!isMounted) return;
        const brand = data?.branding || data?.company || data || {};
        setBranding({
          companyName: brand.companyName || brand.name || "WorkPulse",
          logoUrl: brand.logoUrl || brand.logo || brand.companyLogo || "",
          contactEmail: brand.contactEmail || brand.email || "",
          contactPhone: brand.contactPhone || brand.phone || "",
          address: brand.address || "",
        });
        if (typeof document !== "undefined") {
          document.title = `${brand.companyName || "WorkPulse"} | Authentication Portal`;
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      id="workpulse-welcome-portal"
      className="min-h-screen w-full bg-[#F4F7FB] dark:bg-slate-950 flex flex-col justify-between font-sans selection:bg-[#0B1E48]/10 selection:text-[#0B1E48]"
    >
      {/* Background Subtle Accent */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-500/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[450px] h-[300px] bg-indigo-500/5 blur-[90px] rounded-full" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 p-1 shadow-2xs border border-slate-200/80 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={branding.logoUrl}
                alt={branding.companyName}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = "flex";
                  }
                }}
              />
              <div className="hidden w-full h-full items-center justify-center bg-[#0B1E48] text-white font-bold text-sm rounded-lg">
                {branding.companyName.charAt(0).toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#0B1E48] text-white p-2 shadow-2xs flex items-center justify-center border border-[#0B1E48] shrink-0">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-[#0B1E48] dark:text-white leading-tight">
              {branding.companyName}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              Authentication Portal
            </span>
          </div>
        </div>

        <Link
          to="/"
          id="link-welcome-to-landing"
          className="text-xs font-semibold text-slate-500 hover:text-[#0B1E48] dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          Product Overview &rarr;
        </Link>
      </header>

      {/* Main Authentication Choices Container */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 my-auto flex flex-col items-center text-center">
        {/* Portal Greeting */}
        <div className="max-w-xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#0B1E48] dark:text-blue-300 border border-blue-200/70 dark:border-blue-900/60 mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Single-Company Workforce Gateway</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0B1E48] dark:text-white mb-2">
            Welcome to {branding.companyName}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal">
            Choose how you want to continue.
          </p>
        </div>

        {/* 2 Role Choice Cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl text-left">
          {/* Choice 1: Admin / Manager */}
          <div
            id="card-choice-admin"
            className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-md hover:shadow-xl hover:border-blue-500/50 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0B1E48] dark:text-blue-400 border border-blue-200/70 dark:border-blue-900/60 flex items-center justify-center shadow-2xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Management
                </span>
              </div>

              <div>
                <h2 className="text-xl font-black tracking-tight text-[#0B1E48] dark:text-white mb-1.5">
                  Admin / Manager
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Manage your workforce, monitor shift attendance, run monthly payroll, and configure company settings.
                </p>
              </div>

              {/* Highlights */}
              <div className="pt-2 flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                  <span>Executive Workforce Controls</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                  <span>Payroll, Shifts &amp; Leave Approvals</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                  <span>Supports Admin Login &amp; Sign Up</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                id="btn-welcome-admin"
                onClick={() => navigate("/admin/auth")}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#0B1E48] hover:bg-[#071534] dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md shadow-[#0B1E48]/20 transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.01]"
              >
                <span>Continue to Admin Portal</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* Choice 2: Employee */}
          <div
            id="card-choice-employee"
            className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-md hover:shadow-xl hover:border-emerald-500/50 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-900/60 flex items-center justify-center shadow-2xs">
                  <User className="w-6 h-6" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Staff Access
                </span>
              </div>

              <div>
                <h2 className="text-xl font-black tracking-tight text-[#0B1E48] dark:text-white mb-1.5">
                  Employee
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Access your employee dashboard, clock in &amp; out for daily shifts, request leave, and view payslips.
                </p>
              </div>

              {/* Highlights */}
              <div className="pt-2 flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  <span>Real-Time Shift Attendance</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  <span>Digital Payslips &amp; History</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  <span>Direct Employee ID / Email Sign In</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                id="btn-welcome-employee"
                onClick={() => navigate("/employee/login")}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.01]"
              >
                <span>Continue to Employee Portal</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Company Contact Strip (if configured) */}
        {(branding.contactEmail || branding.contactPhone || branding.address) && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-500 dark:text-slate-400">
            {branding.contactEmail && (
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{branding.contactEmail}</span>
              </div>
            )}
            {branding.contactPhone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{branding.contactPhone}</span>
              </div>
            )}
            {branding.address && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{branding.address}</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 border-t border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500">
        <div>
          &copy; {new Date().getFullYear()} {branding.companyName}. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <span>Single-Deployment Architecture</span>
          <span>&bull;</span>
          <span>Workforce Management System</span>
        </div>
      </footer>
    </div>
  );
};

export default WelcomePage;
