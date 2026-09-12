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
  Menu,
  X,
} from "lucide-react";

export const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title =
        "WorkPulse Everything Your Business Needs to Manage Its Workforce.";
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [navigate]);

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
      className="min-h-dvh w-full bg-[#F4F7FB] flex flex-col text-slate-800 relative font-sans selection:bg-[#0B1E48]/10 selection:text-[#0B1E48]"
    >
      {/* Subtle Background Glows — fixed so they stay pinned to viewport
          and never affect layout/scroll */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[260px] sm:h-[360px] bg-blue-400/8 blur-[100px] sm:blur-[120px] rounded-full" />
        <div className="absolute -bottom-20 right-0 w-[400px] sm:w-[500px] h-[220px] sm:h-[300px] bg-indigo-400/5 blur-[80px] sm:blur-[100px] rounded-full" />
      </div>

      {/* ==================== HEADER / NAVBAR ==================== */}
      <header
        id="landing-navbar"
        className="sticky top-0 z-30 w-full bg-[#F4F7FB]/95 backdrop-blur-md border-b border-slate-200/80"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            id="brand-logo-link"
            className="flex items-center gap-2.5 sm:gap-3 group transition-transform active:scale-95 shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0B1E48] text-white p-2 shadow-sm flex items-center justify-center border border-[#0B1E48]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-black tracking-tight text-[#0B1E48] leading-tight">
                WorkPulse
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 -mt-0.5">
                Enterprise Suite
              </span>
            </div>
          </Link>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              id="nav-btn-existing-login"
              onClick={() => navigate("/admin/login")}
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

          {/* Mobile Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-[#0B1E48] hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-3 flex flex-col gap-2.5"
          >
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/admin/login");
              }}
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-[#0B1E48] bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs transition-all cursor-pointer text-left"
            >
              Existing Organization Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/register-organization");
              }}
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-white bg-[#0B1E48] hover:bg-[#081738] shadow-xs transition-all cursor-pointer text-left"
            >
              Register Your Organization
            </button>
          </motion.div>
        )}
      </header>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-8 flex flex-col">
        {/* ==================== HERO ==================== */}
        <motion.section
          id="hero-section"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-3xl mx-auto flex flex-col items-center mb-14 sm:mb-20 px-2"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-4">
            <span
              id="hero-badge"
              className="inline-block px-3 py-1.5 sm:px-3.5 rounded-full text-[10px] sm:text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200/80 shadow-2xs"
            >
              Multi-Tenant Workforce &amp; Payroll Platform
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            id="hero-headline"
            variants={itemVariants}
            className="text-[26px] leading-[1.2] sm:text-4xl md:text-5xl lg:text-[52px] font-black tracking-tight text-[#0B1E48] sm:leading-[1.15] mb-4 sm:mb-5"
          >
            WorkPulse
            <br />
            Everything Your Business Needs to Manage Its Workforce.
          </motion.h1>

          {/* Description */}
          <motion.p
            id="hero-description"
            variants={itemVariants}
            className="text-sm sm:text-base md:text-lg text-slate-600 font-normal leading-relaxed mb-7 sm:mb-8 max-w-2xl px-1"
          >
            Automate 8:00 AM &ndash; 7:00 PM shift compliance, eliminate
            attendance errors with auto-finalized shifts, and manage payroll
            seamlessly across multiple organizations.
          </motion.p>

          {/* CTAs */}
          <motion.div
            id="hero-cta-buttons"
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto px-2 sm:px-0"
          >
            <button
              type="button"
              id="cta-register-company"
              onClick={() => navigate("/register-organization")}
              className="w-full sm:w-auto px-6 sm:px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-[#0B1E48] hover:bg-[#081738] shadow-md shadow-[#0B1E48]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Register Your Company</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              id="cta-signin-workspace"
              onClick={() => navigate("/admin/login")}
              className="w-full sm:w-auto px-6 sm:px-7 py-3.5 rounded-xl font-bold text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>Sign In to Existing Workspace</span>
            </button>
          </motion.div>
        </motion.section>

        {/* ==================== FEATURES ==================== */}
        <section id="platform-features" className="w-full">
          <div className="text-center mb-8 sm:mb-10 px-2">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-[#0B1E48] tracking-tight">
              Enterprise Control &bull; Built For Every Shift
            </h2>
            <p className="text-[11px] sm:text-xs md:text-sm text-slate-500 mt-1.5 sm:mt-1 max-w-md mx-auto">
              Zero-friction administration with strictly enforced organizational
              boundaries
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {/* Card 1 */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center mb-4 sm:mb-5">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#0B1E48] tracking-tight mb-2">
                  Automated Shift &amp; Attendance Engine
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  08:00 AM &ndash; 07:00 PM standard shift tracking, auto-absent
                  detection past 7:00 PM, and 12:00 AM midnight resets.
                </p>
              </div>

              <div className="mt-5 sm:mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs text-blue-700 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  15-Min Grace Window
                </span>
                <span className="text-slate-400 font-normal">
                  7:30 PM Finalizer
                </span>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center mb-4 sm:mb-5">
                  <Palette className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#0B1E48] tracking-tight mb-2">
                  Multi-Tenant White-Labeling
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Every registered business gets its own isolated portal, custom
                  logo, and welcome theme.
                </p>
              </div>

              <div className="mt-5 sm:mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs text-indigo-700 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  Custom Branding
                </span>
                <span className="text-slate-400 font-normal">
                  Isolated Schemas
                </span>
              </div>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between sm:col-span-2 lg:col-span-1"
            >
              <div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center mb-4 sm:mb-5">
                  <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#0B1E48] tracking-tight mb-2">
                  Streamlined Payroll &amp; Self-Service
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Dedicated employee self-service login and role-restricted
                  management dashboards.
                </p>
              </div>

              <div className="mt-5 sm:mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs text-emerald-700 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  One-Click Payslips
                </span>
                <span className="text-slate-400 font-normal">
                  Role Separation
                </span>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ==================== FOOTER ==================== */}
      <footer className="relative z-10 w-full bg-white border-t border-slate-200/80 py-5 sm:py-4 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2 order-2 sm:order-1">
            <div className="w-5 h-5 rounded-md bg-[#0B1E48] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              W
            </div>
            <span className="text-center sm:text-left">
              &copy; {new Date().getFullYear()} WorkPulse. All rights reserved.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 font-medium order-1 sm:order-2">
            <Link
              to="/setup"
              className="hover:text-[#0B1E48] transition-colors"
            >
              Register Organization
            </Link>
            <button
              type="button"
              onClick={() => navigate("/admin/login")}
              className="hover:text-[#0B1E48] transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
