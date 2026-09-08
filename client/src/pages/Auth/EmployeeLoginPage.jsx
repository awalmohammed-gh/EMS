import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  UserCheck,
} from "lucide-react";
import eyenitLogo from "../../assets/eyenit_logo.png";
import { authService } from "../../services/authService";
import { useManagement } from "../../context/ManagementContextProvider";
import { useAuth } from "../../context/AuthContext";

export const EmployeeLoginPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
    rememberMe: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { setShowToast, setUser: setManagementUser, setRole: setManagementRole } =
    useManagement();
  const { login: contextLogin } = useAuth();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Quick fill helper for QA/testing
  const handleQuickFill = (identifier = "employee@eyenit.com") => {
    setError(null);
    setFormData({
      identifier,
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
      setError("Please enter your Work Email or Employee ID and password.");
      return;
    }

    try {
      setIsLoading(true);

      const result = await authService.login({
        identifier,
        password,
        role: "employee",
      });

      if (result?.success) {
        const userObj = result.employee || result.user;
        const userToken = result.token;

        if (typeof contextLogin === "function") {
          contextLogin(userObj, "employee", userToken);
        }
        if (typeof setManagementUser === "function") {
          setManagementUser(userObj);
        }
        if (typeof setManagementRole === "function") {
          setManagementRole("employee");
        }

        setShowToast({
          show: true,
          message: `Welcome back, ${userObj?.fullName || "Employee"}!`,
          type: "success",
        });

        navigate("/employee/dashboard", {
          replace: true,
          state: { role: "employee" },
        });
      } else {
        setError(
          result?.message ||
            "Invalid credentials. Please verify your email or employee ID."
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
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F8FAFC] dark:bg-[#0B111E] py-12 px-4 sm:px-6 lg:px-8 relative selection:bg-[#0B1E48]/10 selection:text-[#0B1E48]">
      {/* Return to Portal Selection */}
      <Link
        id="employee-back-to-portals-btn"
        to="/welcome"
        className="absolute top-6 left-6 inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs hover:text-[#0B1E48] dark:hover:text-blue-400 hover:border-slate-300 dark:hover:border-slate-700 transition-all z-10"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Portals</span>
      </Link>

      {/* Main Centered Login Container */}
      <div className="w-full max-w-md mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-6">
          {/* Prominent Logo */}
          <div className="mb-4 flex items-center justify-center">
            <img
              src={eyenitLogo}
              alt="Eyenit Ghana"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-xs"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1E48] dark:text-white text-center">
            Employee Logins
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            Access your daily shifts, attendance clock, and monthly payslips
          </p>
        </div>

        {/* Minimal Enterprise Card */}
        <div className="w-full max-w-md mx-auto bg-white dark:bg-[#111927] border border-slate-200/70 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8">
          {/* Error Banner */}
          {error && (
            <div
              id="employee-login-error"
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
            {/* Identifier Field */}
            <div>
              <label
                htmlFor="employee-identifier-input"
                className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5"
              >
                Work Email or Employee ID
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <UserCheck className="h-4 w-4" />
                </div>
                <input
                  id="employee-identifier-input"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  value={formData.identifier}
                  onChange={handleInputChange}
                  placeholder="e.g., EMP-001 or staff@eyenitgh.com"
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
                  htmlFor="employee-password-input"
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
                  id="employee-password-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your account password"
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
            </div>

            {/* Submit Button */}
            <button
              id="employee-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-3 bg-[#0B1E48] hover:bg-[#081738] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>Sign In to Self-Service</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons for Testing */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Quick Test Credentials
              </span>
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("employee@eyenit.com")}
                className="py-1.5 px-2 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-300 text-center transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <UserCheck className="w-3 h-3 text-[#0B1E48] dark:text-blue-400" />
                Fill Email
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("EMP-001")}
                className="py-1.5 px-2 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-300 text-center transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <Users className="w-3 h-3 text-[#0B1E48] dark:text-blue-400" />
                Fill ID (EMP-001)
              </button>
            </div>
          </div>

          {/* Footer Navigation Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <Link
              id="go-to-admin-login-link"
              to="/admin/login"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[#0B1E48] dark:hover:text-blue-400 transition-colors group"
            >
              <span>Are you an administrator? Log in through the Admin Suite</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>

        {/* Security / System Policy Footer */}
        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p>
            Employee accounts are provisioned and managed by your HR administration.
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Eyenit Ghana Employee Management & Payroll System
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLoginPage;
