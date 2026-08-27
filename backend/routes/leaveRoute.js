import express from "express";
import { employeeAuth } from "../middleware/employeeAuth.js";
import {
  applyLeave,
  getAllLeaves,
  getEmployeeLeave,
  getLeaveEmployeeStats,
  updateLeaveStatus,
  deleteLeave,
} from "../controllers/leaveController.js";
import { verifyAdmin } from "../middleware/authAdmin.js";

const leaveRouter = express.Router();

// ================= Employee =================

// Apply for leave
leaveRouter.post("/apply", employeeAuth, applyLeave);
leaveRouter.post("/request", employeeAuth, applyLeave);

// Get logged-in employee's leave history
leaveRouter.get("/my-leaves", employeeAuth, getEmployeeLeave);
leaveRouter.get("/leave-requests", employeeAuth, getEmployeeLeave);
leaveRouter.get("/requests", employeeAuth, getEmployeeLeave);
leaveRouter.get("/history", employeeAuth, getEmployeeLeave);

// Aggregated leave statistics strictly for authenticated employee
leaveRouter.get("/employee-stats", employeeAuth, getLeaveEmployeeStats);
leaveRouter.get("/stats", employeeAuth, getLeaveEmployeeStats);

// Delete leave (Employee can delete own pending request, or Admin)
leaveRouter.delete("/:id", employeeAuth, deleteLeave);
leaveRouter.delete("/request/:id", employeeAuth, deleteLeave);

// ================= Admin =================

// Get all leave applications
leaveRouter.get("/all", verifyAdmin, getAllLeaves);
leaveRouter.get("/", verifyAdmin, getAllLeaves);

// Approve or Reject leave
leaveRouter.patch("/status/:id", verifyAdmin, updateLeaveStatus);
leaveRouter.put("/status/:id", verifyAdmin, updateLeaveStatus);
leaveRouter.patch("/:id/status", verifyAdmin, updateLeaveStatus);
leaveRouter.put("/:id/status", verifyAdmin, updateLeaveStatus);
leaveRouter.patch("/:id", verifyAdmin, updateLeaveStatus);
leaveRouter.put("/:id", verifyAdmin, updateLeaveStatus);

// Admin-only delete route
leaveRouter.delete("/admin/:id", verifyAdmin, deleteLeave);


export default leaveRouter;
