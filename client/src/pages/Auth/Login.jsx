import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  Info,
  UserCheck,
} from "lucide-react";
import eyenitLogo from "../../assets/eyenit_logo.png";
import { authService } from "../../services/authService";
import { useManagement } from "../../context/ManagementContextProvider";
import { useAuth } from "../../context/AuthContext";

export const Login = ({ initialRole = null }) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial role from props, query params, or current URL path
  const resolveInitialRole = () => {
    if (initialRole) return initialRole;
    const queryRole = searchParams.get("role");
    if (queryRole === "employee" || queryRole === "admin") return queryRole;
    if (location.pathname.includes("employee")) return "employee";
    if (location.pathname.includes("admin")) return "admin";
    return localStorage.getItem("userRole") || "admin";
  };

  const [activeRole, setActiveRole] = useState(resolveInitialRole);
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

  const { setShowToast, setUser: setManagementUser, setRole: setManagementRole } = useManagement();
  const { login: contextLogin } = useAuth();

  // Verify whether an admin exists on mount
  useEffect(() => {
    let isMounted = true;
    const checkSetup = async () => {
      try {
        const res = await authService.checkAdminExists();
        if (isMounted && res) {
          setAdminExists(Boolean(res.exists));
        }
      } catch (err) {
        console.warn("[Login] Admin check warning:", err);
      } finally {
        if (isMounted) setIsCheckingSetup(false);
      }
    };

    checkSetup();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update URL search param or internal role when switching tabs
  const handleRoleChange = (newRole) => {
    setActiveRole(newRole);
    setError(null);
    setFormData((prev) => ({
      ...prev,
      identifier: "",
      password: "",
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Quick fill helper for testing
  const handleQuickFill = (roleToFill) => {
    setError(null);
    if (roleToFill === "admin") {
      setActiveRole("admin");
      setFormData({
        identifier: "admin@eyenitgh.com",
        password: "password123",
        rememberMe: true,
      });
    } else {
      setActiveRole("employee");
      setFormData({
        identifier: "employee@eyenit.com",
        password: "password123",
        rememberMe: true,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const identifier = formData.identifier.trim();
    const password = formData.password;

    if (!identifier || !password) {
      setError(
        activeRole === "admin"
          ? "Please enter your administrator email and password."
          : "Please enter your Work Email or Employee ID and password."
      );
      return;
    }

    try {
      setIsLoading(true);

      const result = await authService.login({
        identifier,
        password,
        role: activeRole,
      });

      if (result?.success) {
        const userObj =
          activeRole === "admin"
            ? result.admin || result.user
            : result.employee || result.user;
        const userToken = result.token;

        // Update local context
        if (typeof contextLogin === "function") {
          contextLogin(userObj, activeRole, userToken);
        }
        if (typeof setManagementUser === "function") {
          setManagementUser(userObj);
        }
        if (typeof setManagementRole === "function") {
          setManagementRole(activeRole);
        }

        setShowToast({
          show: true,
          message:
            activeRole === "admin"
              ? "Signed in successfully as Administrator."
              : `Welcome back, ${userObj?.fullName || "Employee"}!`,
          type: "success",
        });

        // Navigate to appropriate dashboard
        const redirectPath =
          activeRole === "admin" ? "/admin/dashboard" : "/employee/dashboard";
        navigate(redirectPath, {
          replace: true,
          state: { role: activeRole },
        });
      } else {
        setError(result?.message || "Invalid credentials. Please verify your details.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.normalizedMessage ||
        err.message ||
        "Authentication failed. Please check your credentials and try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const isAdminMode = activeRole === "admin";

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 relative selection:bg-[#002185]/10 selection:text-[#002185]">
      {/* Return to Portal Selection */}
      <Link
        id="login-back-to-portal-btn"
        to="/welcome"
        className="absolute top-6 left-6 inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#475569] bg-white border border-[#E2E8F0] rounded-xl shadow-xs hover:text-[#002185] hover:border-[#002185] hover:shadow-sm transition-all z-10"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Portals</span>
      </Link>

      {/* Main Centered Login Container */}
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img
              src={eyenitLogo}
              alt="Eyenit"
              className="h-10 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E48] dark:text-blue-100">
            Employee Management Portal
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Secure enterprise access for staff and administrators
          </p>
        </div>

        {/* Setup Required Notice for First-Time Setup */}
        {!isCheckingSetup && !adminExists && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-800">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>No admin account detected. Setup is required.</span>
            </div>
            <Link
              to="/admin/register"
              className="font-bold text-[#002185] hover:text-[#ff5500] hover:underline shrink-0"
            >
              Create Admin
            </Link>
          </div>
        )}

        {/* Card Component */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8">
          {/* Role Selection Segmented Tabs */}
          <div
            id="login-role-tabs"
            className="flex p-1 bg-[#F1F5F9] rounded-xl mb-6 border border-[#E2E8F0]"
          >
            <button
              id="login-tab-admin"
              type="button"
              onClick={() => handleRoleChange("admin")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isAdminMode
                  ? "bg-white text-[#002185] shadow-xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <ShieldCheck
                className={`w-3.5 h-3.5 ${
                  isAdminMode ? "text-[#002185]" : "text-[#94A3B8]"
                }`}
              />
              <span>Administrator</span>
            </button>

            <button
              id="login-tab-employee"
              type="button"
              onClick={() => handleRoleChange("employee")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !isAdminMode
                  ? "bg-white text-[#EA580C] shadow-xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <Users
                className={`w-3.5 h-3.5 ${
                  !isAdminMode ? "text-[#EA580C]" : "text-[#94A3B8]"
                }`}
              />
              <span>Staff / Employee</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Sign in failed</p>
                <p className="mt-0.5 text-red-600 leading-relaxed">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-700 cursor-pointer font-bold text-xs"
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
                htmlFor="login-identifier-input"
                className="block text-xs font-bold text-[#1E293B] uppercase tracking-wider mb-1.5"
              >
                {isAdminMode ? "Admin Email Address" : "Work Email or Employee ID"}
                <span className="text-[#DC2626] ml-1">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  {isAdminMode ? (
                    <Mail className="h-4 w-4" />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                </div>
                <input
                  id="login-identifier-input"
                  name="identifier"
                  type={isAdminMode ? "email" : "text"}
                  autoComplete={isAdminMode ? "email" : "username"}
                  value={formData.identifier}
                  onChange={handleInputChange}
                  placeholder={
                    isAdminMode
                      ? "admin@eyenitgh.com"
                      : "e.g. employee@eyenit.com or EMP001"
                  }
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#002185]/20 focus:border-[#002185] transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password-input"
                  className="block text-xs font-bold text-[#1E293B] uppercase tracking-wider"
                >
                  Password
                  <span className="text-[#DC2626] ml-1">*</span>
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="login-password-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your account password"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-11 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#002185]/20 focus:border-[#002185] transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
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

            {/* Remember Me & Secondary Actions */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer text-[#475569]">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="rounded border-[#CBD5E1] text-[#002185] focus:ring-[#002185]/20 w-3.5 h-3.5"
                />
                <span>Remember this device</span>
              </label>

              {isAdminMode && !adminExists && (
                <Link
                  to="/admin/register"
                  className="font-semibold text-[#002185] hover:text-[#ff5500] hover:underline"
                >
                  Register Admin
                </Link>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className={`w-full text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-3 ${
                isAdminMode
                  ? "bg-[#002185] hover:bg-[#001760] active:scale-[0.99]"
                  : "bg-[#EA580C] hover:bg-[#C2410C] active:scale-[0.99]"
              } disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  {isAdminMode ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                  <span>
                    Sign In as {isAdminMode ? "Administrator" : "Employee"}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons for Testing */}
          <div className="mt-5 pt-4 border-t border-[#F1F5F9]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Quick Test Credentials
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[#94A3B8]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("admin")}
                className="py-1.5 px-2 bg-[#F8FAFC] hover:bg-[#EEF2F6] border border-[#E2E8F0] rounded-lg text-[11px] font-medium text-[#002185] text-center transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <ShieldCheck className="w-3 h-3 text-[#002185]" />
                Admin Fill
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("employee")}
                className="py-1.5 px-2 bg-[#F8FAFC] hover:bg-[#FFF7ED] border border-[#E2E8F0] rounded-lg text-[11px] font-medium text-[#EA580C] text-center transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <Users className="w-3 h-3 text-[#EA580C]" />
                Staff Fill
              </button>
            </div>
          </div>
        </div>

        {/* Security / System Policy Footer */}
        <div className="mt-6 text-center text-xs text-[#64748B] space-y-1">
          <p>
            {isAdminMode ? (
              <span>
                Protected Administrator Console • Multi-factor Session Encryption
              </span>
            ) : (
              <span>
                Employee accounts are provisioned by corporate HR administrators.
              </span>
            )}
          </p>
          <p className="text-[11px] text-[#94A3B8]">
            Eyenit Ghana Employee Management & Payroll System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
