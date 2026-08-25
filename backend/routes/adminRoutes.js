import express from "express";
import {
  adminLogin,
  adminLogout,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  updateAdminSettings,
  createAdminAccount,
  updateEmployeeStatus,
  deleteEmployee,
  getDashboardStats,
  getAdminPayrollSummary,
} from "../controllers/adminController.js";
import { getSettings, getPenaltySettings, updatePenaltySettings, getAuditLogs } from "../controllers/adminSettingsController.js";
import { createEmployeeAccount } from "../controllers/employeeAuthentication.js";
import { bulkUploadBiometricAttendance } from "../controllers/employeeAttendance.js";
import { getPenaltyImpactAnalytics } from "../controllers/analyticsController.js";
import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePinAnnouncement,
} from "../controllers/announcementController.js";
import { deletePayroll } from "../controllers/payrollController.js";
import { verifyAdmin } from "../middleware/authAdmin.js";

const adminRouter = express.Router();

adminRouter.post("/admin-login", adminLogin);
adminRouter.post("/login", adminLogin);
adminRouter.post("/admin-logout", adminLogout);
adminRouter.post("/logout", adminLogout);
adminRouter.post("/create-account", verifyAdmin, createAdminAccount);
adminRouter.post("/register", verifyAdmin, createAdminAccount);
adminRouter.post("/create-user", verifyAdmin, createEmployeeAccount);
adminRouter.post("/create-employee", verifyAdmin, createEmployeeAccount);
adminRouter.get("/me", verifyAdmin, getAdminProfile);
adminRouter.get("/profile", verifyAdmin, getAdminProfile);
adminRouter.put("/me", verifyAdmin, updateAdminProfile);
adminRouter.put("/profile", verifyAdmin, updateAdminProfile);
adminRouter.put("/change-password", verifyAdmin, changeAdminPassword);
adminRouter.put("/settings", verifyAdmin, updateAdminSettings);
adminRouter.get("/settings", verifyAdmin, getSettings);
adminRouter.get("/settings/penalties", verifyAdmin, getPenaltySettings);
adminRouter.put("/settings/penalties", verifyAdmin, updatePenaltySettings);
adminRouter.get("/audit-logs", verifyAdmin, getAuditLogs);
adminRouter.get("/settings/audit-logs", verifyAdmin, getAuditLogs);

// Live Admin Dashboard Stats and Payroll Summaries
adminRouter.get("/dashboard-stats", verifyAdmin, getDashboardStats);
adminRouter.get("/payroll/summary", verifyAdmin, getAdminPayrollSummary);
adminRouter.get("/payroll-summary", verifyAdmin, getAdminPayrollSummary);

// 6-Month Attendance Penalties & Payroll Cost Impact Analytics
adminRouter.get("/analytics/penalty-impact", verifyAdmin, getPenaltyImpactAnalytics);
adminRouter.get("/analytics/penalties-impact", verifyAdmin, getPenaltyImpactAnalytics);

// Biometric Attendance Bulk Upload
adminRouter.post("/attendance/bulk-upload", verifyAdmin, bulkUploadBiometricAttendance);
adminRouter.post("/attendance/biometric-upload", verifyAdmin, bulkUploadBiometricAttendance);

// Admin Announcement Endpoints (POST /api/admin/announcements, GET, DELETE, PUT)
adminRouter.get("/announcements", verifyAdmin, getAnnouncements);
adminRouter.get("/announcements/:id", verifyAdmin, getAnnouncementById);
adminRouter.post("/announcements", verifyAdmin, createAnnouncement);
adminRouter.put("/announcements/:id", verifyAdmin, updateAnnouncement);
adminRouter.patch("/announcements/:id/pin", verifyAdmin, togglePinAnnouncement);
adminRouter.delete("/announcements/:id", verifyAdmin, deleteAnnouncement);

// Admin-only payroll deletion (DELETE /api/admin/payroll/:id)
adminRouter.delete("/payroll/:id", verifyAdmin, deletePayroll);
adminRouter.delete("/payslip/:id", verifyAdmin, deletePayroll);
adminRouter.delete("/payslips/:id", verifyAdmin, deletePayroll);

// Admin-only employee status management (PUT /api/admin/employees/:id/status)
adminRouter.put("/employees/:id/status", verifyAdmin, updateEmployeeStatus);
adminRouter.put("/employee/:id/status", verifyAdmin, updateEmployeeStatus);
adminRouter.patch("/employees/:id/status", verifyAdmin, updateEmployeeStatus);
adminRouter.patch("/employee/:id/status", verifyAdmin, updateEmployeeStatus);

// Admin-only employee deletion (DELETE /api/admin/employees/:id)
adminRouter.delete("/employees/:id", verifyAdmin, deleteEmployee);
adminRouter.delete("/employee/:id", verifyAdmin, deleteEmployee);
adminRouter.delete("/:id", verifyAdmin, deleteEmployee);

export default adminRouter;
