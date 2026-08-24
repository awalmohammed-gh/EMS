import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  LogOut,
  X,
  ShieldCheck,
  User,
  Sun,
  Moon,
  Megaphone,
} from "lucide-react";
import eyenitLogo from "../assets/eyenit_logo.png";
import { useManagement } from "../context/ManagementContextProvider";
import { useTheme } from "../context/ThemeContext";

/**
 * MobileSidebar Component
 * 
 * Sleek, compact width (w-60) mobile drawer with smooth CSS sliding animations,
 * backdrop fade, rounded-r-2xl edge, and glassmorphism styling.
 */
export const MobileSidebar = ({
  isOpen,
  onClose,
  role: propRole,
  children,
}) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, role: contextRole, logout } = useManagement();
  const { isDark, toggleTheme } = useTheme();

  // Animation lifecycle state to ensure smooth open and close transitions
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    let timeoutId;
    if (isOpen) {
      setIsRendered(true);
      // Double rAF to ensure browser registers initial 0-state before animating to active state
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setIsVisible(false);
      timeoutId = setTimeout(() => {
        setIsRendered(false);
      }, 320); // match 300ms transition duration
    }
    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  // Determine active role
  const isAdmin =
    propRole === "admin" ||
    (!propRole && pathname.startsWith("/admin")) ||
    (contextRole === "admin" && !pathname.startsWith("/employee"));

  const userRoleTitle = isAdmin
    ? user?.role === "super_admin"
      ? "Super Admin"
      : "Administrator"
    : user?.position || "Staff Member";

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && typeof onClose === "function") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close on viewport resize to desktop (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isOpen && typeof onClose === "function") {
        onClose();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, onClose]);

  // Handle Logout action
  const handleLogout = async () => {
    if (typeof onClose === "function") onClose();
    if (logout) {
      await logout(isAdmin ? "admin" : "employee");
    }
    navigate("/welcome");
  };

  const adminNavItems = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Employees", path: "/admin/dashboard/employees", icon: Users },
    { name: "Attendance", path: "/admin/dashboard/attendance", icon: Calendar },
    { name: "Payroll", path: "/admin/dashboard/payroll", icon: FileText },
    { name: "Leave", path: "/admin/dashboard/leave", icon: Calendar },
    { name: "Announcements", path: "/admin/dashboard/announcements", icon: Megaphone },
    { name: "Settings", path: "/admin/dashboard/settings", icon: Settings },
  ];

  const employeeNavItems = [
    { name: "Dashboard", path: "/employee/dashboard", icon: LayoutDashboard },
    { name: "Attendance", path: "/employee/dashboard/attendance", icon: Calendar },
    { name: "Payslips", path: "/employee/dashboard/payslips", icon: FileText },
    { name: "Leave", path: "/employee/dashboard/leave", icon: Calendar },
    { name: "Settings", path: "/employee/dashboard/settings", icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : employeeNavItems;

  if (!isRendered) return null;

  return (
    <div
      id="mobile-sidebar-drawer-root"
      className="fixed inset-0 z-[999] lg:hidden overflow-hidden"
    >
      {/* Backdrop with smooth fade in/out */}
      <div
        id="mobile-sidebar-backdrop"
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Compact Drawer Panel with smooth slide-in/out and rounded-r-2xl */}
      <aside
        id="mobile-sidebar-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
        className={`fixed inset-y-0 left-0 w-60 max-w-[78vw] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-r-2xl border-r border-slate-200/80 dark:border-slate-800/80 p-3.5 shadow-2xl flex flex-col justify-between z-10 transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center p-1 border border-gray-200 dark:border-slate-700 shadow-2xs">
                <img
                  className="w-full h-full object-contain"
                  src={eyenitLogo}
                  alt="Eyenit"
                />
              </div>
              <div className="leading-tight">
                <span className="font-bold text-sm text-[#002185] dark:text-blue-400 tracking-tight block">
                  Eyenit
                </span>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium block">
                  Management
                </span>
              </div>
            </div>

            <button
              id="mobile-sidebar-close-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Role Badge */}
          <div className="mt-2.5 mb-1.5 p-2 rounded-lg bg-[#002185] dark:bg-blue-700 text-white shadow-xs flex items-center justify-center gap-1.5">
            {isAdmin ? (
              <ShieldCheck className="w-3.5 h-3.5 text-[#ff5500]" />
            ) : (
              <User className="w-3.5 h-3.5 text-[#ff5500]" />
            )}
            <span className="text-[11px] font-bold tracking-wide truncate">
              {userRoleTitle}
            </span>
          </div>
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto py-2.5">
          {children ? (
            children
          ) : (
            navItems.map((item) => {
              const isActive =
                pathname === item.path ||
                (item.path === "/admin/dashboard/payroll" &&
                  pathname === "/admin/dashboard/payslips");
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-[#002185] text-white shadow-md shadow-[#002185]/20 dark:bg-blue-600"
                      : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/80 hover:text-[#002185] dark:hover:text-blue-400"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mr-2.5 shrink-0 ${
                      isActive
                        ? "text-white"
                        : "text-gray-500 dark:text-slate-400"
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                  {isActive && (
                    <span className="ml-auto w-1 h-3.5 bg-[#ff5500] rounded-full"></span>
                  )}
                </Link>
              );
            })
          )}
        </nav>

        {/* Bottom Actions: Theme Toggle & Sign Out */}
        <div className="pt-2.5 border-t border-gray-200/80 dark:border-slate-800 space-y-1.5">
          {/* Quick Theme Toggle in Mobile Sidebar */}
          <button
            id="mobile-sidebar-theme-toggle"
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Toggle Theme"
          >
            <span className="flex items-center gap-2">
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#002185]" />
              )}
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 font-mono">
              {isDark ? "Dark" : "Light"}
            </span>
          </button>

          {/* Sign Out Button */}
          <button
            id="mobile-sidebar-logout-btn"
            type="button"
            onClick={handleLogout}
            className="flex items-center w-full px-2.5 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </div>
  );
};

export const MobileSidebarDrawer = MobileSidebar;
export default MobileSidebar;
