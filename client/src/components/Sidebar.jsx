import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MenuIcon,
  XIcon,
  LogOutIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react";
import eyenitLogo from "../assets/eyenit_logo.png";
import { useManagement } from "../context/ManagementContextProvider";
import { adminLogout, employeeLogout } from "../apis/fontApis";

const Sidebar = ({ children }) => {
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { setShowToast } = useManagement();

  const role = state?.role || "employee";
  const userRole = role.toUpperCase();

  // Handle logout based on role
  const handleLogout = async () => {
    try {
      let response;
      if (role === "admin") {
        response = await adminLogout();
      } else {
        response = await employeeLogout();
      }

      const { data } = response;
      if (data.success) {
        setShowToast({
          show: true,
          message: data.message || "Logged out successfully",
          type: "success",
        });
        // Navigate to welcome page after successful logout
        navigate("/welcome");
      } else {
        setShowToast({
          show: true,
          message: data.message || "Logout failed. Please try again.",
          type: "error",
        });
      }
    } catch (error) {
      setShowToast({
        show: true,
        message: error.message || "An error occurred during logout.",
        type: "error",
      });
    }
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-[#E2E8F0]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-[#ffffff] flex items-center justify-center p-1.5 border border-[#E2E8F0]">
              <img
                className="w-full h-full object-contain"
                src={eyenitLogo}
                alt="Eyenit"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-[#002185]">Eyenit</p>
              <p className="text-xs text-[#64748B]">Management System</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-[#64748B] hover:text-[#002185] transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>
      </div>

      {/* User Role Badge with Icon */}
      <div className="mx-3 mt-4 mb-2 p-2 rounded-lg bg-[#002185] border border-[#002185]/20">
        <div className="flex items-center justify-center gap-2">
          {userRole === "ADMIN" ? (
            <ShieldCheckIcon className="w-4 h-4 text-white" />
          ) : (
            <UserIcon className="w-4 h-4 text-white" />
          )}
          <span className="text-xs font-medium text-white">
            {userRole === "ADMIN" ? "Administrator" : "Employee"}
          </span>
        </div>
      </div>

      {/* Navigation Links - Children passed from parent */}
      <nav className="flex-1 px-3 py-4 space-y-1">{children}</nav>

      {/* Logout Button */}
      <div className="px-3 pb-6 pt-2 border-t border-[#E2E8F0]">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[#64748B] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-all duration-200 group"
        >
          <LogOutIcon className="size-5 text-[#64748B] group-hover:text-[#DC2626] transition-colors duration-200" />
          <span className="ml-3">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#FFFFFF] text-[#0F172A] rounded-lg shadow-md border border-[#E2E8F0] hover:shadow-lg transition-shadow"
      >
        <MenuIcon size={20} />
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col h-full w-64 bg-[#FFFFFF] border-r border-[#E2E8F0] shadow-sm shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-[#0F172A]/50 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#FFFFFF] border-r border-[#E2E8F0] shadow-xl transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
