// components/admin/settings/EmployeeSettings.js
import { useState } from "react";
import { Hash,  Shield, Clock, Users } from "lucide-react";

 const employeeSettings = {
  employeeIdPrefix: "EYENIT",
  autoGenerateEmployeeId: true,
  defaultRole: "Employee",
  allowEmployeePasswordChange: true,
  requireProfilePhoto: false,
  probationPeriod: 90,
  defaultEmploymentStatus: "Active",
};

const EmployeeSettings = () => {
  const [employee, setEmployee] = useState(employeeSettings);

  const handleChange = (field, value) => {
    setEmployee((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Employee ID Prefix
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              value={employee.employeeIdPrefix}
              onChange={(e) => handleChange("employeeIdPrefix", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Default Role
          </label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <select
              value={employee.defaultRole}
              onChange={(e) => handleChange("defaultRole", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 appearance-none"
            >
              <option value="Employee">Employee</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Probation Period (Days)
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="number"
              value={employee.probationPeriod}
              onChange={(e) =>
                handleChange("probationPeriod", parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Default Employment Status
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <select
              value={employee.defaultEmploymentStatus}
              onChange={(e) =>
                handleChange("defaultEmploymentStatus", e.target.value)
              }
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 appearance-none"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Probation">Probation</option>
            </select>
          </div>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3 bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={employee.autoGenerateEmployeeId}
            onChange={(e) =>
              handleChange("autoGenerateEmployeeId", e.target.checked)
            }
            className="w-4 h-4 text-[#ff5500] border-[#E2E8F0] rounded focus:ring-[#ff5500]"
          />
          <span className="text-sm text-[#334155]">
            Auto-generate Employee ID
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={employee.allowEmployeePasswordChange}
            onChange={(e) =>
              handleChange("allowEmployeePasswordChange", e.target.checked)
            }
            className="w-4 h-4 text-[#ff5500] border-[#E2E8F0] rounded focus:ring-[#ff5500]"
          />
          <span className="text-sm text-[#334155]">
            Allow employees to change password
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={employee.requireProfilePhoto}
            onChange={(e) =>
              handleChange("requireProfilePhoto", e.target.checked)
            }
            className="w-4 h-4 text-[#ff5500] border-[#E2E8F0] rounded focus:ring-[#ff5500]"
          />
          <span className="text-sm text-[#334155]">Require Profile Photo</span>
        </label>
      </div>
    </div>
  );
};

export default EmployeeSettings;
