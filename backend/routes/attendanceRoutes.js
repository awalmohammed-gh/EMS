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
  createManualAttendance,
  bulkUploadBiometricAttendance,
  deleteAttendanceRecord,
} from "../controllers/employeeAttendance.js";
import { verifyAdmin } from "../middleware/authAdmin.js";

const attendanceRouter = express.Router();

attendanceRouter.post("/clock-in", employeeAuth, clockIn);
attendanceRouter.post("/clock-out", employeeAuth, clockOut);
attendanceRouter.get("/today", employeeAuth, getCurrentEmployee);
attendanceRouter.get("/attendance", employeeAuth, getEmployeeAttendance);
attendanceRouter.get("/now", employeeAuth, getTodayAttendance);

// admin side
attendanceRouter.get("/all", verifyAdmin, getAllAttendance);
attendanceRouter.put("/record/:id", verifyAdmin, updateAttendanceRecord);
attendanceRouter.post("/manual-record", verifyAdmin, createManualAttendance);
attendanceRouter.post("/bulk-upload", verifyAdmin, bulkUploadBiometricAttendance);
attendanceRouter.post("/biometric-upload", verifyAdmin, bulkUploadBiometricAttendance);

// delete attendance record
attendanceRouter.delete("/:id", verifyAdmin, deleteAttendanceRecord);
attendanceRouter.delete("/record/:id", verifyAdmin, deleteAttendanceRecord);

export default attendanceRouter;

