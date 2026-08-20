import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Building2,
  Calendar,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { useManagement } from "../context/ManagementContextProvider";
import NotificationBell from "./NotificationBell";

export const Navbar = ({ role: propsRole }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role: contextRole, logout } = useManagement();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Active role can be passed via props or retrieved from context/pathname
  const role =
    propsRole ||
    (location.pathname.startsWith("/admin") ? "admin" : contextRole || "employee");

  const isAdmin = role === "admin";

  // Derive current page context name from pathname
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("/attendance")) return "Attendance & Timesheet";
    if (path.includes("/employees")) return "Employee Directory";
    if (path.includes("/leave")) return "Leave Management";
    if (path.includes("/payroll") || path.includes("/payslips")) return "Payroll & Payslips";
    if (path.includes("/settings")) return "System Settings";
    if (path === "/admin/dashboard" || path === "/employee/dashboard") return "Dashboard Overview";
    return "Dashboard";
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  // Handle Logout
  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    await logout(role);
    navigate("/welcome");
  };

  // Fallback initial helper
  const getAvatarInitials = (name) => {
    if (!name) return isAdmin ? "A" : "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const displayName = user?.fullName || (isAdmin ? "System Administrator" : "Employee");
  const displayEmail = user?.email || (isAdmin ? "admin@eyenit.com" : "employee@eyenit.com");
  const displayRole = isAdmin ? "Administrator" : "Employee";
  const displayDept = user?.department || (isAdmin ? "Executive Management" : "Operations");
  const displayPosition = user?.position || (isAdmin ? "Principal Administrator" : "Staff Member");

  return (
    <header
      id="unified-dashboard-navbar"
      className="sticky top-0 z-[1000] w-full bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs transition-all duration-200"
      style={{ position: "sticky", top: 0, zIndex: 1000 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Page Title / Breadcrumb / Context */}
          <div className="flex items-center gap-3 pl-12 lg:pl-0">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${
                    isAdmin
                      ? "bg-[#002185]/10 text-[#002185] border border-[#002185]/20"
                      : "bg-[#ff5500]/10 text-[#ff5500] border border-[#ff5500]/20"
                  }`}
                >
                  {isAdmin ? (
                    <ShieldCheck className="w-3 h-3 text-[#002185]" />
                  ) : (
                    <User className="w-3 h-3 text-[#ff5500]" />
                  )}
                  {displayRole}
                </span>
                <span className="hidden sm:inline text-xs text-[#94A3B8]">•</span>
                <span className="hidden sm:inline text-xs font-semibold text-[#64748B]">
                  {displayDept}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          {/* Right Section: Date Badge + Notification Bell + User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Quick Status / Portal Tag (Desktop) */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B]">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
              <span className="font-semibold text-[#002185]">{displayDept}</span>
            </div>

            {/* Notification Bell with live unread badge */}
            <div className="relative">
              <NotificationBell role={role} />
            </div>

            {/* User Profile Trigger & Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                id="user-profile-menu-trigger"
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="true"
                className={`flex items-center gap-2 sm:gap-3 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isProfileMenuOpen
                    ? "bg-[#F8FAFC] border-[#002185] shadow-xs"
                    : "bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
                }`}
              >
                {/* User Profile Avatar / Image with Fallback Initial */}
                <div className="relative">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={displayName}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-[#E2E8F0] shadow-xs"
                    />
                  ) : (
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-xs ${
                        isAdmin
                          ? "bg-gradient-to-tr from-[#002185] to-[#0A3BB8]"
                          : "bg-gradient-to-tr from-[#ff5500] to-[#FF7733]"
                      }`}
                    >
                      {getAvatarInitials(displayName)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#16A34A] border-2 border-white rounded-full"></span>
                </div>

                {/* Name & Title (Desktop) */}
                <div className="hidden sm:block text-left max-w-[130px] md:max-w-[160px]">
                  <p className="text-xs font-bold text-[#0F172A] truncate leading-tight">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-[#64748B] truncate leading-tight">
                    {displayPosition}
                  </p>
                </div>

                {/* Dropdown Chevron */}
                <ChevronDown
                  className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${
                    isProfileMenuOpen ? "rotate-180 text-[#002185]" : ""
                  }`}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div
                  id="user-profile-dropdown-menu"
                  className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl z-[1001] py-2 animate-in fade-in slide-in-from-top-2 duration-150"
                  role="menu"
                  aria-orientation="vertical"
                >
                  {/* Dropdown Header Card */}
                  <div className="px-4 py-3 border-b border-[#F1F5F9] bg-[#F8FAFC]">
                    <div className="flex items-center gap-3">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={displayName}
                          className="w-11 h-11 rounded-xl object-cover border border-[#E2E8F0]"
                        />
                      ) : (
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-xs ${
                            isAdmin
                              ? "bg-[#002185]"
                              : "bg-[#ff5500]"
                          }`}
                        >
                          {getAvatarInitials(displayName)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#0F172A] truncate">
                          {displayName}
                        </p>
                        <p className="text-xs text-[#64748B] truncate">
                          {displayEmail}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isAdmin
                                ? "bg-[#002185] text-white"
                                : "bg-[#ff5500] text-white"
                            }`}
                          >
                            {displayRole}
                          </span>
                          <span className="text-[10px] text-[#64748B] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                            Active
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contextual Meta Information */}
                  <div className="px-4 py-2 border-b border-[#F1F5F9] text-xs text-[#64748B] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                        Department
                      </span>
                      <span className="font-semibold text-[#0F172A]">
                        {displayDept}
                      </span>
                    </div>
                    {user?.employeeId && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#94A3B8]" />
                          Employee ID
                        </span>
                        <span className="font-semibold text-[#002185]">
                          {user.employeeId}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Navigation Links */}
                  <div className="py-1">
                    <Link
                      to={
                        isAdmin
                          ? "/admin/dashboard/settings"
                          : "/employee/dashboard/settings"
                      }
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] hover:text-[#002185] transition-colors"
                      role="menuitem"
                    >
                      <Settings className="w-4 h-4 text-[#64748B]" />
                      <span>Profile & Account Settings</span>
                    </Link>

                    <Link
                      to={
                        isAdmin
                          ? "/admin/dashboard/leave"
                          : "/employee/dashboard/leave"
                      }
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] hover:text-[#002185] transition-colors"
                      role="menuitem"
                    >
                      <Calendar className="w-4 h-4 text-[#64748B]" />
                      <span>Leave & Time Off</span>
                    </Link>

                    <Link
                      to={
                        isAdmin
                          ? "/employee/dashboard"
                          : "/admin/dashboard"
                      }
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#002185] transition-colors"
                      role="menuitem"
                    >
                      <span className="flex items-center gap-2.5">
                        <ExternalLink className="w-4 h-4 text-[#64748B]" />
                        <span>
                          {isAdmin ? "Switch to Employee View" : "Switch to Admin Portal"}
                        </span>
                      </span>
                      <span className="text-[10px] bg-[#E2E8F0] text-[#475569] px-1.5 py-0.5 rounded">
                        Portal
                      </span>
                    </Link>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[#F1F5F9] my-1" />

                  {/* Logout Button */}
                  <div className="px-2 py-1">
                    <button
                      id="navbar-logout-btn"
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#DC2626] hover:bg-[#FEF2F2] rounded-xl transition-colors cursor-pointer"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log out of account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
