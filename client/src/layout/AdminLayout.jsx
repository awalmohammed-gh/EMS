import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../pages/Admin/AdminSidebar";
import Navbar from "../components/Navbar";

const AdminLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Auto-dismiss mobile drawer on window resize back to desktop (>= 1024px)
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
      <AdminSidebar
        isMobileOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Unified Sticky Navigation Bar */}
        <Navbar
          role="admin"
          isMobileOpen={isMobileOpen}
          onMenuClick={() => setIsMobileOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

