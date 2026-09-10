import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  Info,
} from "lucide-react";
import eyenitLogo from "../../assets/eyenit_logo.png";
import { authService } from "../../services/authService";
import { useManagement } from "../../context/ManagementContextProvider";
import { useAuth } from "../../context/AuthContext";
import { useCompanyBranding } from "../../hooks/useCompanyBranding";

export const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { branding, logoUrl, primaryColor } = useCompanyBranding();
  const [logoLoadError, setLogoLoadError] = useState(false);

  const activeLogo = logoLoadError || !logoUrl ? eyenitLogo : logoUrl;

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
    rememberMe: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adminExists, setAdminExists] = useState(true);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);

  const { setShowToast, setUser: setManagementUser, setRole: setManagementRole } =
    useManagement();
  const { login: contextLogin } = useAuth();

  // Check whether at least one admin account exists
  useEffect(() => {
    let isMounted = true;
    const checkSetup = async () => {
      try {
        const res = await authService.checkAdminExists();
        if (isMounted && res) {
          setAdminExists(Boolean(res.exists));
        }
      } catch (err) {
        console.warn("[AdminLoginPage] Admin exists check warning:", err);
      } finally {
        if (isMounted) setIsCheckingSetup(false);
      }
    };

    checkSetup();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Quick fill helper for QA/testing
  const handleQuickFill = () => {
    setError(null);
    setFormData({
      identifier: "admin@eyenitgh.com",
      password: "password123",
      rememberMe: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const identifier = formData.identifier.trim();
    const password = formData.password;

    if (!identifier || !password) {
      setError("Please enter your administrator email and password.");
      return;
    }

    try {
      setIsLoading(true);

      const result = await authService.login({
        identifier,
        password,
        role: "admin",
      });

      if (result?.success) {
        const userObj = result.admin || result.user;
        const userToken = result.token;

        if (typeof contextLogin === "function") {
          contextLogin(userObj, "admin", userToken);
        }
        if (typeof setManagementUser === "function") {
          setManagementUser(userObj);
        }
        if (typeof setManagementRole === "function") {
          setManagementRole("admin");
        }

        setShowToast({
          show: true,
          message: "Signed in successfully as Administrator.",
          type: "success",
        });

        navigate("/admin/dashboard", {
          replace: true,
          state: { role: "admin" },
        });
      } else {
        setError(
          result?.message ||
            "Invalid credentials. Please verify your administrator email and password."
        );
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.normalizedMessage ||
        err.message ||
        "Authentication failed. Please verify your credentials and try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col justify-center items-center px-4 py-8 relative selection:bg-[#0B1E48]/10 selection:text-[#0B1E48]">
      {/* Background image container if configured */}
      {branding?.welcomeBackgroundUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center -z-10"
          style={{ backgroundImage: `url(${branding.welcomeBackgroundUrl})` }}
        >
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs" />
        </div>
      )}

      {/* Return to Portal Selection */}
      <Link
        id="admin-back-to-portals-btn"
        to="/welcome"
        className="absolute top-6 left-6 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 rounded-xl shadow-xs hover:bg-slate-50 transition-colors z-10"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Portals</span>
      </Link>

      {/* Main Centered Login Container */}
      <div className="w-full max-w-md mx-auto relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          {/* Prominent Logo */}
          <div className="mb-4 flex items-center justify-center">
            <img
              src={activeLogo}
              alt={branding?.companyName || "Organization Logo"}
              onError={() => setLogoLoadError(true)}
              className="h-16 w-auto max-w-[180px] object-contain drop-shadow-xs"
            />
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E48] dark:text-slate-900 text-center">
            Management Login
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-600 font-medium text-center max-w-sm mx-auto mt-2 leading-relaxed">
            Secure administrative access for system configuration, staff directory, and payroll processing
          </p>
        </div>

        {/* Setup Required Notice for First-Time Admin */}
        {!isCheckingSetup && !adminExists && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>No admin account detected. Setup is required.</span>
            </div>
            <Link
              to="/setup"
              className="font-bold text-[#0B1E48] dark:text-blue-400 hover:underline shrink-0"
            >
              Launch Setup
            </Link>
          </div>
        )}

        {/* Minimal Enterprise Card */}
        <div className="w-full max-w-md mx-auto bg-white dark:bg-[#111927] border border-slate-200/70 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8">
          {/* Error Banner */}
          {error && (
            <div
              id="admin-login-error"
              className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Sign in failed</p>
                <p className="mt-0.5 leading-relaxed">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-700 dark:hover:text-red-200 cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Admin Email Address Field */}
            <div>
              <label
                htmlFor="admin-email-input"
                className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5"
              >
                Admin Email Address
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="admin-email-input"
                  name="identifier"
                  type="email"
                  autoComplete="email"
                  value={formData.identifier}
                  onChange={handleInputChange}
                  placeholder="e.g., admin@eyenitgh.com"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm sm:text-base placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B1E48]/20 focus:border-[#0B1E48] dark:focus:ring-blue-500/20 dark:focus:border-blue-500 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="admin-password-input"
                  className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider"
                >
                  Password
                  <span className="text-red-500 ml-1">*</span>
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="admin-password-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your administrator password"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm sm:text-base placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B1E48]/20 focus:border-[#0B1E48] dark:focus:ring-blue-500/20 dark:focus:border-blue-500 transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400 select-none">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="rounded border-slate-300 dark:border-slate-700 text-[#0B1E48] focus:ring-[#0B1E48]/20 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Remember this device</span>
              </label>

              {!adminExists && (
                <Link
                  to="/admin/register"
                  className="font-semibold text-[#0B1E48] dark:text-blue-400 hover:underline"
                >
                  Register Admin
                </Link>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="admin-submit-btn"
              type="submit"
              disabled={isLoading}
              style={{ backgroundColor: primaryColor || "#0B1E48" }}
              className="w-full text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-3 hover:brightness-110 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In as Administrator</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Button for Testing */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Quick Test Credentials
              </span>
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <button
              type="button"
              onClick={handleQuickFill}
              className="w-full py-1.5 px-2 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-300 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3 h-3 text-[#0B1E48] dark:text-blue-400" />
              <span>Fill Admin (admin@eyenitgh.com / password123)</span>
            </button>
          </div>

          {/* Footer Navigation Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <Link
              id="go-to-employee-login-link"
              to="/login"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[#0B1E48] dark:hover:text-blue-400 transition-colors group"
            >
              <span>Looking for Employee Self-Service? Go to Staff Login</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>

        {/* Security / System Policy Footer */}
        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p>
            Protected Administrator Console • Multi-factor Session Encryption
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Eyenit Ghana Employee Management & Payroll System
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
