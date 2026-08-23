import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
} from "react-router-dom";

import Attendance from "../pages/Admin/Attendance";
import Employees from "../pages/Admin/Employees";
import Payslips from "../pages/Admin/Payslips";
import PrintPayslips from "../pages/Admin/PrintPayslips";
import Settings from "../pages/Admin/Settings";
import AdminLayout from "../layout/AdminLayout";
import ProtectedRoute from "./ProtectedRoute";
import WelcomePage from "../pages/WelcomePage";
import AdminLogin from "../pages/Auth/AdminLogin";
import AdminRegister from "../pages/Auth/AdminRegister";
import EmployeeLogin from "../pages/Auth/EmployeeLogin";
import EmployeesLayout from "../layout/EmployeesLayout";
import EmployeesAttendance from "../pages/Employees/EmployeesAttendance";
import EmployeeLeave from "../pages/Employees/EmployeeLeave";
import EmployeePayslips from "../pages/Employees/EmployeePayslips";
import EmployeeSettings from "../pages/Employees/EmployeeSettings";
import EmployeeDashboard from "../pages/Employees/EmployeeDashboard";
import AdminDashboard from "../pages/Admin/AdminDashboard";
import Leave from "../pages/Admin/Leave";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Public Routes */}
      <Route path="/" element={<Navigate to="/welcome" replace />} />
      <Route path="/welcome" element={<WelcomePage />} />

      {/* Admin Authentication Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/login/admin" element={<AdminLogin />} />
      <Route path="/admin/register" element={<AdminRegister />} />
      <Route path="/register/admin" element={<AdminRegister />} />

      {/* Employee Authentication Routes (Login Only - No Self Registration) */}
      <Route path="/employee/login" element={<EmployeeLogin />} />
      <Route path="/login/employee" element={<EmployeeLogin />} />
      <Route path="/login" element={<EmployeeLogin />} />

      {/* Admin Protected Routes */}
      <Route element={<ProtectedRoute allowRole="admin" />}>
        <Route path="/admin/dashboard" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="employees" element={<Employees />} />
          <Route path="leave" element={<Leave />} />
          <Route path="payroll" element={<Payslips />} />
          <Route path="payslips" element={<Payslips />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/print-payslips/:id" element={<PrintPayslips />} />
      </Route>

      {/* Employee Protected Routes */}
      <Route element={<ProtectedRoute allowRole="employee" />}>
        <Route path="/employee/dashboard" element={<EmployeesLayout />}>
          <Route index element={<EmployeeDashboard />} />
          <Route path="attendance" element={<EmployeesAttendance />} />
          <Route path="leave" element={<EmployeeLeave />} />
          <Route path="payslips" element={<EmployeePayslips />} />
          <Route path="settings" element={<EmployeeSettings />} />
        </Route>
      </Route>

      {/* Catch all - Redirect to welcome */}
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </>,
  ),
);
