import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ShieldCheckIcon,
  UserIcon,
  UserPlus,
  Info,
  CheckCircle2,
} from "lucide-react";
import Loading from "../ui/Loading";
import ErrorMessage from "../ui/ErrorMessage";
import eyenitLogo from "../assets/eyenit_logo.png";
import { adminLogin, adminRegister, employeeLogin } from "../apis/fontApis";
import { useManagement } from "../context/ManagementContextProvider";
import Toaster from "../ui/Toaster";

export const LoginForm = ({ role = "admin", title, subtitle, initialMode = "login" }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(initialMode === "register");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    showPassword: false,
    showConfirmPassword: false,
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast, setShowToast, setUser, setRole } = useManagement();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 1. Admin Login Submission
  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.trim() || !formData.password) {
      setError("Please enter your admin email address and password.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await adminLogin({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (res.data?.success) {
        const { token, admin } = res.data;
        if (token) {
          localStorage.setItem("token", token);
          localStorage.setItem("adminToken", token);
        }
        localStorage.setItem("userRole", "admin");
        if (admin) {
          localStorage.setItem("adminData", JSON.stringify(admin));
          if (typeof setUser === "function") setUser(admin);
          if (typeof setRole === "function") setRole("admin");
        }

        setShowToast({
          show: true,
          message: "Signed in successfully as Administrator.",
          type: "success",
        });

        navigate("/admin/dashboard", { state: { role: "admin" } });
      } else {
        setError(res.data?.message || "Invalid email or password credentials.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Invalid email or password credentials.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Admin Register Submission
  const handleAdminRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!formData.email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await adminRegister({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      if (res.data?.success) {
        const { token, admin } = res.data;
        if (token) {
          localStorage.setItem("token", token);
          localStorage.setItem("adminToken", token);
        }
        localStorage.setItem("userRole", "admin");
        if (admin) {
          localStorage.setItem("adminData", JSON.stringify(admin));
          if (typeof setUser === "function") setUser(admin);
          if (typeof setRole === "function") setRole("admin");
        }

        setShowToast({
          show: true,
          message: "Admin account registered successfully.",
          type: "success",
        });

        navigate("/admin/dashboard", { state: { role: "admin" } });
      } else {
        setError(res.data?.message || "Registration failed.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "An error occurred while creating the admin account.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Employee Login Submission (Login ONLY - No self-registration)
  const handleEmployeeLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.trim() || !formData.password) {
      setError("Please enter your Work Email or Employee ID and password.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await employeeLogin({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (res.data?.success) {
        const { token, employee } = res.data;
        if (token) {
          localStorage.setItem("token", token);
          localStorage.setItem("employeeToken", token);
        }
        localStorage.setItem("userRole", "employee");
        if (employee) {
          localStorage.setItem("employeeData", JSON.stringify(employee));
          if (typeof setUser === "function") setUser(employee);
          if (typeof setRole === "function") setRole("employee");
        }

        setShowToast({
          show: true,
          message: `Welcome back, ${employee?.fullName || "Employee"}!`,
          type: "success",
        });

        navigate("/employee/dashboard", { state: { role: "employee" } });
      } else {
        setError(res.data?.message || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Invalid email/employee ID or password.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  const isAdmin = role === "admin";

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 sm:p-6 relative">
        {/* Back to Portal Selection */}
        <Link
          to="/welcome"
          className="absolute top-6 left-6 inline-flex items-center px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl shadow-xs hover:shadow-md hover:border-[#002185] transition-all text-[#002185] font-medium text-sm z-10"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Selection
        </Link>

        <div className="w-full max-w-md my-8">
          {/* Header Brand */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-3">
              <img className="w-32 h-auto object-contain" src={eyenitLogo} alt="Eyenit" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#002185]/10 text-[#002185] border border-[#002185]/20 text-xs font-bold uppercase tracking-wider mb-2">
              {isAdmin ? (
                <>
                  <ShieldCheckIcon className="w-4 h-4 text-[#002185]" />
                  {isRegisterMode ? "Admin Registration" : "Administrator Portal"}
                </>
              ) : (
                <>
                  <UserIcon className="w-4 h-4 text-[#ff5500]" />
                  Staff & Employee Portal
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1E48] dark:text-blue-100 tracking-tight">
              {isAdmin
                ? isRegisterMode
                  ? "Create Admin Account"
                  : title || "Admin Portal Login"
                : title || "Employee Sign In"}
            </h1>

            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              {isAdmin
                ? isRegisterMode
                  ? "Register a new administrator account with system privileges."
                  : subtitle || "Sign in with your verified administrator database credentials."
                : subtitle || "Access your attendance, personal payslips, leaves, and dashboard."}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5">
              <ErrorMessage message={error} onClose={() => setError(null)} />
            </div>
          )}

          {/* Card Container */}
          <div className="bg-white p-7 sm:p-8 rounded-2xl shadow-lg border border-[#E2E8F0]">
            {isAdmin ? (
              isRegisterMode ? (
                /* ================= ADMIN REGISTRATION FORM ================= */
                <form onSubmit={handleAdminRegisterSubmit} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="form-admin-fullname"
                      className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
                    >
                      Full Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        id="form-admin-fullname"
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="e.g. Sarah Jenkins"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#002185]/20 focus:border-[#002185] transition-all"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="form-admin-reg-email"
                      className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
                    >
                      Email Address <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="form-admin-reg-email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="admin@organization.com"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#002185]/20 focus:border-[#002185] transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="form-admin-reg-pass"
                      className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
                    >
                      Password <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="form-admin-reg-pass"
                        type={formData.showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                        className="w-full pl-10 pr-11 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#002185]/20 focus:border-[#002185] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({ ...p, showPassword: !p.showPassword }))
                        }
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#0F172A]"
                      >
                        {formData.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="form-admin-reg-conf-pass"
                      className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
                    >
                      Confirm Password <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="form-admin-reg-conf-pass"
                        type={formData.showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Re-enter password"
                        required
                        minLength={6}
                        className="w-full pl-10 pr-11 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#002185]/20 focus:border-[#002185] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({
                            ...p,
                            showConfirmPassword: !p.showConfirmPassword,
                          }))
                        }
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#0F172A]"
                      >
                        {formData.showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Privilege Notice */}
                  <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-xl flex items-start gap-2.5 text-xs text-[#166534]">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>
                      Account will be registered directly in database with <strong>role: 'admin'</strong>.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#002185] hover:bg-[#001760] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <ShieldCheckIcon className="w-4 h-4" />
                    Create Admin Account
                  </button>

                  <div className="pt-4 text-center">
                    <p className="text-sm text-[#64748B]">
                      Already have an Admin account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setIsRegisterMode(false);
                        }}
                        className="text-[#002185] font-bold hover:text-[#ff5500] hover:underline cursor-pointer"
                      >
                        Sign In here
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                /* ================= ADMIN LOGIN FORM ================= */
                <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="form-admin-login-email"
                      className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
                    >
                      Admin Email <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="form-admin-login-email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="admin@organization.com"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#002185]/20 focus:border-[#002185] transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="form-admin-login-pass"
                      className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
                    >
                      Password <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="form-admin-login-pass"
                        type={formData.showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Enter admin password"
                        required
                        className="w-full pl-10 pr-11 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#002185]/20 focus:border-[#002185] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({ ...p, showPassword: !p.showPassword }))
                        }
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#0F172A]"
                      >
                        {formData.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#002185] hover:bg-[#001760] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <ShieldCheckIcon className="w-4 h-4" />
                    Sign In as Administrator
                  </button>

                  <div className="pt-4 text-center">
                    <p className="text-sm text-[#64748B]">
                      Need a new Admin account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setIsRegisterMode(true);
                        }}
                        className="text-[#002185] font-bold hover:text-[#ff5500] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Register Admin
                      </button>
                    </p>
                  </div>
                </form>
              )
            ) : (
              /* ================= EMPLOYEE LOGIN FORM (LOGIN ONLY) ================= */
              <form onSubmit={handleEmployeeLoginSubmit} className="space-y-4">
                {/* Email or ID */}
                <div>
                  <label
                    htmlFor="form-emp-login-email"
                    className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
                  >
                    Work Email or Employee ID <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="form-emp-login-email"
                      type="text"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="e.g. employee@organization.com or EMP001"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/20 focus:border-[#ff5500] transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="form-emp-login-pass"
                    className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
                  >
                    Password <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="form-emp-login-pass"
                      type={formData.showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      required
                      className="w-full pl-10 pr-11 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/20 focus:border-[#ff5500] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((p) => ({ ...p, showPassword: !p.showPassword }))
                      }
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#0F172A]"
                    >
                      {formData.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Strict Restriction Notice: Employees Cannot Self-Register */}
                <div className="p-3 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl flex items-start gap-2.5 text-xs text-[#9A3412]">
                  <Info className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
                  <span>
                    Employee accounts are provisioned exclusively by administrators. Self-registration is restricted.
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#ff5500] hover:bg-[#e04b00] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <UserIcon className="w-4 h-4" />
                  Sign In to Employee Portal
                </button>

                <div className="pt-4 text-center">
                  <p className="text-sm text-[#64748B]">
                    Are you an Administrator?{" "}
                    <Link
                      to="/admin/login"
                      className="text-[#002185] font-bold hover:text-[#ff5500] hover:underline"
                    >
                      Admin Sign In
                    </Link>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {showToast?.show && (
        <Toaster
          message={showToast.message}
          type={showToast.type}
          onClose={() =>
            setShowToast((prev) => ({
              ...prev,
              show: false,
            }))
          }
        />
      )}
    </>
  );
};

export default LoginForm;
