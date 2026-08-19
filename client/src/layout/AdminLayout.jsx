import { Outlet } from "react-router-dom";
import AdminSidebar from "../pages/Admin/AdminSidebar";

const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
        <div className="p-4 pt-16 sm:pt-6 sm:p-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
