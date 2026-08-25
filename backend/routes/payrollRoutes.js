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
  getPayrollCycles,
  getPenaltyImpactAnalytics,
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

// Employee payslips
payrollRouter.get("/employee-payslip", employeeAuth, employeePayslips);

// Single payroll record details (by ID or payslipNumber - authenticated with ownership check)
payrollRouter.get("/payslip/:id", employeeAuth, getPayrollById);
payrollRouter.get("/details/:id", employeeAuth, getPayrollById);
payrollRouter.get("/:id", employeeAuth, getPayrollById);

// Update status and deletion
payrollRouter.put("/status/:id", verifyAdmin, updatePayrollStatus);
payrollRouter.delete("/:id", verifyAdmin, deletePayroll);

export default payrollRouter;

