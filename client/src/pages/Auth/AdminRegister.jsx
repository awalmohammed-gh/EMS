import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import eyenitLogo from "../../assets/eyenit_logo.png";
import { adminRegister, checkAdminExists } from "../../apis/fontApis";
import { useManagement } from "../../context/ManagementContextProvider";
import ErrorMessage from "../../ui/ErrorMessage";
import Loading from "../../ui/Loading";

export const AdminRegister = () => {
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
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const { setShowToast, setUser, setRole } = useManagement();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const verifySingleAdminPolicy = async () => {
      try {
        const res = await checkAdminExists();
        if (isMounted && res.data?.exists) {
          setIsLockedOut(true);
          setShowToast({
            show: true,
            message: "Admin account configured. Please sign in to manage accounts.",
            type: "info",
          });
          navigate("/admin/login", { replace: true, state: { lockedOut: true } });
        }
      } catch (err) {
        console.warn("Error checking admin status:", err);
      } finally {
        if (isMounted) setIsCheckingSetup(false);
      }
    };

    verifySingleAdminPolicy();
    return () => {
      isMounted = false;
    };
  }, [navigate, setShowToast]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
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
          message: "Primary Admin account registered successfully! Welcome to the dashboard.",
          type: "success",
        });

        navigate("/admin/dashboard", { state: { role: "admin" } });
      } else {
        setError(res.data?.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      const statusCode = err.response?.status;
      const msg =
        err.response?.data?.message ||
        err.message ||
        "An error occurred while creating the admin account.";

      if (statusCode === 403) {
        setIsLockedOut(true);
        setShowToast({
          show: true,
          message: "Admin account configured. Please sign in to manage accounts.",
          type: "error",
        });
        setTimeout(() => {
          navigate("/admin/login", { replace: true });
        }, 1200);
      }

      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || isCheckingSetup) {
    return <Loading />;
  }

  if (isLockedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 sm:p-6 relative">
        <div className="w-full max-w-md my-8 bg-white p-8 rounded-2xl shadow-lg border border-[#E2E8F0] text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#002185] mb-2">
            Registration Locked
          </h2>
          <p className="text-sm text-[#64748B] mb-6">
            Admin account configured. Please sign in to manage accounts.
          </p>
          <Link
            to="/admin/login"
            className="w-full inline-flex items-center justify-center gap-2 bg-[#002185] hover:bg-[#001760] text-white font-bold py-3 px-4 rounded-xl transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            Proceed to Admin Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 sm:p-6 relative">
      {/* Back button to portal selection */}
      <Link
        to="/welcome"
        className="absolute top-6 left-6 inline-flex items-center px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl shadow-xs hover:shadow-md hover:border-[#002185] transition-all text-[#002185] font-medium text-sm z-10"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Selection
      </Link>

      <div className="w-full max-w-md my-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <img className="w-32 h-auto object-contain" src={eyenitLogo} alt="Eyenit" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#002185]/10 text-[#002185] border border-[#002185]/20 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-[#002185]" />
            Administrator Registration
          </div>
          <h1 className="text-2xl font-extrabold text-[#002185] tracking-tight">
            Create Admin Account
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Register a new administrator account to manage staff, payroll, and attendance.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5">
            <ErrorMessage message={error} onClose={() => setError(null)} />
          </div>
        )}

        {/* Registration Card */}
        <div className="bg-white p-7 sm:p-8 rounded-2xl shadow-lg border border-[#E2E8F0]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="admin-reg-fullname"
                className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
              >
                Full Name <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="admin-reg-fullname"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="e.g. Eyenit Ghana"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#002185]/20 focus:border-[#002185] transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="admin-reg-email"
                className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
              >
                Email Address <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="admin-reg-email"
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
                htmlFor="admin-reg-password"
                className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
              >
                Password <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="admin-reg-password"
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
                  {formData.showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="admin-reg-confirm"
                className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
              >
                Confirm Password <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="admin-reg-confirm"
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

            {/* Role Notice */}
            <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-xl flex items-start gap-2.5 text-xs text-[#166534]">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              <span>
                This account will be created directly in the database with <strong>Administrator</strong> privileges.
              </span>
            </div>

            {/* Submit Button */}
            <button
              id="admin-register-submit-btn"
              type="submit"
              className="w-full bg-[#002185] hover:bg-[#001760] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Create Admin Account
            </button>
          </form>

          {/* Toggle / Link to Admin Login */}
          <div className="mt-6 pt-5 border-t border-[#F1F5F9] text-center">
            <p className="text-sm text-[#64748B]">
              Already have an Administrator account?{" "}
              <Link
                to="/admin/login"
                className="text-[#002185] font-bold hover:text-[#ff5500] hover:underline"
              >
                Sign In here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;
