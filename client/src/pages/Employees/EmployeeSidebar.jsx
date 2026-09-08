import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboardIcon,
  CalendarIcon,
  Banknote,
  SettingsIcon,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { useAttendance } from "../../context/AttendanceContext";

const EmployeeSidebar = () => {
  const { pathname } = useLocation();
  const { isClockedIn, isClockedOut } = useAttendance();

  const employeeLinks = [
    {
      name: "Dashboard",
      path: "/employee/dashboard",
      icon: LayoutDashboardIcon,
    },
    {
      name: "Attendance",
      path: "/employee/dashboard/attendance",
      icon: CalendarIcon,
      badge: isClockedOut ? (
        <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
          Done
        </span>
      ) : isClockedIn ? (
        <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          On
        </span>
      ) : null,
    },
    {
      name: "Payslips",
      path: "/employee/dashboard/payslips",
      icon: Banknote,
    },
    { name: "Leave", path: "/employee/dashboard/leave", icon: CalendarIcon },
    {
      name: "Settings",
      path: "/employee/dashboard/settings",
      icon: SettingsIcon,
    },
  ];

  return (
    <Sidebar role="employee">
      {/* Navigation Links */}
      <div className="flex-1 space-y-1.5">
        {employeeLinks.map((link) => {
          const isActive = pathname === link.path;
          return (
            <Link
              key={link.name}
              to={link.path}
              state={{ role: "employee" }}
              className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[#002185] text-white shadow-md shadow-[#002185]/20 dark:bg-blue-600"
                  : "text-[#64748B] dark:text-slate-300 hover:bg-[#002185]/10 dark:hover:bg-slate-800 hover:text-[#002185] dark:hover:text-blue-400"
              }`}
            >
              <link.icon
                className={`size-5 ${
                  isActive
                    ? "text-white"
                    : "text-[#64748B] dark:text-slate-400 group-hover:text-[#ff5500]"
                }`}
              />
              <span className="ml-3">{link.name}</span>
              {link.badge && !isActive && (
                <span className="ml-auto">{link.badge}</span>
              )}
              {isActive && (
                <span className="ml-auto w-1.5 h-6 bg-[#ff5500] rounded-full"></span>
              )}
            </Link>
          );
        })}
      </div>
    </Sidebar>
  );
};

export default EmployeeSidebar;
