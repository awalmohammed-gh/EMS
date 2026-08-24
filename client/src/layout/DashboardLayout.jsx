import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "../pages/Admin/AdminSidebar";
import EmployeeSidebar from "../pages/Employees/EmployeeSidebar";
import Navbar from "../components/Navbar";

export const DashboardLayout = ({ role: propRole }) => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Derive active role (default to admin or determine from pathname/props)
  const isEmployee =
    propRole === "employee" || location.pathname.startsWith("/employee");
  const role = isEmployee ? "employee" : "admin";

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  // Window Resize Guard: Automatically reset isMobileOpen to false when expanded to desktop (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar Component with mobile open state & close handler */}
      {role === "admin" ? (
        <AdminSidebar
          isMobileOpen={isMobileOpen}
          onClose={closeMobileSidebar}
        />
      ) : (
        <EmployeeSidebar
          isMobileOpen={isMobileOpen}
          onClose={closeMobileSidebar}
        />
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Unified Top Navigation Bar */}
        <Navbar
          role={role}
          isMobileOpen={isMobileOpen}
          toggleMobileSidebar={toggleMobileSidebar}
          onMenuClick={toggleMobileSidebar}
        />

        {/* Scrollable Page Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
