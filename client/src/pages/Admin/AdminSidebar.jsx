import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboardIcon,
  Users,
  CalendarCheck,
  Banknote,
  CalendarDays,
  Megaphone,
  Settings,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";

const AdminSidebar = () => {
  const { pathname } = useLocation();

  const adminLinks = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboardIcon },
    { name: "Employees", path: "/admin/dashboard/employees", icon: Users },
    { name: "Attendance", path: "/admin/dashboard/attendance", icon: CalendarCheck },
    { name: "Payroll", path: "/admin/dashboard/payroll", icon: Banknote },
    { name: "Leave Requests", path: "/admin/dashboard/leave", icon: CalendarDays },
    { name: "Announcements", path: "/admin/dashboard/announcements", icon: Megaphone },
    { name: "Settings", path: "/admin/dashboard/settings", icon: Settings },
  ];

  return (
    <Sidebar role="admin">
      {/* Navigation Links */}
      <div className="flex-1 space-y-1.5">
        {adminLinks.map((link) => {
          const isActive =
            pathname === link.path ||
            (link.path === "/admin/dashboard/payroll" && pathname === "/admin/dashboard/payslips") ||
            (link.path === "/admin/dashboard/leave" && pathname.startsWith("/admin/dashboard/leave"));
          return (
            <Link
              key={link.name}
              to={link.path}
              state={{ role: "admin" }}
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

export default AdminSidebar;
