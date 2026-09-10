import { Routes, Route, Navigate } from "react-router-dom";
import EmployeeLoginPage from "../pages/Auth/EmployeeLoginPage";
import AdminLoginPage from "../pages/Auth/AdminLoginPage";
import AdminRegister from "../pages/Auth/AdminRegister";
import SetupCompanyPage from "../pages/Auth/SetupCompanyPage";
import WelcomePage from "../pages/WelcomePage";
import ProtectedRoute from "./ProtectedRoute";
import OnboardingGate from "./OnboardingGate";
import AdminLayout from "../layout/AdminLayout";
import AdminDashboard from "../pages/Admin/AdminDashboard";
import Employees from "../pages/Admin/Employees";
import Attendance from "../pages/Admin/Attendance";
import Payslips from "../pages/Admin/Payslips";
import PrintPayslips from "../pages/Admin/PrintPayslips";
import Leave from "../pages/Admin/Leave";
import AdminAnnouncements from "../pages/Admin/Announcements";
import Settings from "../pages/Admin/Settings";
import EmployeesLayout from "../layout/EmployeesLayout";
import EmployeeDashboard from "../pages/Employees/EmployeeDashboard";
import EmployeesAttendance from "../pages/Employees/EmployeesAttendance";
import EmployeeLeave from "../pages/Employees/EmployeeLeave";
import EmployeePayslips from "../pages/Employees/EmployeePayslips";
import EmployeeSettings from "../pages/Employees/EmployeeSettings";

/**
 * AppRoutes Component
 * Centralized declarative route definitions for React Router
 */
export const AppRoutes = () => {
  return (
    <Routes>
      {/* Initial Setup & Onboarding Wizard Route */}
      <Route
        path="/setup"
        element={
          <OnboardingGate>
            <SetupCompanyPage />
          </OnboardingGate>
        }
      />
      <Route
        path="/setup-company"
        element={
          <OnboardingGate>
            <SetupCompanyPage />
          </OnboardingGate>
        }
      />
      <Route
        path="/setup-admin"
        element={
          <OnboardingGate>
            <SetupCompanyPage />
          </OnboardingGate>
        }
      />

      {/* Public Landing */}
      <Route path="/" element={<Navigate to="/welcome" replace />} />
      <Route
        path="/welcome"
        element={
          <OnboardingGate>
            <WelcomePage />
          </OnboardingGate>
        }
      />

      {/* Dedicated Authentication Pages */}
      <Route
        path="/login"
        element={
          <OnboardingGate>
            <EmployeeLoginPage />
          </OnboardingGate>
        }
      />
      <Route
        path="/employee/login"
        element={
          <OnboardingGate>
            <EmployeeLoginPage />
          </OnboardingGate>
        }
      />
      <Route path="/login/employee" element={<Navigate to="/login" replace />} />

      <Route
        path="/admin/login"
        element={
          <OnboardingGate>
            <AdminLoginPage />
          </OnboardingGate>
        }
      />
      <Route path="/login/admin" element={<Navigate to="/admin/login" replace />} />
      <Route
        path="/admin/register"
        element={
          <OnboardingGate>
            <AdminRegister />
          </OnboardingGate>
        }
      />
      <Route path="/register/admin" element={<Navigate to="/admin/register" replace />} />

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
        <Route path="/employee/attendance" element={<Navigate to="/employee/dashboard/attendance" replace />} />
        <Route path="/employee/leave" element={<Navigate to="/employee/dashboard/leave" replace />} />
        <Route path="/employee/leaves" element={<Navigate to="/employee/dashboard/leave" replace />} />
        <Route path="/employee/payslips" element={<Navigate to="/employee/dashboard/payslips" replace />} />
        <Route path="/employee/payroll" element={<Navigate to="/employee/dashboard/payslips" replace />} />
        <Route path="/employee/settings" element={<Navigate to="/employee/dashboard/settings" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  );
};

export default AppRoutes;
