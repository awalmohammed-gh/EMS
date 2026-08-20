import express from "express";
import { verifyAdmin } from "../middleware/authAdmin.js";
import {
  allPayslips,
  employeePayslips,
  generatePayroll,
  calculateMonthlyPayrollSummary,
} from "../controllers/payrollController.js";
import { employeeAuth } from "../middleware/employeeAuth.js";

const payrollRouter = express.Router();

// Dynamic monthly salary calculation based on attendance & approved leaves
payrollRouter.get("/calculate-summary", calculateMonthlyPayrollSummary);
payrollRouter.get("/admin/calculate-summary", verifyAdmin, calculateMonthlyPayrollSummary);

// Payroll generation & listing
payrollRouter.post("/generate", verifyAdmin, generatePayroll);
payrollRouter.get("/payslips", verifyAdmin, allPayslips);

// Employee payslips
payrollRouter.get("/employee-payslip", employeeAuth, employeePayslips);

export default payrollRouter;
