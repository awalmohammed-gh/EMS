import express from "express";
import { verifyAdmin } from "../middleware/authAdmin.js";
import {
  allPayslips,
  employeePayslips,
  generatePayroll,
  calculateMonthlyPayrollSummary,
  getPayrollById,
  getEmployeeLatestPayslipBreakdown,
  getEmployeePayslipBreakdownById,
  updatePayrollStatus,
  deletePayroll,
  exportPayrollReport,
  getPayrollAnalytics,
  getPayrollCycles,
  getPenaltyImpactAnalytics,
  getSalaryProjection,
  getEmployeeLivePayrollSummary,
  getMonthlyPayrollRun,
} from "../controllers/payrollController.js";
import { employeeAuth } from "../middleware/employeeAuth.js";

const payrollRouter = express.Router();

// Real-Time Monthly Calendar Absence & Lateness Calculation Engine (Employee Live Summary)
payrollRouter.get("/live-summary", employeeAuth, getEmployeeLivePayrollSummary);
payrollRouter.get("/employee/live-summary", employeeAuth, getEmployeeLivePayrollSummary);
payrollRouter.get("/employee/payroll/live-summary", employeeAuth, getEmployeeLivePayrollSummary);

// Batch Monthly Payroll Run Aggregation across All Active Employees (Admin)
payrollRouter.get("/monthly-run", verifyAdmin, getMonthlyPayrollRun);
payrollRouter.get("/admin/monthly-run", verifyAdmin, getMonthlyPayrollRun);
payrollRouter.get("/admin/payroll/monthly-run", verifyAdmin, getMonthlyPayrollRun);

// Dynamic monthly salary calculation based on attendance & approved leaves
payrollRouter.get("/calculate-summary", calculateMonthlyPayrollSummary);
payrollRouter.get("/calculate-employee", calculateMonthlyPayrollSummary);
payrollRouter.get("/admin/calculate-summary", verifyAdmin, calculateMonthlyPayrollSummary);
payrollRouter.get("/admin/calculate-employee", verifyAdmin, calculateMonthlyPayrollSummary);
payrollRouter.get("/admin/payroll/calculate-employee", verifyAdmin, calculateMonthlyPayrollSummary);

// Salary Projection Calculator for Employees (estimates end-of-month pay based on attendance & leaves)
payrollRouter.get("/salary-projection/current", getSalaryProjection);
payrollRouter.get("/salary-projection", getSalaryProjection);
payrollRouter.post("/salary-projection", getSalaryProjection);
payrollRouter.get("/projection/current", getSalaryProjection);
payrollRouter.get("/projection", getSalaryProjection);
payrollRouter.post("/projection", getSalaryProjection);
payrollRouter.get("/employee/salary-projection/current", employeeAuth, getSalaryProjection);
payrollRouter.get("/employee/salary-projection", employeeAuth, getSalaryProjection);
payrollRouter.post("/employee/salary-projection", employeeAuth, getSalaryProjection);

// Payroll generation & listing
payrollRouter.post("/generate", verifyAdmin, generatePayroll);
payrollRouter.get("/records", verifyAdmin, allPayslips);
payrollRouter.get("/payslips", verifyAdmin, allPayslips);
payrollRouter.get("/list", verifyAdmin, allPayslips);

// Payroll cycle history & status
payrollRouter.get("/cycles", verifyAdmin, getPayrollCycles);
payrollRouter.get("/history", verifyAdmin, getPayrollCycles);

// 6-Month attendance penalty impact on payroll cost
payrollRouter.get("/penalty-impact", verifyAdmin, getPenaltyImpactAnalytics);
payrollRouter.get("/penalties/impact", verifyAdmin, getPenaltyImpactAnalytics);

// Payroll export reports
payrollRouter.get("/export", verifyAdmin, exportPayrollReport);

// Payroll analytics for bar charts dashboard (Admin only)
payrollRouter.get("/analytics", verifyAdmin, getPayrollAnalytics);
payrollRouter.get("/admin/analytics", verifyAdmin, getPayrollAnalytics);

// Employee payslips list & latest
payrollRouter.get("/employee-payslip", employeeAuth, employeePayslips);
payrollRouter.get("/employee-payslips", employeeAuth, employeePayslips);
payrollRouter.get("/employee/payslips", employeeAuth, employeePayslips);
payrollRouter.get("/employee/payslips/my-payslips", employeeAuth, employeePayslips);
payrollRouter.get("/payslips/my-payslips", employeeAuth, employeePayslips);
payrollRouter.get("/my-payslips", employeeAuth, employeePayslips);
payrollRouter.get("/employee/payslips/latest", employeeAuth, getEmployeeLatestPayslipBreakdown);
payrollRouter.get("/employee/payslip/latest", employeeAuth, getEmployeeLatestPayslipBreakdown);
payrollRouter.get("/payslips/latest", employeeAuth, getEmployeeLatestPayslipBreakdown);
payrollRouter.get("/payslip/latest", employeeAuth, getEmployeeLatestPayslipBreakdown);

// Single payroll record details (by ID or payslipNumber - authenticated with ownership check)
payrollRouter.get("/employee/payslip/:id", employeeAuth, getEmployeePayslipBreakdownById);
payrollRouter.get("/payslip/:id", employeeAuth, getEmployeePayslipBreakdownById);
payrollRouter.get("/details/:id", employeeAuth, getEmployeePayslipBreakdownById);
payrollRouter.get("/:id", employeeAuth, getEmployeePayslipBreakdownById);

// Update status and deletion
payrollRouter.put("/status/:id", verifyAdmin, updatePayrollStatus);
payrollRouter.delete("/:id", verifyAdmin, deletePayroll);

export default payrollRouter;

