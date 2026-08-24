import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "../pages/Admin/AdminSidebar";
import EmployeeSidebar from "../pages/Employees/EmployeeSidebar";
import Navbar from "../components/Navbar";
import MobileSidebar from "../components/MobileSidebar";

export const DashboardLayout = ({ role: propRole }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Derive active role (admin vs employee)
  const isEmployee =
    propRole === "employee" || location.pathname.startsWith("/employee");
  const role = isEmployee ? "employee" : "admin";

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Window Resize Guard: Reset mobileMenuOpen when resized to desktop (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Persistent Desktop Sidebar (lg:flex) */}
      {role === "admin" ? <AdminSidebar /> : <EmployeeSidebar />}

      {/* Standalone Fixed Mobile Sidebar Drawer Overlay (z-[999] lg:hidden) */}
      <MobileSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        role={role}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Unified Top Navigation Bar with Mobile Toggle Prop */}
        <Navbar
          role={role}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />

        {/* Scrollable Page Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-slate-900 transition-colors duration-200">
          <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
