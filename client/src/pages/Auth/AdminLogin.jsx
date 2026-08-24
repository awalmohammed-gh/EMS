import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  UserPlus,
  Info,
} from "lucide-react";
import eyenitLogo from "../../assets/eyenit_logo.png";
import { adminLogin, checkAdminExists } from "../../apis/fontApis";
import { useManagement } from "../../context/ManagementContextProvider";
import ErrorMessage from "../../ui/ErrorMessage";
import Loading from "../../ui/Loading";

export const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    showPassword: false,
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [adminExists, setAdminExists] = useState(true);
  const { setShowToast, setUser, setRole } = useManagement();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const verifyAdminSetup = async () => {
      try {
        const res = await checkAdminExists();
        if (isMounted && res.data) {
          setAdminExists(Boolean(res.data.exists));
        }
      } catch (err) {
        console.warn("Could not verify admin existence:", err);
      } finally {
        if (isMounted) setIsCheckingSetup(false);
      }
    };

    verifyAdminSetup();
    return () => {
      isMounted = false;
    };
  }, []);

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

    if (!formData.email.trim() || !formData.password) {
      setError("Please enter both email address and password.");
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
        setError(res.data?.message || "Login failed. Please check your credentials.");
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

  if (isLoading || isCheckingSetup) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 sm:p-6 relative">
      {/* Back to Portal Selection */}
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
            Administrator Access
          </div>
          <h1 className="text-2xl font-extrabold text-[#002185] tracking-tight">
            Admin Portal Login
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Sign in with your verified administrator database credentials.
          </p>
        </div>

        {/* Admin Configured Status Banner */}
        {adminExists ? (
          <div className="mb-5 p-3.5 rounded-xl bg-[#002185]/5 border border-[#002185]/20 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#002185] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-[#002185]">
                Admin account configured.
              </p>
              <p className="text-[11px] text-[#475569]">
                Please sign in to manage accounts and system settings.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Info className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900">Setup Required</p>
                <p className="text-[11px] text-amber-700">No admin account found.</p>
              </div>
            </div>
            <Link
              to="/admin/register"
              className="px-3 py-1.5 bg-[#002185] text-white rounded-lg text-xs font-bold hover:bg-[#ff5500] transition-colors"
            >
              Create Admin
            </Link>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-5">
            <ErrorMessage message={error} onClose={() => setError(null)} />
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white p-7 sm:p-8 rounded-2xl shadow-lg border border-[#E2E8F0]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Address */}
            <div>
              <label
                htmlFor="admin-login-email"
                className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
              >
                Email Address <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="admin-login-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="admin@eyenitgh.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#002185]/20 focus:border-[#002185] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="admin-login-password"
                className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
              >
                Password <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="admin-login-password"
                  type={formData.showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
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
                  {formData.showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="admin-login-submit-btn"
              type="submit"
              className="w-full bg-[#002185] hover:bg-[#001760] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Sign In as Administrator
            </button>
          </form>

          {/* Registration Section or Lockout Guidance */}
          <div className="mt-6 pt-5 border-t border-[#F1F5F9] text-center">
            {adminExists ? (
              <p className="text-xs text-[#64748B]">
                <span className="font-semibold text-[#002185]">Security Note:</span> Self-registration is restricted. Staff members and additional accounts are provisioned from inside the Admin Dashboard.
              </p>
            ) : (
              <p className="text-sm text-[#64748B]">
                Need to create the primary Admin account?{" "}
                <Link
                  to="/admin/register"
                  className="text-[#002185] font-bold hover:text-[#ff5500] hover:underline inline-flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Register Admin
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
