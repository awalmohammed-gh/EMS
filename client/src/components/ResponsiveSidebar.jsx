import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  CalendarDays,
  Megaphone,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  User,
  Sun,
  Moon,
} from "lucide-react";
import eyenitLogo from "../assets/eyenit_logo.png";
import { useManagement } from "../context/ManagementContextProvider";
import { useTheme } from "../context/ThemeContext";

/**
 * ResponsiveSidebar Component
 * 
 * Provides a responsive navigation sidebar for the application, integrated with HashRouter.
 * Includes direct links for Dashboard, Employees, Attendance, Payroll, and Leave Requests.
 * Supports both desktop persistent drawer and mobile collapsible overlay modes.
 */
export const ResponsiveSidebar = ({
  role: propRole,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, role: contextRole, logout } = useManagement();
  const { isDark, toggleTheme } = useTheme();
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);

  const effectiveMobileOpen = onMobileClose !== undefined ? isMobileOpen : internalMobileOpen;
  const handleClose = () => {
    if (onMobileClose) {
      onMobileClose();
    } else {
      setInternalMobileOpen(false);
    }
  };

  const isAdmin =
    propRole === "admin" ||
    (!propRole && pathname.startsWith("/admin")) ||
    (contextRole === "admin" && !pathname.startsWith("/employee"));

  const userRoleTitle = isAdmin
    ? user?.role === "super_admin"
      ? "Super Admin"
      : "Administrator"
    : user?.position || "Staff Member";

  const adminLinks = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Employees", path: "/admin/dashboard/employees", icon: Users },
    { name: "Attendance", path: "/admin/dashboard/attendance", icon: CalendarCheck },
    { name: "Payroll", path: "/admin/dashboard/payroll", icon: CreditCard },
    { name: "Leave Requests", path: "/admin/dashboard/leave", icon: CalendarDays },
    { name: "Announcements", path: "/admin/dashboard/announcements", icon: Megaphone },
    { name: "Settings", path: "/admin/dashboard/settings", icon: Settings },
  ];

  const employeeLinks = [
    { name: "Dashboard", path: "/employee/dashboard", icon: LayoutDashboard },
    { name: "Attendance", path: "/employee/dashboard/attendance", icon: CalendarCheck },
    { name: "Payslips", path: "/employee/dashboard/payslips", icon: CreditCard },
    { name: "Leave Requests", path: "/employee/dashboard/leave", icon: CalendarDays },
    { name: "Settings", path: "/employee/dashboard/settings", icon: Settings },
  ];

  const navLinks = isAdmin ? adminLinks : employeeLinks;

  const handleLogout = async () => {
    handleClose();
    if (logout) {
      await logout(isAdmin ? "admin" : "employee");
    }
    navigate("/welcome");
  };

  const isLinkActive = (itemPath) => {
    if (pathname === itemPath) return true;
    if (itemPath === "/admin/dashboard/payroll" && pathname === "/admin/dashboard/payslips") return true;
    if (itemPath === "/admin/dashboard/leave" && pathname.startsWith("/admin/dashboard/leave")) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Toggle Trigger Button (rendered if standalone) */}
      {onMobileClose === undefined && (
        <button
          type="button"
          onClick={() => setInternalMobileOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md text-slate-700 dark:text-slate-200"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Persistent Desktop Sidebar */}
      <aside
        id="responsive-desktop-sidebar"
        className="hidden lg:flex flex-col h-full w-64 bg-white dark:bg-slate-900 border-r border-[#E2E8F0] dark:border-slate-800 shadow-xs shrink-0 z-10 transition-colors duration-200"
      >
        {/* Brand Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[#E2E8F0] dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center p-1 border border-[#E2E8F0] dark:border-slate-700 shadow-2xs">
              <img className="w-full h-full object-contain" src={eyenitLogo} alt="Eyenit" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#002185] dark:text-blue-400 tracking-tight">Eyenit</p>
              <p className="text-[11px] font-medium text-[#64748B] dark:text-slate-400">Management System</p>
            </div>
          </div>
        </div>

        {/* User Role Badge */}
        <div className="mx-4 mt-4 mb-2 p-2.5 rounded-xl bg-[#002185] dark:bg-blue-700 text-white shadow-xs border border-[#002185]/20 dark:border-blue-500/30">
          <div className="flex items-center justify-center gap-2">
            {isAdmin ? (
              <ShieldCheck className="w-4 h-4 text-[#ff5500]" />
            ) : (
              <User className="w-4 h-4 text-[#ff5500]" />
            )}
            <span className="text-xs font-bold tracking-wide">{userRoleTitle}</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
          {navLinks.map((item) => {
            const active = isLinkActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-[#002185] text-white shadow-md shadow-[#002185]/20 dark:bg-blue-600"
                    : "text-[#64748B] dark:text-slate-300 hover:bg-[#002185]/10 dark:hover:bg-slate-800 hover:text-[#002185] dark:hover:text-blue-400"
                }`}
              >
                <Icon className={`size-5 mr-3 shrink-0 ${active ? "text-white" : "text-[#64748B] dark:text-slate-400"}`} />
                <span className="truncate">{item.name}</span>
                {active && <span className="ml-auto w-1.5 h-6 bg-[#ff5500] rounded-full"></span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="px-3 pb-5 pt-3 border-t border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/50 space-y-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="flex items-center gap-2">
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#002185]" />}
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">
              {isDark ? "Dark" : "Light"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 rounded-xl text-xs font-bold text-[#DC2626] dark:text-red-400 hover:bg-[#FEF2F2] dark:hover:bg-red-950/30 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-[#DC2626] dark:text-red-400 mr-2.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {effectiveMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden overflow-hidden">
          <div
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
          />

          <aside className="fixed inset-y-0 left-0 w-64 max-w-[80vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 shadow-2xl flex flex-col justify-between z-10">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center p-1 border border-gray-200 dark:border-slate-700">
                    <img className="w-full h-full object-contain" src={eyenitLogo} alt="Eyenit" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-[#002185] dark:text-blue-400 block">Eyenit</span>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 block font-medium">Management</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Role Badge */}
              <div className="mt-3 mb-2 p-2 rounded-lg bg-[#002185] dark:bg-blue-700 text-white shadow-xs flex items-center justify-center gap-1.5">
                {isAdmin ? <ShieldCheck className="w-3.5 h-3.5 text-[#ff5500]" /> : <User className="w-3.5 h-3.5 text-[#ff5500]" />}
                <span className="text-[11px] font-bold tracking-wide">{userRoleTitle}</span>
              </div>

              {/* Navigation */}
              <nav className="space-y-1 py-2">
                {navLinks.map((item) => {
                  const active = isLinkActive(item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={handleClose}
                      className={`flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? "bg-[#002185] text-white shadow-md dark:bg-blue-600"
                          : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon className={`w-4 h-4 mr-2.5 shrink-0 ${active ? "text-white" : "text-gray-500 dark:text-slate-400"}`} />
                      <span>{item.name}</span>
                      {active && <span className="ml-auto w-1 h-3.5 bg-[#ff5500] rounded-full"></span>}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-gray-200 dark:border-slate-800 space-y-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-2">
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#002185]" />}
                  <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center w-full px-2.5 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default ResponsiveSidebar;
