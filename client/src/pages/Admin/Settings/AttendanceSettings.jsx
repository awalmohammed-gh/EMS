// components/admin/settings/AttendanceSettings.js
import { useState } from "react";
import {
  Clock,
  Timer,
  AlarmClock,
} from "lucide-react";

 const attendanceSettings = {
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  workStartTime: "08:00",
  workEndTime: "17:00",
  breakDuration: 60,
  lateAfterMinutes: 15,
  overtimeEnabled: true,
};

const AttendanceSettings = () => {
  const [attendance, setAttendance] = useState(attendanceSettings);

  const handleChange = (field, value) => {
    setAttendance((prev) => ({ ...prev, [field]: value }));
  };

  const handleWorkingDayToggle = (day) => {
    setAttendance((prev) => {
      const currentDays = prev.workingDays;
      const updatedDays = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day];
      return { ...prev, workingDays: updatedDays };
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Work Start Time
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="time"
              value={attendance.workStartTime}
              onChange={(e) => handleChange("workStartTime", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Work End Time
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="time"
              value={attendance.workEndTime}
              onChange={(e) => handleChange("workEndTime", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Break Duration (Minutes)
          </label>
          <div className="relative">
            <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="number"
              value={attendance.breakDuration}
              onChange={(e) =>
                handleChange("breakDuration", parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Late After (Minutes)
          </label>
          <div className="relative">
            <AlarmClock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="number"
              value={attendance.lateAfterMinutes}
              onChange={(e) =>
                handleChange("lateAfterMinutes", parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Working Days
          </label>
          <div className="flex flex-wrap gap-4">
            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((day) => (
              <label
                key={day}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={attendance.workingDays.includes(day)}
                  onChange={() => handleWorkingDayToggle(day)}
                  className="w-4 h-4 text-[#ff5500] border-[#E2E8F0] rounded focus:ring-[#ff5500]"
                />
                <span className="text-sm text-[#334155]">{day}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Overtime Toggle */}
      <div className="bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={attendance.overtimeEnabled}
            onChange={(e) => handleChange("overtimeEnabled", e.target.checked)}
            className="w-4 h-4 text-[#ff5500] border-[#E2E8F0] rounded focus:ring-[#ff5500]"
          />
          <span className="text-sm text-[#334155]">
            Enable Overtime Tracking
          </span>
        </label>
      </div>
    </div>
  );
};

export default AttendanceSettings;
