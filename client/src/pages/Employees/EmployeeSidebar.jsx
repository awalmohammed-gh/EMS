import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboardIcon,
  CalendarIcon,
  FileTextIcon,
  SettingsIcon,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";

const EmployeeSidebar = () => {
  const { pathname } = useLocation();

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
    },
    {
      name: "Payslips",
      path: "/employee/dashboard/payslips",
      icon: FileTextIcon,
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
