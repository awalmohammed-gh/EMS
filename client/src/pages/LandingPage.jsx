import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Users,
  Clock,
  Banknote,
  CalendarCheck,
  BarChart3,
  Megaphone,
  Settings,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Lock,
  TrendingUp,
  Menu,
  X,
  Award,
  Phone,
  Mail,
  MapPin,
  Check,
} from "lucide-react";
import { useBranding } from "../context/BrandingContext";

export const LandingPage = () => {
  const navigate = useNavigate();
  const { companyName, logoUrl, contactEmail, contactPhone, address } = useBranding();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("attendance");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `${companyName || "WorkPulse"} | Workforce Management System`;
    }
  }, [companyName]);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
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

  const coreFeatures = [
    {
      id: "feat-employees",
      icon: Users,
      title: "Employee Management",
      description:
        "Centralize employee profiles, departments, job titles, employment contracts, and contact directories in a secure, unified database.",
      tag: "Directory & Profiles",
      accent: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400",
    },
    {
      id: "feat-attendance",
      icon: Clock,
      title: "Shift Attendance & Clocking",
      description:
        "Track daily clock-in and clock-out events, shift durations, late arrivals, and overtime in real-time with automated timesheet generation.",
      tag: "Live Tracking",
      accent: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
    {
      id: "feat-leave",
      icon: CalendarCheck,
      title: "Leave & Absence Management",
      description:
        "Streamline time-off requests, sick leave, annual vacations, and manager approvals with real-time balance tracking and calendar views.",
      tag: "Approval Workflows",
      accent: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400",
    },
    {
      id: "feat-payroll",
      icon: Banknote,
      title: "Payroll & Compensation",
      description:
        "Automate monthly salary computations, bonus allocations, tax deductions, and generate digital payslips ready for employee review.",
      tag: "Salary & Slips",
      accent: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400",
    },
    {
      id: "feat-performance",
      icon: Award,
      title: "Performance & Appraisals",
      description:
        "Monitor employee performance goals, conduct structured performance evaluations, and maintain clear records of team growth.",
      tag: "Reviews & KPIs",
      accent: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400",
    },
    {
      id: "feat-reports",
      icon: BarChart3,
      title: "Workforce Reports & Analytics",
      description:
        "Gain actionable insights with visual dashboards on workforce attendance rates, salary distribution, department headcount, and trends.",
      tag: "Actionable Insights",
      accent: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-400",
    },
    {
      id: "feat-announcements",
      icon: Megaphone,
      title: "Company Announcements",
      description:
        "Broadcast important company notices, policy updates, holiday notices, and urgent alerts across your entire staff instantly.",
      tag: "Internal Communications",
      accent: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400",
    },
    {
      id: "feat-settings",
      icon: Settings,
      title: "Centralized Company Settings",
      description:
        "Configure company branding, official working hours, attendance policies, departments, and administrative preferences with full control.",
      tag: "Company Configuration",
      accent: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300",
    },
  ];

  return (
    <div
      id="workpulse-landing-page"
      className="min-h-screen w-full bg-[#F8FAFC] dark:bg-slate-950 flex flex-col text-slate-800 dark:text-slate-200 relative font-sans selection:bg-[#0B1E48]/10 selection:text-[#0B1E48]"
    >
      {/* Background Subtle Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[360px] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] -right-20 w-[500px] h-[350px] bg-indigo-500/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 -left-20 w-[450px] h-[300px] bg-blue-600/5 blur-[100px] rounded-full" />
      </div>

      {/* ==================== 1. STICKY NAVBAR ==================== */}
      <header
        id="landing-navbar"
        className="sticky top-0 z-50 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div
            id="brand-logo-container"
            className="flex items-center gap-3 cursor-pointer select-none shrink-0"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            {logoUrl ? (
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 p-1 shadow-2xs border border-slate-200/80 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={logoUrl}
                  alt={companyName || "WorkPulse"}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = "none";
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = "flex";
                    }
                  }}
                />
                <div className="hidden w-full h-full items-center justify-center bg-[#0B1E48] text-white font-bold text-sm rounded-lg">
                  {companyName ? companyName.charAt(0).toUpperCase() : "W"}
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#0B1E48] text-white p-2 shadow-2xs flex items-center justify-center border border-[#0B1E48] shrink-0">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-[#0B1E48] dark:text-white leading-tight">
                {companyName || "WorkPulse"}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 -mt-0.5">
                Workforce Management
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <button
              type="button"
              id="nav-link-features"
              onClick={() => scrollToSection("features")}
              className="hover:text-[#0B1E48] dark:hover:text-white transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              id="nav-link-attendance"
              onClick={() => scrollToSection("attendance")}
              className="hover:text-[#0B1E48] dark:hover:text-white transition-colors cursor-pointer"
            >
              Attendance
            </button>
            <button
              type="button"
              id="nav-link-payroll"
              onClick={() => scrollToSection("payroll")}
              className="hover:text-[#0B1E48] dark:hover:text-white transition-colors cursor-pointer"
            >
              Payroll
            </button>
            <button
              type="button"
              id="nav-link-employees"
              onClick={() => scrollToSection("employees")}
              className="hover:text-[#0B1E48] dark:hover:text-white transition-colors cursor-pointer"
            >
              Employee Management
            </button>
          </nav>

          {/* Single Prominent Public CTA: Admin Login */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              id="nav-btn-admin-login"
              onClick={() => navigate("/admin/auth")}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0B1E48] hover:bg-[#071534] dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm hover:shadow-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
            >
              <Lock className="w-3.5 h-3.5 text-blue-300" />
              <span>Admin Login</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-300" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-5 shadow-xl"
            >
              <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <button
                  type="button"
                  onClick={() => scrollToSection("features")}
                  className="text-left py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Features
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("attendance")}
                  className="text-left py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Attendance
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("payroll")}
                  className="text-left py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Payroll
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("employees")}
                  className="text-left py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Employee Management
                </button>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    id="mobile-nav-btn-admin-login"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/admin/auth");
                    }}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#0B1E48] dark:bg-blue-600 flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4 text-blue-300" />
                    <span>Admin Login</span>
                    <ArrowRight className="w-4 h-4 text-blue-300" />
                  </button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="relative z-10 flex-1 flex flex-col">
        {/* ==================== 2. HERO SECTION ==================== */}
        <section
          id="hero-section"
          className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-16 text-center flex flex-col items-center"
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center max-w-4xl"
          >
            {/* Trust / Category Badge */}
            <motion.div variants={itemVariants} className="mb-5">
              <span
                id="hero-badge"
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-[#0B1E48] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Workforce &amp; Operations Management
              </span>
            </motion.div>

            {/* Exact Required Headline */}
            <motion.h1
              id="hero-headline"
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#0B1E48] dark:text-white leading-[1.15] mb-6"
            >
              Manage Your Workforce. Run Your Business Better.
            </motion.h1>

            {/* Exact Required Supporting Text */}
            <motion.p
              id="hero-description"
              variants={itemVariants}
              className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-3xl mb-9"
            >
              WorkPulse brings employee management, attendance, leave, payroll, performance, and workplace operations together in one powerful system.
            </motion.p>

            {/* ONLY ONE AUTHENTICATION CTA: Admin Login */}
            <motion.div
              id="hero-cta-container"
              variants={itemVariants}
              className="flex items-center justify-center w-full sm:w-auto"
            >
              <button
                type="button"
                id="cta-admin-login"
                onClick={() => navigate("/admin/auth")}
                className="w-full sm:w-auto px-9 py-4 rounded-xl font-extrabold text-base sm:text-lg text-white bg-[#0B1E48] hover:bg-[#081738] dark:bg-blue-600 dark:hover:bg-blue-700 shadow-xl shadow-[#0B1E48]/20 hover:shadow-2xl transition-all flex items-center justify-center gap-3 group cursor-pointer"
              >
                <Lock className="w-5 h-5 text-blue-300" />
                <span>Admin Login</span>
                <ArrowRight className="w-5 h-5 text-blue-300 transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>

            {/* Trust Indicators Strip */}
            <motion.div
              variants={itemVariants}
              className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500 dark:text-slate-400"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Single-Company Deployment</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Role-Based Access Control</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Secure MongoDB Database</span>
              </div>
            </motion.div>
          </motion.div>

          {/* ==================== 3. HERO PRODUCT VISUALIZATION ==================== */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="w-full mt-12 sm:mt-16 max-w-5xl mx-auto"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-200/60 dark:shadow-black/40 overflow-hidden text-left">
              {/* Browser/Dashboard Title Bar */}
              <div className="h-12 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
                    {companyName || "WorkPulse"} — Executive Dashboard
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Operations</span>
                </div>
              </div>

              {/* Dashboard Preview Body */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* 4 Stat Counters */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Total Staff</span>
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-[#0B1E48] dark:text-white">128</p>
                    <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3" /> All departments active
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Today Attendance</span>
                      <Clock className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-[#0B1E48] dark:text-white">96.8%</p>
                    <span className="text-[11px] font-medium text-slate-500 mt-1 block">124 of 128 clocked in</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Leave Requests</span>
                      <CalendarCheck className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-[#0B1E48] dark:text-white">4</p>
                    <span className="text-[11px] font-medium text-amber-600 mt-1 block">Pending approval</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Payroll Cycle</span>
                      <Banknote className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-[#0B1E48] dark:text-white">Active</p>
                    <span className="text-[11px] font-medium text-emerald-600 mt-1 block">Ready for generation</span>
                  </div>
                </div>

                {/* Split Operational Panel: Live Activity Stream & Department Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  {/* Activity stream (2 cols) */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Recent Attendance Activity
                      </h3>
                      <span className="text-[11px] font-semibold text-blue-600">Real-time sync</span>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { name: "Sarah Jenkins", role: "Engineering Lead", time: "08:52 AM", status: "On-Time", shift: "Morning Shift" },
                        { name: "David Chen", role: "Product Designer", time: "08:58 AM", status: "On-Time", shift: "Morning Shift" },
                        { name: "Amira Patel", role: "HR Coordinator", time: "09:04 AM", status: "Present", shift: "Standard Shift" },
                        { name: "Marcus Wright", role: "Operations Specialist", time: "09:12 AM", status: "Grace Period", shift: "Field Shift" },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0B1E48] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {item.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100">{item.name}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.role} • {item.shift}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 block">{item.time}</span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                              {item.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Department Staffing Breakdown (1 col) */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Department Distribution
                    </h3>

                    <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                      {[
                        { dept: "Engineering", count: 42, pct: "33%" },
                        { dept: "Operations", count: 35, pct: "27%" },
                        { dept: "Sales & Marketing", count: 28, pct: "22%" },
                        { dept: "Human Resources", count: 12, pct: "10%" },
                        { dept: "Finance & Legal", count: 11, pct: "8%" },
                      ].map((d, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-700 dark:text-slate-300">{d.dept}</span>
                            <span className="text-slate-500 font-bold">{d.count} staff</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#0B1E48] dark:bg-blue-500 rounded-full"
                              style={{ width: d.pct }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ==================== 4. CORE FEATURES GRID (8 Modules) ==================== */}
        <section
          id="features"
          className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3.5 py-1.5 rounded-full border border-blue-200/80 dark:border-blue-900/40">
                Full-Suite Operations
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0B1E48] dark:text-white mt-4 mb-4">
                Everything Required to Manage Your Company's Workforce
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                WorkPulse powers all everyday HR, operational, and managerial needs in a single, dedicated deployment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {coreFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.id}
                    id={feature.id}
                    className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl ${feature.accent} shadow-2xs`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200/60 dark:border-slate-700">
                          {feature.tag}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ==================== 5. DEEP DIVE SHOWCASE (Attendance, Payroll, Employees) ==================== */}
        <section id="attendance" className="py-20 bg-[#F8FAFC] dark:bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-1.5 rounded-full border border-emerald-200/80 dark:border-emerald-900/40">
                Operational Highlights
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0B1E48] dark:text-white mt-4 mb-3">
                Precision Management for Daily Workflows
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                Switch between core operational modules to explore how WorkPulse streamlines company administration.
              </p>

              {/* Showcase Navigation Tabs */}
              <div className="inline-flex p-1.5 mt-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <button
                  type="button"
                  id="tab-btn-attendance"
                  onClick={() => setActiveTab("attendance")}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === "attendance"
                      ? "bg-[#0B1E48] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Attendance &amp; Shifts
                </button>
                <button
                  type="button"
                  id="tab-btn-payroll"
                  onClick={() => setActiveTab("payroll")}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === "payroll"
                      ? "bg-[#0B1E48] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Payroll Processing
                </button>
                <button
                  type="button"
                  id="tab-btn-employees"
                  onClick={() => setActiveTab("employees")}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === "employees"
                      ? "bg-[#0B1E48] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Employee Directory
                </button>
              </div>
            </div>

            {/* Tab 1: Attendance */}
            {activeTab === "attendance" && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 shadow-xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-5">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Live Time &amp; Attendance</span>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#0B1E48] dark:text-white leading-tight">
                    Accurate Shift Clocking Without Guesswork
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Eliminate manual timesheets. Employees clock in and out seamlessly with shift status updates, duration timers, and automatic lateness detection.
                  </p>
                  <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Live duration timers with active shift indicators</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Grace period settings and automated late arrival deduction flags</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Exportable attendance reports for payroll calculation</span>
                    </li>
                  </ul>
                </div>
                <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Today's Shift Attendance</p>
                      <p className="text-base font-black text-[#0B1E48] dark:text-white">Standard Work Day (09:00 - 17:00)</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                      Active
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <p className="text-lg font-black text-emerald-600">124</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Present</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <p className="text-lg font-black text-amber-600">3</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Late</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <p className="text-lg font-black text-blue-600">1</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">On Leave</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Payroll */}
            {activeTab === "payroll" && (
              <div id="payroll" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 shadow-xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-5">
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Payroll &amp; Compensation</span>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#0B1E48] dark:text-white leading-tight">
                    Seamless Salary Calculations &amp; Payslips
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Generate monthly compensation with full clarity. Base pay, allowances, deductions, and tax withholdings calculated and delivered digitally.
                  </p>
                  <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>One-click payslip generation for entire company or specific staff</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Direct printable payslip templates with company branding</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Transparent breakdown of basic pay, bonus, and deductions</span>
                    </li>
                  </ul>
                </div>
                <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Monthly Payroll Summary</span>
                    <span className="text-xs font-bold text-emerald-600">Disbursed</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-700">
                      <span className="text-slate-500">Gross Salaries Processed:</span>
                      <span className="font-bold text-slate-900 dark:text-white">$142,500.00</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-700">
                      <span className="text-slate-500">Allowances &amp; Bonuses:</span>
                      <span className="font-bold text-slate-900 dark:text-white">+$12,400.00</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-700">
                      <span className="text-slate-500">Tax &amp; Statutory Deductions:</span>
                      <span className="font-bold text-rose-600">-$18,350.00</span>
                    </div>
                    <div className="flex justify-between pt-2 text-sm font-black text-[#0B1E48] dark:text-white">
                      <span>Net Disbursement:</span>
                      <span>$136,550.00</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Employees */}
            {activeTab === "employees" && (
              <div id="employees" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 shadow-xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-5">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Employee Directory</span>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#0B1E48] dark:text-white leading-tight">
                    Structured Staff Directory &amp; Records
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Organize your company's talent. Manage departments, job titles, active positions, and personal profiles with search and filtering.
                  </p>
                  <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Instant search across employee names, IDs, and positions</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Departmental categorization and position hierarchies</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Employee credential creation and status lifecycle controls</span>
                    </li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                  {[
                    { name: "Jessica Taylor", dept: "Engineering", pos: "Senior Fullstack Engineer", status: "Active" },
                    { name: "Michael Vance", dept: "Operations", pos: "Logistics Manager", status: "Active" },
                    { name: "Elena Rostova", dept: "Marketing", pos: "Growth Lead", status: "Active" },
                  ].map((emp, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 flex items-center justify-center font-bold">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{emp.name}</p>
                          <p className="text-[11px] text-slate-500">{emp.pos} • {emp.dept}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                        {emp.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ==================== 6. ADMIN / MANAGER FOCUS SECTION ==================== */}
        <section className="py-20 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-[#0B1E48] text-white p-8 sm:p-14 shadow-2xl relative overflow-hidden">
              {/* Background abstract accents */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-3xl">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/15">
                  Administrative Control
                </span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-4 mb-4 text-white leading-tight">
                  Built for Modern Workforce Management
                </h2>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8">
                  Give your administrators and managers the tools they need to manage employees efficiently. Gain real-time visibility, approve requests in one click, and run workforce operations smoothly.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded bg-blue-500/20 text-blue-300 mt-0.5">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Centralized Staff Directory</h4>
                      <p className="text-xs text-slate-300">Create, update, and manage all employee credentials and records.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded bg-blue-500/20 text-blue-300 mt-0.5">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Direct Shift Oversight</h4>
                      <p className="text-xs text-slate-300">Monitor clock-ins, review timesheets, and resolve shift discrepancies.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded bg-blue-500/20 text-blue-300 mt-0.5">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Fast Leave Approvals</h4>
                      <p className="text-xs text-slate-300">Review pending absences with real-time employee leave balance context.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded bg-blue-500/20 text-blue-300 mt-0.5">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Complete Activity Audit Logs</h4>
                      <p className="text-xs text-slate-300">Maintain high accountability with logged management actions.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    id="admin-focus-cta-login"
                    onClick={() => navigate("/admin/auth")}
                    className="px-8 py-3.5 rounded-xl font-extrabold text-sm sm:text-base text-[#0B1E48] bg-white hover:bg-slate-100 shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-[#0B1E48]" />
                    <span>Admin Login</span>
                    <ArrowRight className="w-4 h-4 text-[#0B1E48]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== 7. PRE-FOOTER CALL TO ACTION ==================== */}
        <section className="py-20 bg-[#F8FAFC] dark:bg-slate-950 text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0B1E48] dark:text-white mb-4">
              Ready to manage your workforce?
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              Access your WorkPulse administration dashboard and take control of your company's workforce operations.
            </p>

            <button
              type="button"
              id="footer-cta-admin-login"
              onClick={() => navigate("/admin/auth")}
              className="px-9 py-4 rounded-xl font-extrabold text-base sm:text-lg text-white bg-[#0B1E48] hover:bg-[#081738] dark:bg-blue-600 dark:hover:bg-blue-700 shadow-xl shadow-[#0B1E48]/20 hover:shadow-2xl transition-all inline-flex items-center gap-2.5 cursor-pointer"
            >
              <Lock className="w-5 h-5 text-blue-300" />
              <span>Admin Login</span>
              <ArrowRight className="w-5 h-5 text-blue-300" />
            </button>
          </div>
        </section>
      </main>

      {/* ==================== 8. PROFESSIONAL SINGLE-COMPANY FOOTER ==================== */}
      <footer
        id="landing-footer"
        className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12 text-slate-600 dark:text-slate-400 text-xs"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Column 1: Company / WorkPulse Brand */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={companyName || "WorkPulse"}
                    className="h-8 w-auto object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[#0B1E48] text-white flex items-center justify-center font-bold text-xs">
                    <Building2 className="w-4 h-4 text-blue-400" />
                  </div>
                )}
                <span className="text-base font-black text-[#0B1E48] dark:text-white">
                  {companyName || "WorkPulse"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                A dedicated, single-deployment workforce management system for modern businesses. Empowering administrators and managers with real-time employee attendance, leave workflows, and automated payroll operations.
              </p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Single-Deployment Architecture
                </span>
              </div>
            </div>

            {/* Column 2: Quick Navigation */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider text-[11px] mb-3">
                Core Modules
              </h4>
              <ul className="space-y-2 font-medium">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("features")}
                    className="hover:text-[#0B1E48] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Features Overview
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("attendance")}
                    className="hover:text-[#0B1E48] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Shift Attendance
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("payroll")}
                    className="hover:text-[#0B1E48] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Payroll &amp; Compensation
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("employees")}
                    className="hover:text-[#0B1E48] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Employee Management
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Administration & Contact */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider text-[11px] mb-3">
                Administration
              </h4>
              <ul className="space-y-2 font-medium">
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/auth")}
                    className="hover:text-[#0B1E48] dark:hover:text-white transition-colors font-bold text-[#0B1E48] dark:text-blue-400 cursor-pointer flex items-center gap-1.5"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Admin Login</span>
                  </button>
                </li>
                {contactEmail && (
                  <li className="flex items-center gap-2 text-slate-500">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{contactEmail}</span>
                  </li>
                )}
                {contactPhone && (
                  <li className="flex items-center gap-2 text-slate-500">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{contactPhone}</span>
                  </li>
                )}
                {address && (
                  <li className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{address}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom Copyright Strip */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 dark:text-slate-500">
            <p>
              &copy; {new Date().getFullYear()} {companyName || "WorkPulse"}. All rights reserved. Single-company deployment.
            </p>
            <div className="flex items-center gap-4">
              <span>Security &amp; RBAC Enforced</span>
              <span>•</span>
              <span>Internal Authentication</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
