import { useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LogOut,
  ShieldCheck,
  User,
} from "lucide-react";
import eyenitLogo from "../assets/eyenit_logo.png";
import { useManagement } from "../context/ManagementContextProvider";
import { MobileSidebarDrawer } from "./MobileSidebarDrawer";

export const Sidebar = ({ children }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const {
    role: contextRole,
    user,
    logout,
    isSidebarOpen,
    isMobileSidebarOpen,
    closeSidebar,
    closeMobileSidebar,
  } = useManagement();

  // Determine active role based strictly on path and auth context
  const isAdmin =
    pathname.startsWith("/admin") ||
    (contextRole === "admin" && !pathname.startsWith("/employee"));

  const userRoleTitle = isAdmin
    ? user?.role === "super_admin"
      ? "Super Admin"
      : "Administrator"
    : user?.position || "Staff Member";

  const handleClose = useCallback(() => {
    if (typeof closeSidebar === "function") closeSidebar();
    if (typeof closeMobileSidebar === "function") closeMobileSidebar();
  }, [closeSidebar, closeMobileSidebar]);

  // Handle logout
  const handleLogout = async () => {
    handleClose();
    await logout(isAdmin ? "admin" : "employee");
    navigate("/welcome");
  };

  // Close mobile/tablet sidebar automatically on route navigation
  useEffect(() => {
    handleClose();
  }, [pathname, handleClose]);

  const activeIsOpen = isSidebarOpen ?? isMobileSidebarOpen ?? false;

  return (
    <>
      {/* Desktop Persistent Sidebar (Visible only on lg+ screens) */}
      <aside
        id="desktop-persistent-sidebar"
        className="hidden lg:flex flex-col h-full w-64 bg-white border-r border-[#E2E8F0] shadow-xs shrink-0 z-10"
      >
        <div className="flex flex-col h-full bg-white">
          {/* Brand Header */}
          <div className="px-5 pt-5 pb-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-1 border border-[#E2E8F0] shadow-2xs">
                <img
                  className="w-full h-full object-contain"
                  src={eyenitLogo}
                  alt="Eyenit"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-[#002185] tracking-tight">Eyenit</p>
                <p className="text-[11px] font-medium text-[#64748B]">Management System</p>
              </div>
            </div>
          </div>

          {/* User Role Badge */}
          <div className="mx-4 mt-4 mb-2 p-2.5 rounded-xl bg-[#002185] text-white shadow-xs border border-[#002185]/20">
            <div className="flex items-center justify-center gap-2">
              {isAdmin ? (
                <ShieldCheck className="w-4 h-4 text-[#ff5500]" />
              ) : (
                <User className="w-4 h-4 text-[#ff5500]" />
              )}
              <span className="text-xs font-bold tracking-wide">{userRoleTitle}</span>
            </div>
          </div>

          {/* Navigation Links List */}
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            {children}
          </nav>

          {/* Sidebar Footer with Logout */}
          <div className="px-3 pb-5 pt-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
            <button
              id="sidebar-logout-button"
              type="button"
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2.5 rounded-xl text-xs font-bold text-[#DC2626] hover:bg-[#FEF2F2] transition-all duration-200 cursor-pointer group border border-transparent hover:border-[#FEE2E2]"
            >
              <LogOut className="w-4 h-4 text-[#DC2626] group-hover:translate-x-0.5 transition-transform" />
              <span className="ml-2.5">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile & Tablet Overlay Sidebar Drawer (Visible on screens < 1024px) */}
      <MobileSidebarDrawer
        isOpen={activeIsOpen}
        onClose={handleClose}
      >
        {children}
      </MobileSidebarDrawer>
    </>
  );
};

export default Sidebar;
