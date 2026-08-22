import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, LogOut, ShieldCheck, User, Menu } from "lucide-react";
import eyenitLogo from "../assets/eyenit_logo.png";
import { useManagement } from "../context/ManagementContextProvider";

/**
 * Mobile-first Sidebar Drawer Component
 * 
 * Provides an accessible, responsive overlay drawer for mobile & tablet screens,
 * featuring smooth slide-in/out transitions, a backdrop click-to-dismiss overlay,
 * keyboard ESC listener, body scroll locking, and an optional embedded hamburger toggle button.
 */
export const MobileSidebarDrawer = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  children,
  role: propRole,
  showToggle = false,
}) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  const context = useManagement();
  const isOpen =
    propIsOpen !== undefined
      ? propIsOpen
      : context?.isSidebarOpen ?? context?.isMobileSidebarOpen ?? false;
  const contextOnClose = context?.closeSidebar || context?.closeMobileSidebar;

  const handleClose = useCallback(() => {
    if (propOnClose) {
      propOnClose();
    } else if (contextOnClose) {
      contextOnClose();
    }
  }, [propOnClose, contextOnClose]);

  const user = context?.user;
  const logout = context?.logout;

  // Determine active role
  const isAdmin =
    (propRole || (pathname.startsWith("/admin") ? "admin" : (context?.role === "admin" && !pathname.startsWith("/employee") ? "admin" : "employee"))) ===
    "admin";

  const userRoleTitle = isAdmin
    ? user?.role === "super_admin"
      ? "Super Admin"
      : "Administrator"
    : user?.position || "Staff Member";

  // Prevent background body scrolling when drawer is open
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

  // Handle ESC key to dismiss drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Auto-close on route change
  useEffect(() => {
    handleClose();
  }, [pathname, handleClose]);

  // Logout handler
  const handleLogout = async () => {
    handleClose();
    if (logout) {
      await logout(isAdmin ? "admin" : "employee");
    }
    navigate("/welcome");
  };

  return (
    <>
      {/* Optional Standalone Hamburger Menu Toggle */}
      {showToggle && (
        <button
          type="button"
          onClick={context?.toggleMobileSidebar}
          aria-expanded={isOpen}
          aria-controls="mobile-sidebar-drawer-panel"
          aria-label="Toggle navigation menu"
          className="lg:hidden inline-flex items-center justify-center p-2 rounded-xl border border-[#E2E8F0] bg-white text-[#002185] hover:bg-[#F8FAFC] hover:border-[#002185] transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#002185]/20"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Dimmed Backdrop Overlay with transition */}
      <div
        id="mobile-sidebar-backdrop"
        onClick={handleClose}
        aria-hidden="true"
        className={`lg:hidden fixed inset-0 z-[1001] bg-[#0F172A]/50 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide-over Drawer Panel */}
      <aside
        id="mobile-sidebar-drawer-panel"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
        className={`lg:hidden fixed inset-y-0 left-0 z-[1002] w-72 max-w-[85vw] bg-white border-r border-[#E2E8F0] shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header with Logo & Close Button */}
        <div className="px-5 pt-5 pb-4 border-b border-[#E2E8F0] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center p-1 border border-[#E2E8F0] shadow-2xs">
              <img
                className="w-full h-full object-contain"
                src={eyenitLogo}
                alt="Eyenit Logo"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-[#002185] tracking-tight">Eyenit</p>
              <p className="text-[11px] font-medium text-[#64748B]">Management System</p>
            </div>
          </div>

          <button
            id="mobile-drawer-close-btn"
            type="button"
            onClick={handleClose}
            aria-label="Close navigation drawer"
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role Pill */}
        <div className="mx-4 mt-4 mb-2 p-2.5 rounded-xl bg-[#002185] text-white shadow-xs border border-[#002185]/20 flex items-center justify-center gap-2">
          {isAdmin ? (
            <ShieldCheck className="w-4 h-4 text-[#ff5500]" />
          ) : (
            <User className="w-4 h-4 text-[#ff5500]" />
          )}
          <span className="text-xs font-bold tracking-wide">{userRoleTitle}</span>
        </div>

        {/* Navigation Items (Content injected from router or parent) */}
        <nav
          className="flex-1 px-3 py-3 space-y-1 overflow-y-auto"
          onClick={handleClose}
        >
          {children}
        </nav>

        {/* Bottom Sign Out Action */}
        <div className="px-3 pb-5 pt-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <button
            id="mobile-drawer-logout-btn"
            type="button"
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 rounded-xl text-xs font-bold text-[#DC2626] hover:bg-[#FEF2F2] transition-all duration-200 cursor-pointer group border border-transparent hover:border-[#FEE2E2]"
          >
            <LogOut className="w-4 h-4 text-[#DC2626] group-hover:translate-x-0.5 transition-transform" />
            <span className="ml-2.5">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default MobileSidebarDrawer;
