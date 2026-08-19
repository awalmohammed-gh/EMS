import express from "express"
import { verifyAdmin } from "../middleware/authAdmin.js";
import { allPayslips, employeePayslips, generatePayroll } from "../controllers/payrollController.js";
import { employeeAuth } from "../middleware/employeeAuth.js";

const payrollRouter = express.Router();

payrollRouter.post("/generate", verifyAdmin, generatePayroll);
payrollRouter.get("/payslips", verifyAdmin, allPayslips);


// employee
payrollRouter.get("/employee-payslip", employeeAuth, employeePayslips);

export default payrollRouter;