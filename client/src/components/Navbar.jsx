import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Menu,
  User,
  Settings,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Building2,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Briefcase,
} from "lucide-react";
import { useManagement } from "../context/ManagementContextProvider";
import NotificationBell from "./NotificationBell";

// Helper to extract dynamic initials from full name
const getInitials = (name, fallback = "EM") => {
  if (!name || typeof name !== "string") return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const Navbar = ({
  role: propsRole,
  isMobileOpen,
  onMenuClick,
  onToggleMenu,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    role: contextRole,
    logout,
    isSidebarOpen,
    isMobileSidebarOpen,
    toggleSidebar,
    toggleMobileSidebar,
  } = useManagement();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const handleSidebarToggle = () => {
    if (typeof onMenuClick === "function") {
      onMenuClick();
    } else if (typeof onToggleMenu === "function") {
      onToggleMenu();
    } else if (typeof toggleSidebar === "function") {
      toggleSidebar();
    } else if (typeof toggleMobileSidebar === "function") {
      toggleMobileSidebar();
    }
  };

  // Derive active role: strictly differentiate Employee vs Admin
  const isEmployeeRoute = location.pathname.startsWith("/employee");
  const isAdminRoute = location.pathname.startsWith("/admin");

  const isAdmin =
    propsRole === "admin" ||
    (!propsRole && isAdminRoute) ||
    ((user?.role === "admin" || user?.role === "super_admin" || user?.is_admin === true || contextRole === "admin") &&
      !isEmployeeRoute &&
      propsRole !== "employee");

  // Derive current page context name from pathname
  const getPageTitle = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes("/attendance")) return "Attendance";
    if (path.includes("/employees")) return "Employees";
    if (path.includes("/leave")) return "Leave Management";
    if (path.includes("/payroll") || path.includes("/payslips")) return "Payslips";
    if (path.includes("/settings")) return "Settings";
    if (
      path === "/admin/dashboard" ||
      path === "/employee/dashboard" ||
      path.endsWith("/dashboard") ||
      path.endsWith("/dashboard/")
    ) {
      return "Dashboard Overview";
    }
    return "Dashboard Overview";
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
    await logout(isAdmin ? "admin" : "employee");
    navigate("/welcome");
  };

  // Role-specific Data Resolution
  // 1. Employee data (dynamic from logged-in user)
  const employeeFullName = (
    user?.fullName ||
    user?.full_name ||
    user?.name ||
    "Mohammed Awal"
  ).trim();
  const employeeEmail = user?.email || "awalm8043@gmail.com";
  const employeePosition = user?.position || user?.job_title || "Frontend Developer";
  const employeeDepartment = user?.department || "Engineering";
  const employeeInitials = getInitials(employeeFullName, "MA");

  // 2. Admin data (hardcoded 'Super Admin' with 'SA' avatar and no email)
  const adminTitle = "Super Admin";
  const adminDepartment = "Executive Management";
  const adminInitials = "SA";

  return (
    <header
      id="unified-dashboard-navbar"
      className="sticky top-0 z-[1000] w-full bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs transition-all duration-200"
      style={{ position: "sticky", top: 0, zIndex: 1000 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section: Mobile Menu Toggle + Breadcrumbs/Page Context */}
          <div className="flex items-center gap-3">
            {/* Hamburger / Menu Icon Button (Visible on mobile/tablet < 1024px) */}
            <button
              id="mobile-sidebar-toggle-btn"
              type="button"
              onClick={handleSidebarToggle}
              aria-expanded={isMobileOpen ?? isSidebarOpen ?? isMobileSidebarOpen}
              aria-controls="mobile-sidebar-drawer-panel"
              className="lg:hidden inline-flex items-center justify-center p-2.5 -ml-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#002185] hover:border-[#002185] transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#002185]/20 shrink-0"
              aria-label="Toggle navigation drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              {/* Breadcrumb Tag Header (Top Left) */}
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase bg-[#002185]/10 text-[#002185] border border-[#002185]/20">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#002185]" />
                      Super Admin
                    </span>
                    <span className="hidden sm:inline text-xs text-[#94A3B8]">•</span>
                    <span className="hidden sm:inline text-xs font-semibold text-[#64748B] flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                      {adminDepartment}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase bg-[#ff5500]/10 text-[#ff5500] border border-[#ff5500]/20">
                      <Briefcase className="w-3.5 h-3.5 text-[#ff5500]" />
                      {employeePosition}
                    </span>
                    <span className="hidden sm:inline text-xs text-[#94A3B8]">•</span>
                    <span className="hidden sm:inline text-xs font-semibold text-[#64748B] flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                      {employeeDepartment}
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight truncate max-w-[170px] sm:max-w-xs md:max-w-md">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          {/* Right Section: Notification Bell + User Profile Badge */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            {/* Notification Bell */}
            <div className="relative shrink-0">
              <NotificationBell
                role={isAdmin ? "admin" : "employee"}
                userId={user?.id || user?._id || user?.employeeId}
              />
            </div>

            {/* User Profile Badge Trigger & Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                id="user-profile-menu-trigger"
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="true"
                className={`flex items-center gap-2 sm:gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isProfileMenuOpen
                    ? "bg-[#F8FAFC] border-[#002185] shadow-xs"
                    : "bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
                }`}
              >
                {/* Dynamic Avatar with Initials */}
                <div className="relative shrink-0">
                  {isAdmin ? (
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#002185] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs border border-[#002185]/20 select-none">
                      {adminInitials}
                    </div>
                  ) : user?.avatar || user?.profile_image_url || user?.profile_picture ? (
                    <img
                      src={user.avatar || user.profile_image_url || user.profile_picture}
                      alt={employeeFullName}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-[#E2E8F0] shadow-xs"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#ff5500] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs border border-[#ff5500]/20 select-none">
                      {employeeInitials}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#16A34A] border-2 border-white rounded-full"></span>
                </div>

                {/* Profile Display Text (Right Side) */}
                <div className="hidden sm:block text-left max-w-[130px] md:max-w-[170px] lg:max-w-[200px]">
                  {isAdmin ? (
                    // Admin: Primary label 'Super Admin', NO email line
                    <p className="text-xs font-bold text-[#0F172A] truncate leading-tight">
                      {adminTitle}
                    </p>
                  ) : (
                    // Employee: Top line = Full Name, Bottom line = Email Address
                    <>
                      <p className="text-xs font-bold text-[#0F172A] truncate leading-tight">
                        {employeeFullName}
                      </p>
                      <p
                        className="text-[11px] text-[#64748B] font-medium truncate leading-tight mt-0.5"
                        title={employeeEmail}
                      >
                        {employeeEmail}
                      </p>
                    </>
                  )}
                </div>

                {/* Dropdown Chevron */}
                <ChevronDown
                  className={`w-4 h-4 text-[#64748B] transition-transform duration-200 shrink-0 ${
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
                      {isAdmin ? (
                        <div className="w-11 h-11 rounded-xl bg-[#002185] text-white flex items-center justify-center font-bold text-sm border border-[#002185]/20 shrink-0 shadow-xs">
                          {adminInitials}
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-[#ff5500] text-white flex items-center justify-center font-bold text-sm border border-[#ff5500]/20 shrink-0 shadow-xs">
                          {employeeInitials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#0F172A] truncate">
                          {isAdmin ? adminTitle : employeeFullName}
                        </p>
                        {!isAdmin && (
                          <p className="text-xs text-[#64748B] truncate mt-0.5">
                            {employeeEmail}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isAdmin
                                ? "bg-[#002185] text-white"
                                : "bg-[#ff5500] text-white"
                            }`}
                          >
                            {isAdmin ? "Super Admin" : employeePosition}
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
                  <div className="px-4 py-2.5 border-b border-[#F1F5F9] text-xs text-[#64748B] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                        Department
                      </span>
                      <span className="font-semibold text-[#0F172A]">
                        {isAdmin ? adminDepartment : employeeDepartment}
                      </span>
                    </div>
                    {!isAdmin && user?.employeeId && (
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

