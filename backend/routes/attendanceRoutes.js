import express from "express";

import { employeeAuth } from "../middleware/employeeAuth.js";
import {
  clockIn,
  clockOut,
  getAllAttendance,
  getCurrentEmployee,
  getEmployeeAttendance,
  getTodayAttendance,
  updateAttendanceRecord,
  excuseAttendanceRecord,
  flagAttendanceRecord,
  unflagAttendanceRecord,
  recalculateAttendanceRecord,
  createManualAttendance,
  bulkUploadBiometricAttendance,
  deleteAttendanceRecord,
  syncAttendancePenalties,
} from "../controllers/employeeAttendance.js";
import { verifyAdmin } from "../middleware/authAdmin.js";

const attendanceRouter = express.Router();

attendanceRouter.post("/clock-in", employeeAuth, clockIn);
attendanceRouter.post("/clock-out", employeeAuth, clockOut);
attendanceRouter.get("/today", employeeAuth, getCurrentEmployee);
attendanceRouter.get("/attendance", employeeAuth, getEmployeeAttendance);
attendanceRouter.get("/now", employeeAuth, getTodayAttendance);
attendanceRouter.post("/sync", employeeAuth, syncAttendancePenalties);
attendanceRouter.post("/sync-penalties", employeeAuth, syncAttendancePenalties);

// admin side
attendanceRouter.get("/all", verifyAdmin, getAllAttendance);
attendanceRouter.post("/admin/sync", verifyAdmin, syncAttendancePenalties);
attendanceRouter.post("/admin/sync-penalties", verifyAdmin, syncAttendancePenalties);
attendanceRouter.put("/record/:id", verifyAdmin, updateAttendanceRecord);
attendanceRouter.put("/record/:id/excuse", verifyAdmin, excuseAttendanceRecord);
attendanceRouter.put("/record/:id/flag", verifyAdmin, flagAttendanceRecord);
attendanceRouter.put("/record/:id/unflag", verifyAdmin, unflagAttendanceRecord);
attendanceRouter.put("/record/:id/recalculate", verifyAdmin, recalculateAttendanceRecord);
attendanceRouter.post("/manual-record", verifyAdmin, createManualAttendance);
attendanceRouter.post("/bulk-upload", verifyAdmin, bulkUploadBiometricAttendance);
attendanceRouter.post("/biometric-upload", verifyAdmin, bulkUploadBiometricAttendance);

// delete attendance record
attendanceRouter.delete("/:id", verifyAdmin, deleteAttendanceRecord);
attendanceRouter.delete("/record/:id", verifyAdmin, deleteAttendanceRecord);

export default attendanceRouter;

