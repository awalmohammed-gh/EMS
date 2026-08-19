import { useLocation } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import EmployeeLayout from "./EmployeesLayout";

const DashboardLayout = () => {
  const location = useLocation();
  const role = location.state?.role || "admin";

  return role === "admin" ? <AdminLayout /> : <EmployeeLayout />;
};

export default DashboardLayout;
