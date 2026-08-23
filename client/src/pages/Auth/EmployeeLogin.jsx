import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Info,
  Briefcase,
} from "lucide-react";
import eyenitLogo from "../../assets/eyenit_logo.png";
import { employeeLogin } from "../../apis/fontApis";
import { useManagement } from "../../context/ManagementContextProvider";
import ErrorMessage from "../../ui/ErrorMessage";
import Loading from "../../ui/Loading";

export const EmployeeLogin = () => {
  const [formData, setFormData] = useState({
    identifier: "", // Supports email or Employee ID (e.g. EMP001)
    password: "",
    showPassword: false,
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setShowToast, setUser, setRole } = useManagement();
  const navigate = useNavigate();

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

    if (!formData.identifier.trim() || !formData.password) {
      setError("Please enter your Work Email or Employee ID and password.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await employeeLogin({
        email: formData.identifier.trim(),
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
        "Invalid login credentials or account is inactive.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 sm:p-6 relative">
      {/* Back to Portal Selection */}
      <Link
        to="/welcome"
        className="absolute top-6 left-6 inline-flex items-center px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl shadow-xs hover:shadow-md hover:border-[#ff5500] transition-all text-[#ff5500] font-medium text-sm z-10"
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff5500]/10 text-[#ff5500] border border-[#ff5500]/20 text-xs font-bold uppercase tracking-wider mb-2">
            <Users className="w-4 h-4 text-[#ff5500]" />
            Staff & Employee Portal
          </div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            Employee Sign In
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Access your attendance, personal payslips, leaves, and dashboard.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5">
            <ErrorMessage message={error} onClose={() => setError(null)} />
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white p-7 sm:p-8 rounded-2xl shadow-lg border border-[#E2E8F0]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email or Employee ID */}
            <div>
              <label
                htmlFor="emp-login-identifier"
                className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
              >
                Work Email or Employee ID <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="emp-login-identifier"
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleInputChange}
                  placeholder="e.g. employee@eyenit.com or EMP001"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/20 focus:border-[#ff5500] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="emp-login-password"
                className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5"
              >
                Password <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="emp-login-password"
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
                  {formData.showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Strict Notice: Employee Accounts are Provisioned by Admin Only */}
            <div className="p-3 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl flex items-start gap-2.5 text-xs text-[#9A3412]">
              <Info className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
              <span>
                Employee accounts are provisioned exclusively by administrators. Self-registration is restricted.
              </span>
            </div>

            {/* Submit Button */}
            <button
              id="employee-login-submit-btn"
              type="submit"
              className="w-full bg-[#ff5500] hover:bg-[#e04b00] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Briefcase className="w-4 h-4" />
              Sign In to Employee Portal
            </button>
          </form>

          {/* Quick link to Admin portal */}
          <div className="mt-6 pt-5 border-t border-[#F1F5F9] text-center">
            <p className="text-sm text-[#64748B]">
              Are you an Administrator?{" "}
              <Link
                to="/admin/login"
                className="text-[#002185] font-bold hover:text-[#ff5500] hover:underline"
              >
                Go to Admin Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLogin;
