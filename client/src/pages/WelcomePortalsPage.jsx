import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ShieldCheck,
  Users,
  ArrowRight,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import eyenitLogo from "../assets/eyenit_logo.png";
import { checkAdminExists } from "../apis/fontApis";
import { useBranding } from "../context/BrandingContext";

export const WelcomePortalsPage = () => {
  const navigate = useNavigate();
  const { branding, refreshBranding } = useBranding();
  const [adminExists, setAdminExists] = useState(true);
  const [logoLoadError, setLogoLoadError] = useState(false);

  // Sync branding on mount in case an organization was just registered
  useEffect(() => {
    let isMounted = true;
    if (typeof refreshBranding === "function") {
      refreshBranding().catch(() => {});
    }

    checkAdminExists()
      .then((res) => {
        if (isMounted && res.data) {
          setAdminExists(Boolean(res.data.exists));
        }
      })
      .catch((err) => console.warn("[WelcomePortalsPage] Admin existence check:", err));

    return () => {
      isMounted = false;
    };
  }, [refreshBranding]);

  const activeLogo = logoLoadError || !branding?.logoUrl ? eyenitLogo : branding.logoUrl;
  const companyName = branding?.companyName?.trim() || "Enterprise";

  // Sync title for tenant welcome portal
  useEffect(() => {
    if (typeof document !== "undefined" && companyName) {
      document.title = `${companyName} | Workspace Portal Gateway`;
    }
  }, [companyName]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.12,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 22, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <div
      id="welcome-portals-page"
      className="min-h-screen bg-[#F4F7FB] text-slate-800 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-[#0B1E48]/10 selection:text-[#0B1E48]"
    >
      {/* Background Layer: Dynamic welcome background or crisp light-blue radial glow */}
      {branding?.welcomeBackgroundUrl ? (
        <div
          id="welcome-dynamic-background"
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 pointer-events-none"
          style={{ backgroundImage: `url(${branding.welcomeBackgroundUrl})` }}
        >
          <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-[2px]" />
        </div>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/40 via-slate-100/20 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-blue-400/10 blur-[100px] rounded-full pointer-events-none" />
        </>
      )}

      {/* Top Header Bar */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0B1E48] text-white flex items-center justify-center shadow-xs">
            <Building2 className="w-4 h-4" />
          </div>
          <span
            className={`text-xs sm:text-sm font-bold tracking-tight ${
              branding?.welcomeBackgroundUrl ? "text-white" : "text-slate-900"
            }`}
          >
            {companyName}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              branding?.welcomeBackgroundUrl
                ? "bg-white/15 text-white border border-white/20 backdrop-blur-xs"
                : "bg-blue-50 text-blue-700 border border-blue-200/70"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified Enterprise Portal
          </span>
        </div>
      </header>

      {/* Main Content Card Container */}
      <main className="relative z-10 flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full flex flex-col items-center"
        >
          {/* Centered Enlarged Dynamic Company Logo (w-20 h-20 object-contain) */}
          <motion.div variants={itemVariants} className="mb-4 text-center">
            <div className="w-24 h-24 rounded-2xl bg-white p-2 border border-slate-200/80 shadow-md shadow-slate-200/50 flex items-center justify-center mx-auto transition-transform hover:scale-105 duration-300">
              <img
                id="workspace-company-logo"
                className="w-20 h-20 object-contain"
                src={activeLogo}
                alt={`${companyName} Logo`}
                onError={() => setLogoLoadError(true)}
              />
            </div>
          </motion.div>

          {/* Welcome Title & Subtitle */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1
              id="workspace-welcome-title"
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 ${
                branding?.welcomeBackgroundUrl ? "text-white" : "text-slate-900"
              }`}
            >
              Welcome to {companyName} Workspace
            </h1>
            <p
              id="workspace-welcome-subtitle"
              className={`text-xs sm:text-sm font-normal max-w-md mx-auto ${
                branding?.welcomeBackgroundUrl ? "text-slate-200" : "text-slate-500"
              }`}
            >
              Select your authorized access portal to continue
            </p>
          </motion.div>

          {/* Primary Action Portals */}
          <div className="w-full space-y-3.5">
            {/* 1. Management Login (routes to /#/admin/login) */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
            >
              <button
                type="button"
                id="btn-management-portal"
                onClick={() => navigate("/admin/login")}
                className="w-full group text-left bg-[#0B1E48] hover:bg-[#081738] text-white p-5 rounded-2xl shadow-md shadow-[#0B1E48]/20 transition-all duration-200 border border-[#0B1E48] flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-white/10 group-hover:bg-white/15 flex items-center justify-center shrink-0 border border-white/10 transition-colors">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white tracking-tight">
                        Management Login
                      </h2>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/15 text-white/90">
                        Admin / Manager
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-normal mt-0.5 leading-relaxed">
                      Administrative oversight, workforce tracking, and payroll processing.
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-1 ml-3">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </button>
            </motion.div>

            {/* 2. Employee Login (routes to /#/login) */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
            >
              <button
                type="button"
                id="btn-employee-portal"
                onClick={() => navigate("/login")}
                className="w-full group text-left bg-white hover:bg-slate-50 text-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md border border-slate-200/90 hover:border-slate-300 transition-all duration-200 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-blue-50 text-[#0B1E48] group-hover:text-blue-700 flex items-center justify-center shrink-0 border border-slate-200/80 transition-colors">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        Employee Login
                      </h2>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Staff Self-Service
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-normal mt-0.5 leading-relaxed">
                      Staff self-service for clock-in/out, daily attendance, and payslips.
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-1 ml-3 text-slate-600">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </motion.div>
          </div>

          {/* Switch Organization / Back to WorkPulse Link */}
          <motion.div variants={itemVariants} className="mt-6 text-center">
            <Link
              to="/"
              id="link-back-to-workpulse"
              className={`inline-flex items-center gap-1.5 text-xs font-semibold hover:underline underline-offset-4 transition-colors ${
                branding?.welcomeBackgroundUrl
                  ? "text-slate-200 hover:text-white"
                  : "text-slate-600 hover:text-[#0B1E48]"
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Switch Organization / Back to WorkPulse</span>
            </Link>
          </motion.div>

          {/* Quick Setup Link (Only if no admin exists or setup re-initialization) */}
          {!adminExists ? (
            <motion.div variants={itemVariants} className="mt-6 text-center text-xs text-slate-500">
              Setting up your organization for the first time?{" "}
              <Link
                to="/setup"
                className="text-[#0B1E48] font-bold hover:underline underline-offset-2 ml-1 inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Initialize Company Setup</span>
              </Link>
            </motion.div>
          ) : null}
        </motion.div>
      </main>

      {/* Subtle Footer */}
      <footer className="relative z-10 w-full py-4 px-6 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto gap-2">
        <p>
          &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
        </p>
        <Link
          to="/"
          id="footer-back-to-workpulse"
          className={`hover:underline transition-colors ${
            branding?.welcomeBackgroundUrl
              ? "text-slate-300 hover:text-white"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Switch Organization / Back to WorkPulse
        </Link>
      </footer>
    </div>
  );
};

export default WelcomePortalsPage;
