import { useState } from "react";
import { useManagement } from "../../context/ManagementContextProvider";
import { createUserAccount } from "../../apis/fontApis";
import {
  X,
  User,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  UserPlus,
  ChevronDown,
  Mail,
  Lock,
  Shield,
  Banknote,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";

export const AddEmployee = ({ onEmployeeAdded }) => {
  const { setShowEmployeeModal, setShowToast } = useManagement();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  const initialForm = {
    employeeId: `EMP00${Math.floor(Math.random() * 900) + 100}`,
    fullName: "",
    email: "",
    password: "Password@123",
    phone: "",
    department: "Software Engineering",
    position: "",
    baseSalary: "2500.00",
    employmentDate: new Date().toISOString().split("T")[0],
    role: "employee",
  };

  const [employeeForm, setEmployeeForm] = useState(initialForm);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmployeeForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Staff Account Credentials:
Full Name: ${createdCredentials.fullName || employeeForm.fullName}
Employee ID: ${createdCredentials.employeeId}
Email / Login ID: ${createdCredentials.email}
Temporary Password: ${createdCredentials.temporaryPassword}
Assigned Role: ${createdCredentials.role?.toUpperCase()}
Login URL: ${window.location.origin}/auth/employee/login`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setShowToast({
      show: true,
      message: "Credentials copied to clipboard!",
      type: "success",
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !employeeForm.fullName ||
      !employeeForm.email ||
      !employeeForm.phone ||
      !employeeForm.department ||
      !employeeForm.position ||
      !employeeForm.password
    ) {
      setShowToast({
        show: true,
        message: "Please fill in all required user fields.",
        type: "error",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { data } = await createUserAccount({
        employeeId: employeeForm.employeeId,
        fullName: employeeForm.fullName,
        email: employeeForm.email.toLowerCase().trim(),
        password: employeeForm.password.trim(),
        phone: employeeForm.phone.trim(),
        department: employeeForm.department.trim(),
        position: employeeForm.position.trim(),
        baseSalary: parseFloat(employeeForm.baseSalary) || 0,
        employmentDate: employeeForm.employmentDate,
        role: employeeForm.role,
      });

      if (data.success) {
        setShowToast({
          show: true,
          message:
            data.message ||
            `Account for ${employeeForm.fullName} (${employeeForm.role.toUpperCase()}) created successfully!`,
          type: "success",
        });

        if (onEmployeeAdded) {
          onEmployeeAdded();
        }

        // Show credentials view so Admin can copy login details
        setCreatedCredentials(
          data.credentials || {
            employeeId: employeeForm.employeeId,
            email: employeeForm.email.toLowerCase().trim(),
            temporaryPassword: employeeForm.password.trim(),
            role: employeeForm.role,
            fullName: employeeForm.fullName,
          }
        );
      } else {
        setShowToast({
          show: true,
          message: data.message || "Failed to create user account.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error creating user account:", error);
      setShowToast({
        show: true,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to create user account.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setCreatedCredentials(null);
    setEmployeeForm({
      ...initialForm,
      employeeId: `EMP00${Math.floor(Math.random() * 900) + 100}`,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setShowEmployeeModal(false)}
        className="fixed inset-0 z-30 bg-[#0F172A]/60 backdrop-blur-sm min-h-screen"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-[#FFFFFF] shadow-2xl border-2 border-[#002185] animate-fade-in flex flex-col overflow-hidden"
        >
          {createdCredentials ? (
            /* Success & Copyable Credentials Screen */
            <div className="flex flex-col flex-1 overflow-y-auto">
              <div className="bg-[#002185] px-6 py-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Account Created Successfully</h2>
                    <p className="text-xs text-blue-100">
                      Share the following login credentials with the employee
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 flex-1">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Database Synchronized:</span> The account has been verified, hashed with bcrypt, and activated for immediate login.
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-5 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
                    <span className="text-xs font-semibold text-[#64748B]">Staff Member</span>
                    <span className="text-xs font-bold text-[#0F172A]">
                      {createdCredentials.fullName || employeeForm.fullName}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
                    <span className="text-xs font-semibold text-[#64748B]">Assigned Role</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-[#002185] rounded-md uppercase">
                      {createdCredentials.role}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
                    <span className="text-xs font-semibold text-[#64748B]">Employee ID</span>
                    <code className="text-xs font-mono font-bold text-[#002185] bg-white px-2.5 py-1 rounded border border-[#CBD5E1]">
                      {createdCredentials.employeeId}
                    </code>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
                    <span className="text-xs font-semibold text-[#64748B]">Login Email</span>
                    <code className="text-xs font-mono font-bold text-[#0F172A] bg-white px-2.5 py-1 rounded border border-[#CBD5E1]">
                      {createdCredentials.email}
                    </code>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs font-semibold text-[#64748B]">Temporary Password</span>
                    <code className="text-xs font-mono font-bold text-[#ff5500] bg-white px-2.5 py-1 rounded border border-[#CBD5E1]">
                      {createdCredentials.temporaryPassword}
                    </code>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-[#002185] hover:bg-[#ff5500] text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied Credentials to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Login Credentials</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-[#FFFFFF] px-6 py-4 flex items-center justify-between border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={handleResetForAnother}
                  className="px-4 py-2 text-xs font-semibold text-[#002185] bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all cursor-pointer"
                >
                  Add Another Employee
                </button>

                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0F172A] hover:bg-black rounded-xl transition-all cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="shrink-0 bg-[#FFFFFF] px-6 pt-6 pb-5 flex items-center justify-between border-b border-[#E2E8F0]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#002185] flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#002185] leading-tight">
                      Add Staff & Assign Role
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Admin provisioned account creation with explicit system role assignment
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="p-2 text-[#64748B] hover:text-[#ff5500] hover:bg-[#F8FAFC] rounded-lg transition-all duration-200 shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form
                id="add-employee-form"
                onSubmit={handleSubmit}
                className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
              >
                {/* Role Assignment Selector */}
                <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                  <label className="mb-1.5 block text-xs font-bold text-[#002185] uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#002185]" />
                    Assigned Role <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="add-employee-role-select"
                      name="role"
                      value={employeeForm.role}
                      onChange={handleChange}
                      className="w-full pl-3.5 pr-9 py-2 border border-[#CBD5E1] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-xs font-bold hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#002185]/20 focus:border-[#002185] appearance-none cursor-pointer"
                      required
                    >
                      <option value="employee">Employee / Standard Staff (Self-Service Attendance & Payslips)</option>
                      <option value="manager">Manager (Departmental Oversight & Approvals)</option>
                      <option value="hr">HR Specialist (Staff Directory & Onboarding)</option>
                      <option value="admin">Administrator (Full System & Role Privileges)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
                    </div>
                  </div>
                </div>

                {/* Employee ID & Full Name */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#002185]">
                      Employee ID <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-[#94A3B8]" />
                      </div>
                      <input
                        type="text"
                        name="employeeId"
                        value={employeeForm.employeeId}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-xs font-mono font-bold hover:border-[#ff5500] focus:outline-none focus:ring-1 focus:ring-[#002185]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#002185]">
                      Full Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-[#94A3B8]" />
                      </div>
                      <input
                        type="text"
                        name="fullName"
                        value={employeeForm.fullName}
                        onChange={handleChange}
                        placeholder="e.g. Kwame Mensah"
                        className="w-full pl-10 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-xs hover:border-[#ff5500] focus:outline-none focus:ring-1 focus:ring-[#002185]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#002185]">
                      Work Email <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-[#94A3B8]" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={employeeForm.email}
                        onChange={handleChange}
                        placeholder="kwame.mensah@company.com"
                        className="w-full pl-10 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-xs hover:border-[#ff5500] focus:outline-none focus:ring-1 focus:ring-[#002185]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#002185]">
                      Phone Number <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-[#94A3B8]" />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={employeeForm.phone}
                        onChange={handleChange}
                        placeholder="+233 24 123 4567"
                        className="w-full pl-10 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-xs hover:border-[#ff5500] focus:outline-none focus:ring-1 focus:ring-[#002185]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Department Selector */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#002185]">
                    Department <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Building2 className="h-4 w-4 text-[#94A3B8]" />
                    </div>
                    <select
                      name="department"
                      value={employeeForm.department}
                      onChange={handleChange}
                      className="w-full pl-10 pr-9 py-2 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-xs hover:border-[#ff5500] focus:outline-none focus:ring-1 focus:ring-[#002185] appearance-none cursor-pointer"
                      required
                    >
                      <option value="Software Engineering">Software Engineering</option>
                      <option value="Quality Assurance">Quality Assurance</option>
                      <option value="DevOps & Infrastructure">DevOps & Infrastructure</option>
                      <option value="Product & Design">Product & Design</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Finance & Accounting">Finance & Accounting</option>
                      <option value="Operations & Support">Operations & Support</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
                    </div>
                  </div>
                </div>

                {/* Position & Base Salary */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#002185]">
                      Position / Title <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Briefcase className="h-4 w-4 text-[#94A3B8]" />
                      </div>
                      <input
                        type="text"
                        name="position"
                        value={employeeForm.position}
                        onChange={handleChange}
                        placeholder="e.g. Senior Software Engineer"
                        className="w-full pl-10 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-xs hover:border-[#ff5500] focus:outline-none focus:ring-1 focus:ring-[#002185]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#002185]">
                      Basic Monthly Salary (GH₵)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Banknote className="h-4 w-4 text-[#94A3B8]" />
                      </div>
                      <input
                        id="input-employee-base-salary"
                        type="number"
                        step="0.01"
                        min="0"
                        name="baseSalary"
                        value={employeeForm.baseSalary}
                        onChange={handleChange}
                        placeholder="e.g., 2500.00"
                        className="w-full pl-10 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-xs hover:border-[#ff5500] focus:outline-none focus:ring-1 focus:ring-[#002185]"
                      />
                    </div>
                  </div>
                </div>

                {/* Employment Date & Default Temporary Password */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#002185]">
                      Employment Date
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Calendar className="h-4 w-4 text-[#94A3B8]" />
                      </div>
                      <input
                        type="date"
                        name="employmentDate"
                        value={employeeForm.employmentDate}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-xs hover:border-[#ff5500] focus:outline-none focus:ring-1 focus:ring-[#002185]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#002185]">
                      Temporary Password <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-[#94A3B8]" />
                      </div>
                      <input
                        type="text"
                        name="password"
                        value={employeeForm.password}
                        onChange={handleChange}
                        placeholder="Password@123"
                        className="w-full pl-10 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-xs hover:border-[#ff5500] focus:outline-none focus:ring-1 focus:ring-[#002185]"
                        required
                      />
                    </div>
                  </div>
                </div>
              </form>

              {/* Footer */}
              <div className="shrink-0 bg-[#FFFFFF] px-6 py-4 flex justify-end gap-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl hover:border-[#ff5500] hover:text-[#002185] transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  form="add-employee-form"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#002185] hover:bg-[#ff5500] rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? "Creating Account..." : "Save to Directory"}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AddEmployee;
