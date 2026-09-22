import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  ArrowRight,
  UserCheck,
  User,
} from "lucide-react";
import { authService } from "../../services/authService";
import { brandingService } from "../../services/brandingService";
import { useManagement } from "../../context/ManagementContextProvider";
import { useAuth } from "../../context/AuthContext";
import { useAttendance } from "../../context/AttendanceContext";
import { MotionSpinner } from "../../components/ui/MotionSpinner";

export const EmployeeLoginPage = () => {
  const navigate = useNavigate();

  const [branding, setBranding] = useState({
    companyName: "WorkPulse",
    logoUrl: "",
  });

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
  const { autoPopulateFromAuth } = useAttendance();

  // Load single company deployment branding
  useEffect(() => {
    let isMounted = true;
    brandingService
      .getPublicBranding()
      .then((res) => {
        if (!isMounted) return;
        const brand = res?.branding || res?.company || res || {};
        const companyName = brand.companyName || brand.name || "WorkPulse";
        const logoUrl = brand.logoUrl || brand.logo || "";
        setBranding({ companyName, logoUrl });
        if (typeof document !== "undefined") {
          document.title = `${companyName} | Employee Portal`;
        }
      })
      .catch(() => {});
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
        email: identifier,
        password,
        role: "employee",
        rememberMe: formData.rememberMe,
      });

      if (result?.success) {
        const userObj = result.employee || result.user;
        const userRole = (userObj?.role || "employee").toLowerCase();

        if (userRole === "admin" || userRole === "manager") {
          setError(
            "Access restricted. Only Employees may log in through the Employee portal. Administrators must use the Admin portal."
          );
          setIsLoading(false);
          return;
        }

        const userToken = result.token;

        if (typeof autoPopulateFromAuth === "function") {
          autoPopulateFromAuth(result);
        }

        if (typeof contextLogin === "function") {
          contextLogin(userObj, "employee", userToken, result);
        }
        if (typeof setManagementUser === "function") {
          setManagementUser(userObj);
        }
        if (typeof setManagementRole === "function") {
          setManagementRole("employee");
        }

        if (typeof setShowToast === "function") {
          setShowToast({
            show: true,
            message: `Welcome back, ${userObj.firstName || userObj.name || userObj.full_name || "Employee"}! Signed in to Employee Portal.`,
            type: "success",
          });
        }

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
    <div
      id="employee-login-page"
      className="min-h-screen w-full bg-[#F4F7FB] dark:bg-slate-950 flex flex-col justify-between items-center px-4 py-6 font-sans selection:bg-emerald-500/10 selection:text-emerald-700"
    >
      {/* Header */}
      <header className="w-full max-w-md flex items-center justify-between py-2">
        <Link
          to="/welcome"
          id="link-employee-back-welcome"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#0B1E48] dark:hover:text-white transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <span>Back to Welcome</span>
        </Link>

        <Link
          to="/"
          id="link-employee-overview"
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#0B1E48] dark:hover:text-white"
        >
          Overview
        </Link>
      </header>

      {/* Main Authentication Card */}
      <main className="w-full max-w-md my-auto py-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl p-6 sm:p-8">
          {/* Company Brand & Portal Icon */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex items-center justify-center">
              {branding.logoUrl ? (
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 p-1.5 shadow-md border border-slate-200/80 dark:border-slate-700 flex items-center justify-center overflow-hidden">
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
                  <div className="hidden w-full h-full items-center justify-center bg-emerald-700 text-white font-bold text-base rounded-xl">
                    {branding.companyName.charAt(0).toUpperCase()}
                  </div>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white p-3 shadow-md flex items-center justify-center border border-emerald-600">
                  <UserCheck className="w-8 h-8 text-emerald-100" />
                </div>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0B1E48] dark:text-white">
              {branding.companyName}
            </h1>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-0.5">
              Employee Portal Login
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              id="employee-error-banner"
              className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 leading-relaxed font-medium">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* WORK EMAIL OR EMPLOYEE ID */}
            <div>
              <label
                htmlFor="employee-identifier-input"
                className="block text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase mb-1.5"
              >
                Work Email or Employee ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="employee-identifier-input"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  value={formData.identifier}
                  onChange={handleInputChange}
                  placeholder="employee@company.com or EMP-001"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm rounded-xl border border-slate-200/90 dark:border-slate-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-all outline-none disabled:opacity-60"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="employee-password-input"
                  className="block text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase"
                >
                  Password <span className="text-rose-500">*</span>
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="employee-password-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/60 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm rounded-xl border border-slate-200/90 dark:border-slate-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-all outline-none disabled:opacity-60"
                />
                <button
                  type="button"
                  id="btn-toggle-employee-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="employee-remember-me"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Remember this device
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="employee-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <MotionSpinner size="sm" className="text-white" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Employee Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Switch Link to Admin */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2.5 text-center">
            <button
              type="button"
              id="link-switch-to-management"
              onClick={() => navigate("/admin/auth")}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#0B1E48] dark:hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Need the Admin Portal?</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                Sign in to Admin / Manager Portal &rarr;
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md text-center py-2 text-xs text-slate-400 dark:text-slate-500">
        &copy; {new Date().getFullYear()} {branding.companyName}. Workforce Management System.
      </footer>
    </div>
  );
};

export default EmployeeLoginPage;
