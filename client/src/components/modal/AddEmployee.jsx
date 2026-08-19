import { useState } from "react";
import { useManagement } from "../../context/ManagementContextProvider";
import {
  X,
  User,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  UserPlus,
  ChevronDown,
} from "lucide-react";

const AddEmployee = () => {
  const { setShowEmployeeModal } = useManagement();

  const [employeeForm, setEmployeeForm] = useState({
    employeeId: "",
    firstName: "",
    lastName: "",
    phone: "",
    department: "",
    position: "",
    employmentDate: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setEmployeeForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log(employeeForm);

    // Send employeeForm to your backend here

    setShowEmployeeModal(false);
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
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-[#FFFFFF] shadow-2xl border-2 border-[#002185] animate-fade-in flex flex-col overflow-hidden"
        >
          {/* Header - fixed, never scrolls */}
          <div className="shrink-0 bg-[#FFFFFF] px-6 pt-6 pb-5 flex items-center justify-between border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#002185] flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#002185] leading-tight">
                  Add Employee
                </h2>
                <p className="text-sm text-[#64748B]">
                  Fill in the details to add a new employee
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowEmployeeModal(false)}
              className="p-2 text-[#64748B] hover:text-[#ff5500] hover:bg-[#F8FAFC] rounded-lg transition-all duration-200 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body - the only part that scrolls */}
          <form
            id="add-employee-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-6 space-y-5"
          >
            {/* Employee ID */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#002185]">
                Employee ID
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
                  placeholder="EMP001"
                  className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-sm placeholder-[#94A3B8] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* First and Last Name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#002185]">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-[#94A3B8]" />
                  </div>
                  <input
                    type="text"
                    name="firstName"
                    value={employeeForm.firstName}
                    onChange={handleChange}
                    placeholder="Eyenit"
                    className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-sm placeholder-[#94A3B8] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#002185]">
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-[#94A3B8]" />
                  </div>
                  <input
                    type="text"
                    name="lastName"
                    value={employeeForm.lastName}
                    onChange={handleChange}
                    placeholder="gh"
                    className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-sm placeholder-[#94A3B8] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#002185]">
                Phone
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
                  placeholder="024 000 0000"
                  className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-sm placeholder-[#94A3B8] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Department & Position */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#002185]">
                  Department
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Building2 className="h-4 w-4 text-[#94A3B8]" />
                  </div>
                  <select
                    name="department"
                    value={employeeForm.department}
                    onChange={handleChange}
                    className="w-full pl-10 pr-9 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-sm hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200 appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Finance">Finance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
                  </div>
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#002185]">
                  Position
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
                    placeholder="Frontend Developer"
                    className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-sm placeholder-[#94A3B8] hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Employment Date */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#002185]">
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
                  className="w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-sm hover:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 focus:border-[#ff5500] transition-all duration-200"
                  required
                />
              </div>
            </div>
          </form>

          {/* Footer - fixed, never scrolls */}
          <div className="shrink-0 bg-[#FFFFFF] px-6 py-4 flex justify-end gap-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setShowEmployeeModal(false)}
              className="px-5 py-2.5 text-sm font-medium text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg hover:border-[#ff5500] hover:text-[#002185] hover:bg-[#F8FAFC] transition-all duration-200"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="add-employee-form"
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#002185] hover:bg-[#ff5500] rounded-lg transition-all duration-300 shadow-sm hover:shadow-lg flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Employee
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddEmployee;
