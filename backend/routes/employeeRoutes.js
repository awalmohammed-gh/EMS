import express from "express";
import {
  createEmployeeAccount,
  employeeLogin,
  employeeLogout,
} from "../controllers/employeeAuthentication.js";
import { verifyAdmin } from "../middleware/authAdmin.js";
import {
  employeeDetails,
  employeeNameList,
  getEmployeeById,
  getCurrentLoggedInEmployee,
  updateCurrentEmployee,
} from "../controllers/employeeController.js";
import {
  employeePayslips,
  getEmployeeLatestPayslipBreakdown,
  getEmployeePayslipBreakdownById,
  getSalaryProjection,
  getEmployeeLivePayrollSummary,
} from "../controllers/payrollController.js";
import { employeeDashboardOverview } from "../controllers/dashboardController.js";
import { updateEmployeeStatus, deleteEmployee } from "../controllers/adminController.js";
import { getEmployeeLeave, getLeaveEmployeeStats, applyLeave } from "../controllers/leaveController.js";
import { employeeAuth } from "../middleware/employeeAuth.js";

const employeeRouter = express.Router();

// Real-Time Employee Leave History & Balances (GET /api/employee/leave-requests)
employeeRouter.get("/leave-requests", employeeAuth, getEmployeeLeave);
employeeRouter.get("/leave/requests", employeeAuth, getEmployeeLeave);
employeeRouter.get("/leave", employeeAuth, getEmployeeLeave);
employeeRouter.get("/leaves", employeeAuth, getEmployeeLeave);
employeeRouter.get("/my-leaves", employeeAuth, getEmployeeLeave);
employeeRouter.get("/leave/stats", employeeAuth, getLeaveEmployeeStats);
employeeRouter.get("/leave-stats", employeeAuth, getLeaveEmployeeStats);
employeeRouter.post("/leave/apply", employeeAuth, applyLeave);
employeeRouter.post("/apply-leave", employeeAuth, applyLeave);

// Real-Time Live Payroll Summary (Calculates dynamic workdays, lateness fines, and unexcused absences)
employeeRouter.get("/payroll/live-summary", employeeAuth, getEmployeeLivePayrollSummary);
employeeRouter.get("/live-summary", employeeAuth, getEmployeeLivePayrollSummary);
employeeRouter.get("/payroll-summary", employeeAuth, getEmployeeLivePayrollSummary);

// Real-Time Dashboard Overview Endpoint for Employee
employeeRouter.get("/dashboard-overview", employeeAuth, employeeDashboardOverview);
employeeRouter.get("/dashboard", employeeAuth, employeeDashboardOverview);
employeeRouter.get("/overview", employeeAuth, employeeDashboardOverview);

// Real-Time Salary Projection Endpoints for Employee
employeeRouter.get("/salary-projection/current", employeeAuth, getSalaryProjection);
employeeRouter.get("/salary-projection", employeeAuth, getSalaryProjection);
employeeRouter.post("/salary-projection", employeeAuth, getSalaryProjection);
employeeRouter.get("/projection/current", employeeAuth, getSalaryProjection);
employeeRouter.get("/projection", employeeAuth, getSalaryProjection);

// Create account for employees (supports both custom and REST standard endpoints)
employeeRouter.post("/employee-account", verifyAdmin, createEmployeeAccount);
employeeRouter.post("/create", verifyAdmin, createEmployeeAccount);
employeeRouter.post("/add", verifyAdmin, createEmployeeAccount);
employeeRouter.post("/", verifyAdmin, createEmployeeAccount);

// Authentication endpoints
employeeRouter.post("/login-account", employeeLogin);
employeeRouter.post("/login", employeeLogin);
employeeRouter.post("/logout-account", employeeLogout);
employeeRouter.post("/logout", employeeLogout);

// Employee payslips & breakdown routes
employeeRouter.get("/payslips/my-payslips", employeeAuth, employeePayslips);
employeeRouter.get("/my-payslips", employeeAuth, employeePayslips);
employeeRouter.get("/payslips/latest", employeeAuth, getEmployeeLatestPayslipBreakdown);
employeeRouter.get("/payslip/latest", employeeAuth, getEmployeeLatestPayslipBreakdown);
employeeRouter.get("/payslips", employeeAuth, employeePayslips);
employeeRouter.get("/payslip/:id", employeeAuth, getEmployeePayslipBreakdownById);

// Employee details & directory list (supports both custom and REST standard endpoints)
employeeRouter.get("/me", employeeAuth, getCurrentLoggedInEmployee);
employeeRouter.put("/me", employeeAuth, updateCurrentEmployee);
employeeRouter.put("/profile", employeeAuth, updateCurrentEmployee);
employeeRouter.get("/all-employees", employeeDetails);
employeeRouter.get("/all", employeeDetails);
employeeRouter.get("/directory", employeeDetails);
employeeRouter.get("/list", employeeDetails);
employeeRouter.get("/", employeeDetails);

employeeRouter.get("/list-employee-name", employeeNameList);
employeeRouter.get("/names", employeeNameList);
employeeRouter.get("/profile/:id", getEmployeeById);
employeeRouter.get("/:id", getEmployeeById);

// Admin-only status modification
employeeRouter.put("/:id/status", verifyAdmin, updateEmployeeStatus);
employeeRouter.put("/status/:id", verifyAdmin, updateEmployeeStatus);
employeeRouter.patch("/:id/status", verifyAdmin, updateEmployeeStatus);

// Admin-only deletion
employeeRouter.delete("/:id", verifyAdmin, deleteEmployee);

export default employeeRouter;

