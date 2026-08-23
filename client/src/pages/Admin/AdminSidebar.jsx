import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboardIcon,
  UsersIcon,
  FileTextIcon,
  CalendarIcon,
  SettingsIcon,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";


const AdminSidebar = ({ isMobileOpen, onClose }) => {
  const { pathname } = useLocation();

  const adminLinks = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboardIcon },
    { name: "Employees", path: "/admin/dashboard/employees", icon: UsersIcon },
    { name: "Attendance", path: "/admin/dashboard/attendance", icon: UsersIcon },
    { name: "Payroll", path: "/admin/dashboard/payroll", icon: FileTextIcon },
    { name: "Leave", path: "/admin/dashboard/leave", icon: CalendarIcon },
    { name: "Settings", path: "/admin/dashboard/settings", icon: SettingsIcon },
  ];

  return (
    <Sidebar isMobileOpen={isMobileOpen} onClose={onClose}>
      {/* Navigation Links */}
      <div className="flex-1 space-y-1.5">
        {adminLinks.map((link) => {
          const isActive =
            pathname === link.path ||
            (link.path === "/admin/dashboard/payroll" && pathname === "/admin/dashboard/payslips");
          return (
            <Link
              key={link.name}
              to={link.path}
              state={{ role: "admin" }}
              onClick={() => {
                if (typeof onClose === "function") onClose();
              }}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[#002185] text-white shadow-md shadow-[#002185]/20"
                  : "text-[#64748B] hover:bg-[#002185]/10 hover:text-[#002185]"
              }`}
            >
              <link.icon
                className={`size-5 ${
                  isActive
                    ? "text-white"
                    : "text-[#64748B] group-hover:text-[#ff5500]"
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
