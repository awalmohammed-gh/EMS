import express from "express";
import { verifyAdmin } from "../middleware/authAdmin.js";
import {
  allPayslips,
  employeePayslips,
  generatePayroll,
  calculateMonthlyPayrollSummary,
  getPayrollById,
  updatePayrollStatus,
  deletePayroll,
  exportPayrollReport,
  getPayrollAnalytics,
} from "../controllers/payrollController.js";
import { employeeAuth } from "../middleware/employeeAuth.js";

const payrollRouter = express.Router();

// Dynamic monthly salary calculation based on attendance & approved leaves
payrollRouter.get("/calculate-summary", calculateMonthlyPayrollSummary);
payrollRouter.get("/admin/calculate-summary", verifyAdmin, calculateMonthlyPayrollSummary);

// Payroll generation & listing
payrollRouter.post("/generate", verifyAdmin, generatePayroll);
payrollRouter.get("/payslips", verifyAdmin, allPayslips);
payrollRouter.get("/list", verifyAdmin, allPayslips);

// Payroll export reports
payrollRouter.get("/export", verifyAdmin, exportPayrollReport);

// Payroll analytics for bar charts dashboard
payrollRouter.get("/analytics", getPayrollAnalytics);
payrollRouter.get("/admin/analytics", verifyAdmin, getPayrollAnalytics);

// Employee payslips
payrollRouter.get("/employee-payslip", employeeAuth, employeePayslips);

// Single payroll record details (by ID or payslipNumber)
payrollRouter.get("/payslip/:id", getPayrollById);
payrollRouter.get("/details/:id", getPayrollById);
payrollRouter.get("/:id", getPayrollById);

// Update status and deletion
payrollRouter.put("/status/:id", verifyAdmin, updatePayrollStatus);
payrollRouter.delete("/:id", verifyAdmin, deletePayroll);

export default payrollRouter;

