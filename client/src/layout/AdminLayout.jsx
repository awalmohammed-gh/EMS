import { Outlet } from "react-router-dom";
import AdminSidebar from "../pages/Admin/AdminSidebar";
import Navbar from "../components/Navbar";

const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Unified Sticky Navigation Bar */}
        <Navbar role="admin" />
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

