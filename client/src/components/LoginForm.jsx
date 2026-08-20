import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  UserPlus,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react";
import { useState} from "react";
import Loading from "../ui/Loading";
import ErrorMessage from "../ui/ErrorMessage";
import eyenitLogo from "../assets/eyenit_logo.png";
import { adminLog, employeeAccount, employeeLogin } from "../apis/fontApis";
import { useManagement } from "../context/ManagementContextProvider";
import Toaster from "../ui/Toaster";

const LoginForm = ({ role, title, subtitle }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    employeeId: "",
    email: "",
    password: "",
    phone: "",
    department: "",
    position: "",
    employmentDate: "",
    showPassword: false,
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const { showToast, setShowToast } = useManagement();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const togglePasswordVisibility = () => {
    setFormData((prevData) => ({
      ...prevData,
      showPassword: !prevData.showPassword,
    }));
  };

  // Admin Login Handler
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      const { data } = await adminLog({
        email: formData.email,
        password: formData.password,
      });

      if (data.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem("userRole", "admin");
          if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("adminToken", data.token);
          }
        }
        setShowToast({
          show: true,
          message: data.message,
          type: "success",
        });
        navigate("/admin/dashboard", {
          state: {
            role: "admin",
          },
        });
      } else {
        setError(data.message || "Login failed. Please try again.");
      }
    } catch (error) {
      setError(error.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Admin Sign Up Handler (for creating employee accounts)
  const handleAdminSignUp = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Validate form fields
      if (!formData.fullName) {
        setError("Please enter the employee's full name.");
        setIsLoading(false);
        return;
      }
      if (!formData.employeeId) {
        setError("Please enter the employee's ID.");
        setIsLoading(false);
        return;
      }
      if (!formData.email) {
        setError("Please enter the employee's email address.");
        setIsLoading(false);
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        setError("Password must be at least 6 characters long.");
        setIsLoading(false);
        return;
      }
      if (!formData.phone) {
        setError("Please enter the employee's phone number.");
        setIsLoading(false);
        return;
      }
      if (!formData.department) {
        setError("Please select the employee's department.");
        setIsLoading(false);
        return;
      }
      if (!formData.position) {
        setError("Please enter the employee's position.");
        setIsLoading(false);
        return;
      }
      if (!formData.employmentDate) {
        setError("Please select the employment date.");
        setIsLoading(false);
        return;
      }

      const { data } = await employeeAccount(formData);
      if (data.success) {
        setSuccessMessage(
          `Account created successfully for ${formData.fullName} (${formData.email})! The employee can now login with these credentials.`,
        );

        setShowToast({
          type: "success",
          message: data.message,
          show: true,
        });

        // Reset form after success - clear all fields
        setFormData({
          fullName: "",
          employeeId: "",
          email: "",
          password: "",
          phone: "",
          department: "",
          position: "",
          employmentDate: "",
          showPassword: false,
        });

        // Auto switch back to login after 3 seconds
        setTimeout(() => {
          setIsSignUp(false);
          setSuccessMessage(null);
        }, 3000);
      } else {
        setError(data.message || "Failed to create account. Please try again.");
      }
    } catch (error) {
      setError(error.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Employee Login Handler
  const handleEmployeeLogin = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Only email and password are needed for employee login
      const employeeFormData = {
        email: formData.email,
        password: formData.password,
      };

      const { data } = await employeeLogin(employeeFormData);
      if (data.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem("userRole", "employee");
          if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("employeeToken", data.token);
          }
          if (data.employee) {
            localStorage.setItem("employeeData", JSON.stringify(data.employee));
          }
        }
        setShowToast({
          show: true,
          message: data.message,
          type: "success",
        });
        navigate("/employee/dashboard", {
          state: {
            role: "employee",
          },
        });
      } else {
        setError(data.message || "Login failed. Please try again.");
      }
    } catch (error) {
      setError(error.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (role === "admin") {
      if (isSignUp) {
        handleAdminSignUp(e);
      } else {
        handleAdminLogin(e);
      }
    } else {
      handleEmployeeLogin(e);
    }
  };


  if (isLoading) {
    return <Loading />;
  }

  // Admin specific titles and descriptions

  const adminSubtitle =
    "Enter your admin credentials to access the management dashboard";

  // Employee specific titles and descriptions
  // const employeeTitle = "Employee Login";
  const employeeSubtitle =
    "Enter your employee credentials to access your portal";

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 relative">
        {/* Back Button - Top Left Corner */}
        <Link
          to="/welcome"
          className="absolute top-6 left-6 inline-flex items-center px-4 py-2 bg-[#FFFFFF] border-2 border-[#002185] rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-[#002185] hover:text-[#ff5500] hover:border-[#ff5500] z-10"
        >
          <ArrowLeftIcon size={16} />
          <span className="ml-2 text-sm font-medium">
            Back to Portal Selection
          </span>
        </Link>

        <div
          className={`w-full ${isSignUp && role === "admin" ? "max-w-2xl" : "max-w-md"}`}
        >
          {/* Brand/Header */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center">
              <img
                className="w-34 h-auto object-contain"
                src={eyenitLogo}
                alt="Eyenit"
              />
            </div>
          </div>

          {/* Welcome Section */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {role === "admin" ? (
                <ShieldCheckIcon className="w-6 h-6 text-[#002185]" />
              ) : (
                <UserIcon className="w-6 h-6 text-[#002185]" />
              )}
              <span className="text-xs font-medium text-[#002185] bg-[#EFF6FF] px-3 py-1 rounded-full border border-[#002185]/20">
                {role === "admin" ? "Administrator" : "Employee"}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#002185] tracking-tight">
              {isSignUp && role === "admin"
                ? "Create Employee Account"
                : title || (role === "admin" ? "Admin Portal" : "Employee Portal")}
            </h2>
            <p className="text-[#64748B] mt-2">
              {isSignUp && role === "admin"
                ? "Register a new employee with their credentials"
                : subtitle || (role === "admin" ? adminSubtitle : employeeSubtitle)}
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-[#F0FDF4] border border-[#16A34A] rounded-lg text-sm text-[#16A34A]">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6">
              <ErrorMessage
                message={error}
                onRetry={() => {
                  setError(null);
                  handleSubmit(new Event("submit"));
                }}
                onClose={() => setError(null)}
              />
            </div>
          )}

          {/* ===================== ADMIN LOGIN (narrower container) ===================== */}
          {!isSignUp && role === "admin" && (
            <form
              onSubmit={handleSubmit}
              className="bg-[#FFFFFF] p-8 rounded-xl shadow-md border-2 border-[#002185]"
            >
              <div className="space-y-6">
                {/* Admin Badge */}
                <div className="flex items-center justify-center gap-2 p-2 bg-[#EFF6FF] rounded-lg border border-[#002185]/20">
                  <ShieldCheckIcon className="w-5 h-5 text-[#002185]" />
                  <span className="text-sm font-medium text-[#002185]">
                    Administrator Access
                  </span>
                </div>

                {/* Email Field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-[#002185] mb-1.5"
                  >
                    Email Address <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-[#64748B]" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#0F172A] placeholder-[#64748B] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-[#002185] mb-1.5"
                  >
                    Password <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-[#64748B]" />
                    </div>
                    <input
                      type={formData.showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-12 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#0F172A] placeholder-[#64748B] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#002185] transition-colors duration-200"
                    >
                      {formData.showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-[#002185] hover:bg-[#ff5500] text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:ring-offset-2"
                >
                  Admin Login
                </button>

                {/* Toggle to Sign Up */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setError(null);
                      setSuccessMessage(null);
                      setFormData({
                        fullName: "",
                        employeeId: "",
                        email: "",
                        password: "",
                        phone: "",
                        department: "",
                        position: "",
                        employmentDate: "",
                        showPassword: false,
                      });
                    }}
                    className="text-sm text-[#002185] hover:text-[#ff5500] font-medium transition-colors duration-300"
                  >
                    + Create New Employee Account
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ===================== EMPLOYEE LOGIN (stands alone) ===================== */}
          {!isSignUp && role !== "admin" && (
            <form
              onSubmit={handleSubmit}
              className="bg-[#FFFFFF] p-8 rounded-xl shadow-md border-2 border-[#002185]"
            >
              <div className="space-y-6">
                {/* Employee Badge */}
                <div className="flex items-center justify-center gap-2 p-2 bg-[#EFF6FF] rounded-lg border border-[#002185]/20">
                  <UserIcon className="w-5 h-5 text-[#002185]" />
                  <span className="text-sm font-medium text-[#002185]">
                    Employee Access
                  </span>
                </div>

                {/* Email Field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-[#002185] mb-1.5"
                  >
                    Email Address <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-[#64748B]" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#0F172A] placeholder-[#64748B] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-[#002185] mb-1.5"
                  >
                    Password <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-[#64748B]" />
                    </div>
                    <input
                      type={formData.showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-12 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#0F172A] placeholder-[#64748B] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#002185] transition-colors duration-200"
                    >
                      {formData.showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-[#002185] hover:bg-[#ff5500] text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:ring-offset-2"
                >
                  Employee Login
                </button>
              </div>
            </form>
          )}

          {/* ===================== ADMIN SIGN UP — fields split left/right ===================== */}
          {isSignUp && role === "admin" && (
            <form
              onSubmit={handleSubmit}
              className="bg-[#FFFFFF] p-8 rounded-xl shadow-md border-2 border-[#002185]"
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Full Name, Email, Password */}
                  <div className="space-y-4 md:pr-4">
                    {/* Full Name */}
                    <div>
                      <label
                        htmlFor="fullName"
                        className="block text-sm font-medium text-[#002185] mb-1.5"
                      >
                        Full Name <span className="text-[#DC2626]">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-[#64748B]" />
                        </div>
                        <input
                          type="text"
                          id="fullName"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          placeholder="Enter full name"
                          className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#0F172A] placeholder-[#64748B] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                          required
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-[#002185] mb-1.5"
                      >
                        Email Address <span className="text-[#DC2626]">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-[#64748B]" />
                        </div>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Enter email address"
                          className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#0F172A] placeholder-[#64748B] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                          required
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-[#002185] mb-1.5"
                      >
                        Temporary Password{" "}
                        <span className="text-[#DC2626]">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-[#64748B]" />
                        </div>
                        <input
                          type={formData.showPassword ? "text" : "password"}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Min 6 characters"
                          className="w-full pl-10 pr-12 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#0F172A] placeholder-[#64748B] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#002185] transition-colors duration-200"
                        >
                          {formData.showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      <p className="mt-1.5 text-xs text-[#64748B]">
                        Password must be at least 6 characters
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Employee ID, Phone, Department, Position, Employment Date */}
                  <div className="space-y-4 md:pl-4 md:border-l md:border-[#E2E8F0]">
                    {/* Employee ID */}
                    <div>
                      <label
                        htmlFor="employeeId"
                        className="block text-sm font-medium text-[#002185] mb-1.5"
                      >
                        Employee ID <span className="text-[#DC2626]">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserPlus className="h-5 w-5 text-[#64748B]" />
                        </div>
                        <input
                          type="text"
                          id="employeeId"
                          name="employeeId"
                          value={formData.employeeId}
                          onChange={handleInputChange}
                          placeholder="EMP001"
                          className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#0F172A] placeholder-[#64748B] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                          required
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-[#002185] mb-1.5"
                      >
                        Phone Number <span className="text-[#DC2626]">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-[#64748B]" />
                        </div>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="024 000 0000"
                          className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#0F172A] placeholder-[#64748B] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                          required
                        />
                      </div>
                    </div>

                    {/* Department */}
                    <div>
                      <label
                        htmlFor="department"
                        className="block text-sm font-medium text-[#002185] mb-1.5"
                      >
                        Department <span className="text-[#DC2626]">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Building2 className="h-5 w-5 text-[#64748B]" />
                        </div>
                        <select
                          id="department"
                          name="department"
                          value={formData.department}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#0F172A] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200 appearance-none cursor-pointer"
                          required
                        >
                          <option value="">Select Department</option>
                          <option value="Human Resources">
                            Administrative
                          </option>
                          <option value="Engineering">
                            Software Engineering
                          </option>
                          <option value="Finance">Large Format</option>
                          <option value="Marketing">Digital Marketing</option>
                          <option value="Sales">Graphic Design</option>
                        </select>
                      </div>
                    </div>

                    {/* Position */}
                    <div>
                      <label
                        htmlFor="position"
                        className="block text-sm font-medium text-[#002185] mb-1.5"
                      >
                        Position <span className="text-[#DC2626]">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Briefcase className="h-5 w-5 text-[#64748B]" />
                        </div>
                        <input
                          type="text"
                          id="position"
                          name="position"
                          value={formData.position}
                          onChange={handleInputChange}
                          placeholder="Frontend Developer"
                          className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#0F172A] placeholder-[#64748B] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                          required
                        />
                      </div>
                    </div>

                    {/* Employment Date */}
                    <div>
                      <label
                        htmlFor="employmentDate"
                        className="block text-sm font-medium text-[#002185] mb-1.5"
                      >
                        Employment Date{" "}
                        <span className="text-[#DC2626]">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-[#64748B]" />
                        </div>
                        <input
                          type="date"
                          id="employmentDate"
                          name="employmentDate"
                          value={formData.employmentDate}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#0F172A] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit & Back Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setError(null);
                      setSuccessMessage(null);
                      setFormData({
                        fullName: "",
                        employeeId: "",
                        email: "",
                        password: "",
                        phone: "",
                        department: "",
                        position: "",
                        employmentDate: "",
                        showPassword: false,
                      });
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg hover:border-[#ff5500] hover:text-[#002185] transition-all duration-200"
                  >
                    ← Back to Login
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#002185] hover:bg-[#ff5500] text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:ring-offset-2"
                  >
                    Create Employee Account
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
      {showToast.show && (
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
