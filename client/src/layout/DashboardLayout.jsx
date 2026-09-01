import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "../pages/Admin/AdminSidebar";
import EmployeeSidebar from "../pages/Employees/EmployeeSidebar";
import Navbar from "../components/Navbar";
import MobileSidebar from "../components/MobileSidebar";
import MobileBottomNav from "../components/MobileBottomNav";
import ErrorBoundary from "../components/ErrorBoundary";

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

        {/* Scrollable Page Content Area with Bottom Padding for Mobile Nav */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-slate-900 transition-colors duration-200 pb-20 md:pb-6">
          <ErrorBoundary
            key={location.pathname}
            title="Failed to Load View"
            message="A client-side error occurred while rendering this page. You can try reloading the section or returning to the dashboard."
          >
            <Outlet />
          </ErrorBoundary>
        </main>

        {/* Mobile-First Fixed Bottom Navigation Bar & Slide-Up Features Drawer */}
        <MobileBottomNav userRole={role} />
      </div>
    </div>
  );
};

export default DashboardLayout;

