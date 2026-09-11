import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { authService } from "../../services/authService";
import { useManagement } from "../../context/ManagementContextProvider";
import { useAuth } from "../../context/AuthContext";
import { MotionSpinner } from "../../components/ui/MotionSpinner";

/**
 * ManagementLoginPage
 * Dedicated commercial manager and administrator authentication page.
 * Strictly verifies admin/manager credentials, issues secure HTTP-only cookie,
 * and routes directly to the Admin Dashboard.
 */
export const ManagementLoginPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { setShowToast, setUser: setManagementUser, setRole: setManagementRole } =
    useManagement();
  const { login: contextLogin } = useAuth();

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Management Login | WorkPulse Enterprise";
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Quick fill helper for testing/QA
  const handleQuickFill = () => {
    setError(null);
    setFormData({
      email: "admin@eyenitgh.com",
      password: "password123",
      rememberMe: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      setError("Please enter your manager email address and password.");
      return;
    }

    try {
      setIsLoading(true);

      const result = await authService.login({
        identifier: email,
        email,
        password,
        role: "admin",
        rememberMe: formData.rememberMe,
      });

      if (result?.success) {
        const userObj = result.admin || result.user;
        const userRole = (userObj?.role || "admin").toLowerCase();

        // Strict role verification: only admin or manager roles allowed
        if (userRole !== "admin" && userRole !== "manager" && userRole !== "super_admin") {
          setError(
            "Access restricted. This portal is reserved for Managers and System Administrators only. Employees must use the Employee Login portal."
          );
          setIsLoading(false);
          return;
        }

        const userToken = result.token;

        if (typeof contextLogin === "function") {
          contextLogin(userObj, userRole, userToken);
        }
        if (typeof setManagementUser === "function") {
          setManagementUser(userObj);
        }
        if (typeof setManagementRole === "function") {
          setManagementRole(userRole);
        }

        if (typeof setShowToast === "function") {
          setShowToast({
            show: true,
            message: `Welcome back, ${userObj.fullName || userObj.full_name || "Manager"}! Signed in to Management Console.`,
            type: "success",
          });
        }

        // Direct redirection to Admin Dashboard
        navigate("/admin/dashboard", {
          replace: true,
          state: { role: userRole },
        });
      } else {
        setError(
          result?.message ||
            "Invalid manager credentials. Please verify your email and password."
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
    <div
      id="management-login-page"
      className="min-h-screen bg-[#F4F7FB] flex flex-col justify-between items-center px-4 py-8 relative selection:bg-[#0B1E48]/10 selection:text-[#0B1E48] font-sans"
    >
      {/* Subtle background ambient gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent pointer-events-none" />

      {/* Top Navigation / Brand Header */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between py-2">
        <Link
          to="/"
          id="btn-back-to-workpulse"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0B1E48] transition-colors group"
        >
          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center group-hover:border-slate-300">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <span>Back to WorkPulse</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            id="link-nav-employee-portal"
            className="text-xs font-semibold text-slate-600 hover:text-[#0B1E48] px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-200/80 bg-transparent hover:bg-white transition-all"
          >
            Staff Self-Service
          </Link>
        </div>
      </header>

      {/* Central Login Card Container */}
      <main className="relative z-10 w-full max-w-md my-auto py-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
          {/* Header & Icon */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#0B1E48] text-white mx-auto flex items-center justify-center mb-4 shadow-md shadow-[#0B1E48]/20">
              <ShieldCheck className="w-7 h-7 text-blue-300" />
            </div>

            <h1
              id="management-login-title"
              className="text-2xl font-black tracking-tight text-[#0B1E48] mb-1.5"
            >
              Management Login
            </h1>
            <p
              id="management-login-subtitle"
              className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed"
            >
              Secure administrative authentication for Managers and System Administrators
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              id="login-error-alert"
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* EMAIL / IDENTIFIER */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="input-manager-email"
                  className="block text-[11px] font-bold tracking-wider text-slate-600 uppercase"
                >
                  Email or Identifier <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">Personal or Organization</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="input-manager-email"
                  name="email"
                  required
                  autoComplete="username email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="admin@company.com or company email"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/60 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200/90 focus:border-[#0B1E48] focus:ring-2 focus:ring-[#0B1E48]/10 transition-all outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Log in using either your personal admin email or registered organization email.
              </p>
            </div>

            {/* PASSWORD */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="input-manager-password"
                  className="block text-[11px] font-bold tracking-wider text-slate-600 uppercase"
                >
                  Password <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  Min 6 characters
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="input-manager-password"
                  name="password"
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/60 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200/90 focus:border-[#0B1E48] focus:ring-2 focus:ring-[#0B1E48]/10 transition-all outline-none"
                />
                <button
                  type="button"
                  id="btn-toggle-password-visibility"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
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

            {/* Remember this device checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="checkbox-remember-device"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-slate-300 text-[#0B1E48] focus:ring-[#0B1E48] cursor-pointer"
                />
                <span className="text-xs text-slate-600 font-medium">
                  Remember this device
                </span>
              </label>

              <button
                type="button"
                id="btn-demo-quick-fill"
                onClick={handleQuickFill}
                className="text-[11px] font-semibold text-blue-700 hover:underline hover:text-blue-900"
              >
                Fill demo credentials
              </button>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="btn-sign-in-management"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#0B1E48] hover:bg-[#081738] disabled:opacity-60 shadow-md shadow-[#0B1E48]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <MotionSpinner size="sm" className="text-white" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Management Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Alternate Portals & Links */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-2.5 text-center">
            <Link
              to="/login"
              id="link-switch-to-employee"
              className="text-xs font-semibold text-slate-600 hover:text-[#0B1E48] inline-flex items-center gap-1.5"
            >
              <span>Need the Employee Portal?</span>
              <span className="text-blue-600 font-bold hover:underline">
                Sign in with Staff ID &rarr;
              </span>
            </Link>

            <Link
              to="/register-organization"
              id="link-register-new-org"
              className="text-xs font-semibold text-slate-600 hover:text-[#0B1E48] inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>New to WorkPulse?</span>
              <span className="text-[#0B1E48] font-bold hover:underline">
                Register your organization
              </span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-4xl text-center py-2 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} WorkPulse Enterprise Suite. All rights reserved.
      </footer>
    </div>
  );
};

export default ManagementLoginPage;
