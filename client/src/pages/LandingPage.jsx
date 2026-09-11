import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  Clock,
  Banknote,
  Palette,
  CheckCircle2,
  Building2,
  Sparkles,
} from "lucide-react";
import { SignInToOrganizationModal } from "../components/modal/SignInToOrganizationModal";

export const LandingPage = () => {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Sync SaaS product document title
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "WorkPulse — Everything Your Business Needs to Manage Its Workforce.";
    }
  }, []);

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <div
      id="workpulse-landing-page"
      className="min-h-screen w-full bg-[#F4F7FB] flex flex-col text-slate-800 relative font-sans selection:bg-[#0B1E48]/10 selection:text-[#0B1E48]"
    >
      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-blue-400/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-20 right-0 w-[500px] h-[300px] bg-indigo-400/5 blur-[100px] rounded-full pointer-events-none" />

      {/* 1. Header / Navbar */}
      <header
        id="landing-navbar"
        className="sticky top-0 z-30 w-full bg-[#F4F7FB]/90 backdrop-blur-md border-b border-slate-200/80"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          {/* Left: Neutral WorkPulse Logo + Title */}
          <Link
            to="/"
            id="brand-logo-link"
            className="flex items-center gap-3 group transition-transform active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0B1E48] text-white p-2 shadow-sm flex items-center justify-center border border-[#0B1E48]">
              {/* Abstract pulse / workflow badge */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-blue-400"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-[#0B1E48]">
                WorkPulse
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 -mt-1">
                Enterprise Suite
              </span>
            </div>
          </Link>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              id="nav-btn-existing-login"
              onClick={() => setShowLoginModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#0B1E48] bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all cursor-pointer whitespace-nowrap"
            >
              Existing Organization Login
            </button>
            <button
              type="button"
              id="nav-btn-register"
              onClick={() => navigate("/register-organization")}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#0B1E48] hover:bg-[#081738] shadow-xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              Register Your Organization
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-6 flex flex-col justify-center">
        {/* 2. Hero Section */}
        <motion.section
          id="hero-section"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-3xl mx-auto flex flex-col items-center mb-16 sm:mb-20"
        >
          {/* Small Badge */}
          <motion.div variants={itemVariants} className="mb-4">
            <span
              id="hero-badge"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200/80 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Multi-Tenant Workforce & Payroll Platform
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            id="hero-headline"
            variants={itemVariants}
            className="text-3xl sm:text-5xl font-black tracking-tight text-[#0B1E48] leading-[1.15] mb-5"
          >
            WorkPulse &mdash; Everything Your Business Needs to Manage Its Workforce.
          </motion.h1>

          {/* Brief Description */}
          <motion.p
            id="hero-description"
            variants={itemVariants}
            className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed mb-8 max-w-2xl"
          >
            Automate 8:00 AM &ndash; 7:00 PM shift compliance, eliminate attendance errors with auto-finalized shifts, and manage payroll seamlessly across multiple organizations.
          </motion.p>

          {/* Dual Call-to-Actions (CTAs) */}
          <motion.div
            id="hero-cta-buttons"
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
          >
            <button
              type="button"
              id="cta-register-company"
              onClick={() => navigate("/register-organization")}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-[#0B1E48] hover:bg-[#081738] shadow-md shadow-[#0B1E48]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Register Your Company</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              id="cta-signin-workspace"
              onClick={() => navigate("/admin/login")}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>Sign In to Existing Workspace</span>
            </button>
          </motion.div>
        </motion.section>

        {/* 3. Core Platform Features (3 Quick Cards) */}
        <section id="platform-features" className="w-full">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-[#0B1E48] tracking-tight">
              Enterprise Control &bull; Built For Every Shift
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Zero-friction administration with strictly enforced organizational boundaries
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Automated Shift & Attendance Engine */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center mb-5">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#0B1E48] tracking-tight mb-2.5">
                  Automated Shift & Attendance Engine
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  08:00 AM &ndash; 07:00 PM standard shift tracking, auto-absent detection past 7:00 PM, and 12:00 AM midnight resets.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-blue-700 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  15-Min Grace Window
                </span>
                <span className="text-slate-400 font-normal">7:30 PM Finalizer</span>
              </div>
            </motion.div>

            {/* Card 2: Multi-Tenant White-Labeling */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center mb-5">
                  <Palette className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#0B1E48] tracking-tight mb-2.5">
                  Multi-Tenant White-Labeling
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Every registered business gets its own isolated portal, custom logo, and welcome theme.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-700 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  Custom Branding
                </span>
                <span className="text-slate-400 font-normal">Isolated Schemas</span>
              </div>
            </motion.div>

            {/* Card 3: Streamlined Payroll & Self-Service */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center mb-5">
                  <Banknote className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#0B1E48] tracking-tight mb-2.5">
                  Streamlined Payroll & Self-Service
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Dedicated employee self-service login and role-restricted management dashboards.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  One-Click Payslips
                </span>
                <span className="text-slate-400 font-normal">Role Separation</span>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* 4. Footer */}
      <footer className="w-full bg-white border-t border-slate-200/80 py-4 px-4 sm:px-6 mt-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#0B1E48] text-white flex items-center justify-center text-[10px] font-bold">
              W
            </div>
            <span>
              &copy; {new Date().getFullYear()} WorkPulse SaaS Platform. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-5 font-medium">
            <Link
              to="/setup"
              className="hover:text-[#0B1E48] transition-colors"
            >
              Register Organization
            </Link>
            <Link
              to="/welcome"
              className="hover:text-[#0B1E48] transition-colors"
            >
              Workspace Welcome Hub
            </Link>
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="hover:text-[#0B1E48] transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>

      {/* Existing Organization Login Switcher Modal */}
      <SignInToOrganizationModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
};

export default LandingPage;
