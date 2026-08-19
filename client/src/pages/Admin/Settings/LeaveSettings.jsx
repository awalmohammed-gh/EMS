// components/admin/settings/LeaveSettings.js
import { useState } from "react";
import { CalendarDays, } from "lucide-react";

 const leaveSettings = {
  annualLeaveDays: 15,
  sickLeaveDays: 10,
  casualLeaveDays: 5,
  maternityLeaveDays: 90,
  paternityLeaveDays: 14,
  requireApproval: true,
  allowLeaveCancellation: true,
};

const LeaveSettings = () => {
  const [leave, setLeave] = useState(leaveSettings);

  const handleChange = (field, value) => {
    setLeave((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Annual Leave (Days)
          </label>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="number"
              value={leave.annualLeaveDays}
              onChange={(e) =>
                handleChange("annualLeaveDays", parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Sick Leave (Days)
          </label>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="number"
              value={leave.sickLeaveDays}
              onChange={(e) =>
                handleChange("sickLeaveDays", parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Casual Leave (Days)
          </label>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="number"
              value={leave.casualLeaveDays}
              onChange={(e) =>
                handleChange("casualLeaveDays", parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Maternity Leave (Days)
          </label>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="number"
              value={leave.maternityLeaveDays}
              onChange={(e) =>
                handleChange("maternityLeaveDays", parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Paternity Leave (Days)
          </label>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="number"
              value={leave.paternityLeaveDays}
              onChange={(e) =>
                handleChange("paternityLeaveDays", parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3 bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={leave.requireApproval}
            onChange={(e) => handleChange("requireApproval", e.target.checked)}
            className="w-4 h-4 text-[#ff5500] border-[#E2E8F0] rounded focus:ring-[#ff5500]"
          />
          <span className="text-sm text-[#334155]">
            Require Admin Approval for Leave
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={leave.allowLeaveCancellation}
            onChange={(e) =>
              handleChange("allowLeaveCancellation", e.target.checked)
            }
            className="w-4 h-4 text-[#ff5500] border-[#E2E8F0] rounded focus:ring-[#ff5500]"
          />
          <span className="text-sm text-[#334155]">
            Allow employees to cancel leave requests
          </span>
        </label>
      </div>
    </div>
  );
};

export default LeaveSettings;
