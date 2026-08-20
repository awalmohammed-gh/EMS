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
import LoginForm from "../components/LoginForm";
import WelcomePage from "../pages/WelcomePage";
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

      {/* Login Routes */}
      <Route
        path="/login/admin"
        element={
          <LoginForm
            role="admin"
            title="Admin Portal"
            subtitle="Please enter your credentials to access the admin panel"
          />
        }
      />

      <Route
        path="/login/employee"
        element={
          <LoginForm
            role="employee"
            title="Employee Portal"
            subtitle="Please enter your credentials to access the employee portal"
          />
        }
      />

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
