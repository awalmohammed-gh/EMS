import express from "express";
import { employeeAuth } from "../middleware/employeeAuth.js";
import {
  applyLeave,
  getAllLeaves,
  getEmployeeLeave,
  getLeaveEmployeeStats,
  updateLeaveStatus,
} from "../controllers/leaveController.js";
import { verifyAdmin } from "../middleware/authAdmin.js";

const leaveRouter = express.Router();

// ================= Employee =================

// Apply for leave
leaveRouter.post("/apply", employeeAuth, applyLeave);

// Get logged-in employee's leave history
leaveRouter.get("/my-leaves", employeeAuth, getEmployeeLeave);

// Aggregated leave statistics strictly for authenticated employee
leaveRouter.get("/employee-stats", employeeAuth, getLeaveEmployeeStats);

// ================= Admin =================

// Get all leave applications
leaveRouter.get("/all", verifyAdmin, getAllLeaves);

// Approve or Reject leave
leaveRouter.put("/status/:id", verifyAdmin, updateLeaveStatus);

export default leaveRouter;
