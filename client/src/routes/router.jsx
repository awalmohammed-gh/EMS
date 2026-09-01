import {
  createHashRouter,
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
import Login from "../pages/Auth/Login";
import AdminRegister from "../pages/Auth/AdminRegister";
import EmployeesLayout from "../layout/EmployeesLayout";
import EmployeesAttendance from "../pages/Employees/EmployeesAttendance";
import EmployeeLeave from "../pages/Employees/EmployeeLeave";
import EmployeePayslips from "../pages/Employees/EmployeePayslips";
import EmployeeSettings from "../pages/Employees/EmployeeSettings";
import EmployeeDashboard from "../pages/Employees/EmployeeDashboard";
import AdminDashboard from "../pages/Admin/AdminDashboard";
import Leave from "../pages/Admin/Leave";
import AdminAnnouncements from "../pages/Admin/Announcements";

export const router = createHashRouter(
  createRoutesFromElements(
    <>
      {/* Public Routes */}
      <Route path="/" element={<Navigate to="/welcome" replace />} />
      <Route path="/welcome" element={<WelcomePage />} />

      {/* Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<Login initialRole="admin" />} />
      <Route path="/login/admin" element={<Login initialRole="admin" />} />
      <Route path="/employee/login" element={<Login initialRole="employee" />} />
      <Route path="/login/employee" element={<Login initialRole="employee" />} />
      <Route path="/admin/register" element={<AdminRegister />} />
      <Route path="/register/admin" element={<AdminRegister />} />

      {/* Admin Protected Routes */}
      <Route element={<ProtectedRoute allowRole="admin" />}>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="payroll" element={<Payslips />} />
          <Route path="payslips" element={<Payslips />} />
          <Route path="leave" element={<Leave />} />
          <Route path="leaves" element={<Leave />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        {/* Top-level aliases for direct admin routes */}
        <Route path="/admin/employees" element={<Navigate to="/admin/dashboard/employees" replace />} />
        <Route path="/admin/attendance" element={<Navigate to="/admin/dashboard/attendance" replace />} />
        <Route path="/admin/payroll" element={<Navigate to="/admin/dashboard/payroll" replace />} />
        <Route path="/admin/payslips" element={<Navigate to="/admin/dashboard/payroll" replace />} />
        <Route path="/admin/leave" element={<Navigate to="/admin/dashboard/leave" replace />} />
        <Route path="/admin/leaves" element={<Navigate to="/admin/dashboard/leave" replace />} />
        <Route path="/admin/announcements" element={<Navigate to="/admin/dashboard/announcements" replace />} />
        <Route path="/admin/settings" element={<Navigate to="/admin/dashboard/settings" replace />} />
        <Route path="/print-payslips/:id" element={<PrintPayslips />} />
      </Route>

      {/* Employee Protected Routes */}
      <Route element={<ProtectedRoute allowRole="employee" />}>
        <Route path="/employee" element={<Navigate to="/employee/dashboard" replace />} />
        <Route path="/employee/dashboard" element={<EmployeesLayout />}>
          <Route index element={<EmployeeDashboard />} />
          <Route path="attendance" element={<EmployeesAttendance />} />
          <Route path="leave" element={<EmployeeLeave />} />
          <Route path="leaves" element={<EmployeeLeave />} />
          <Route path="payslips" element={<EmployeePayslips />} />
          <Route path="payroll" element={<EmployeePayslips />} />
          <Route path="settings" element={<EmployeeSettings />} />
        </Route>
        {/* Top-level aliases for direct employee routes */}
        <Route path="/employee/attendance" element={<Navigate to="/employee/dashboard/attendance" replace />} />
        <Route path="/employee/leave" element={<Navigate to="/employee/dashboard/leave" replace />} />
        <Route path="/employee/leaves" element={<Navigate to="/employee/dashboard/leave" replace />} />
        <Route path="/employee/payslips" element={<Navigate to="/employee/dashboard/payslips" replace />} />
        <Route path="/employee/payroll" element={<Navigate to="/employee/dashboard/payslips" replace />} />
        <Route path="/employee/settings" element={<Navigate to="/employee/dashboard/settings" replace />} />
      </Route>

      {/* Catch all - Redirect to welcome */}
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </>,
  ),
);
