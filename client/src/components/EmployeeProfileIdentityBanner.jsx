import { useState, useEffect } from "react";
import {
  Building2,
  Briefcase,
  IdCard,
  Mail,
} from "lucide-react";
import Avatar from "./Avatar";
import { useManagement } from "../context/ManagementContextProvider";

export const EmployeeProfileIdentityBanner = ({
  employeeData,
  todayAttendance,
}) => {
  const { user } = useManagement();

  // Merge employee data from props and context
  const emp = {
    ...(user || {}),
    ...(employeeData || {}),
  };

  const fullName = emp.fullName || emp.full_name || emp.name || "Employee";
  const employeeId = emp.employeeId || emp.empId || emp.id || "EMP-1001";
  const department = emp.department || "Operations";
  const position = emp.position || emp.jobTitle || emp.role || "Team Member";
  const email = emp.email || "";

  // Dynamic avatar URL resolution with multi-level fallback
  const getResolvedAvatar = () => {
    let saved;
    try {
      saved = JSON.parse(
        localStorage.getItem("employeeData") ||
          localStorage.getItem("userData") ||
          "{}"
      );
    } catch {
      saved = {};
    }

    return (
      employeeData?.avatar ||
      employeeData?.avatarUrl ||
      employeeData?.profilePicture ||
      employeeData?.profile_image_url ||
      employeeData?.profile_picture ||
      user?.avatar ||
      user?.avatarUrl ||
      user?.profilePicture ||
      user?.profile_image_url ||
      user?.profile_picture ||
      saved?.avatar ||
      saved?.avatarUrl ||
      saved?.profilePicture ||
      saved?.profile_image_url ||
      emp.avatar ||
      emp.profilePicture ||
      ""
    );
  };

  const [currentAvatar, setCurrentAvatar] = useState(getResolvedAvatar);

  useEffect(() => {
    const avatarUrl = getResolvedAvatar();
    if (avatarUrl) {
      setCurrentAvatar(avatarUrl);
    }
  }, [
    employeeData,
    user,
    emp.avatar,
    emp.profilePicture,
    emp.profile_image_url,
  ]);

  // Listen for global avatar updates
  useEffect(() => {
    const handleAvatarUpdate = (e) => {
      if (e.detail && typeof e.detail.avatarUrl !== "undefined") {
        setCurrentAvatar(e.detail.avatarUrl);
      }
    };
    window.addEventListener("avatarUpdated", handleAvatarUpdate);
    return () => window.removeEventListener("avatarUpdated", handleAvatarUpdate);
  }, []);

  // Determine current attendance / shift status
  const isClockedIn = Boolean(
    todayAttendance?.clockIn && !todayAttendance?.clockOut
  );
  const isCompletedShift = Boolean(
    todayAttendance?.clockIn && todayAttendance?.clockOut
  );

  const shiftStatus = isClockedIn
    ? {
        label: "Active Shift (Clocked In)",
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
        border: "border-emerald-200 dark:border-emerald-800/60",
        text: "text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500 animate-pulse",
      }
    : isCompletedShift
    ? {
        label: "Shift Completed",
        bg: "bg-blue-50 dark:bg-blue-950/40",
        border: "border-blue-200 dark:border-blue-800/60",
        text: "text-blue-700 dark:text-blue-300",
        dot: "bg-blue-500",
      }
    : {
        label: "Not Clocked In",
        bg: "bg-slate-100 dark:bg-slate-800/60",
        border: "border-slate-200 dark:border-slate-700/80",
        text: "text-slate-600 dark:text-slate-300",
        dot: "bg-slate-400",
      };

  return (
    <div
      id="employee-visual-identity-banner"
      className="w-full bg-white dark:bg-[#111927] border border-slate-200/70 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm transition-all duration-200"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Core Identity Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full">
          {/* Avatar Container with Active Status Dot */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden ring-2 ring-slate-200/80 dark:ring-slate-700/60 bg-slate-100 dark:bg-slate-800 select-none">
              <Avatar
                src={currentAvatar}
                name={fullName}
                size="2xl"
                className="w-full h-full text-2xl font-bold"
                shape="rounded"
              />
            </div>

            {/* Shift status pulse dot */}
            <span
              className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#111927] ${shiftStatus.dot}`}
              title={shiftStatus.label}
            />
          </div>

          {/* Employee Metadata */}
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {fullName}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${shiftStatus.bg} ${shiftStatus.border} ${shiftStatus.text}`}
              >
                <span className={`w-2 h-2 rounded-full ${shiftStatus.dot}`} />
                {shiftStatus.label}
              </span>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 font-medium">
                <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{position}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 font-medium">
                <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{department}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/60 font-semibold">
                <IdCard className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>ID: {employeeId}</span>
              </span>

              {email && (
                <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">
                  <Mail className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{email}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileIdentityBanner;
