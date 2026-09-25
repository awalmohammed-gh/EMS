import express from "express";
import {
  employeeDashboardOverview,
  getDashboardOverview,
  getRecentActivityFeed,
} from "../controllers/dashboardController.js";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";
import {
  getLateUnclockedEmployees,
  notifyLateEmployees,
  excuseLateEmployee,
} from "../controllers/lateAttendanceController.js";
import { getActivityLogs, getActivityLogStats } from "../controllers/activityLogController.js";
import { verifyAdmin } from "../middleware/authAdmin.js";
import { employeeAuth } from "../middleware/employeeAuth.js";
import { tenantAuth } from "../middleware/tenantAuth.js";

const dashboardRouter = express.Router();

dashboardRouter.get("/admin-dashboard", verifyAdmin, tenantAuth, getDashboardOverview);
dashboardRouter.get("/admin-dashboard/recent-activity", verifyAdmin, tenantAuth, getRecentActivityFeed);
dashboardRouter.get("/recent-activity", verifyAdmin, tenantAuth, getRecentActivityFeed);

// High-Priority Late Attendance & Attention Required Feed
dashboardRouter.get("/late-attendance", verifyAdmin, tenantAuth, getLateUnclockedEmployees);
dashboardRouter.post("/late-attendance/notify", verifyAdmin, tenantAuth, notifyLateEmployees);
dashboardRouter.post("/late-attendance/excuse", verifyAdmin, tenantAuth, excuseLateEmployee);

// Audit Trail & Activity Logs
dashboardRouter.get("/audit-trail", verifyAdmin, tenantAuth, getActivityLogs);
dashboardRouter.get("/activity-logs", verifyAdmin, tenantAuth, getActivityLogs);
dashboardRouter.get("/activity-logs/stats", verifyAdmin, tenantAuth, getActivityLogStats);

dashboardRouter.get("/employee-dashboard", employeeAuth, tenantAuth, employeeDashboardOverview);
dashboardRouter.get("/notifications", employeeAuth, tenantAuth, getNotifications);
dashboardRouter.patch("/notifications/read-all", employeeAuth, tenantAuth, markAllNotificationsAsRead);
dashboardRouter.patch("/notifications/:id/read", employeeAuth, tenantAuth, markNotificationAsRead);
dashboardRouter.delete("/notifications/:id", employeeAuth, tenantAuth, deleteNotification);

export default dashboardRouter;
