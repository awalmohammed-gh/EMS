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
import { verifyAdmin } from "../middleware/authAdmin.js";
import { employeeAuth } from "../middleware/employeeAuth.js";

const dashboardRouter = express.Router();

dashboardRouter.get("/admin-dashboard", verifyAdmin, getDashboardOverview);
dashboardRouter.get("/admin-dashboard/recent-activity", verifyAdmin, getRecentActivityFeed);
dashboardRouter.get("/recent-activity", verifyAdmin, getRecentActivityFeed);
dashboardRouter.get("/employee-dashboard", employeeAuth, employeeDashboardOverview);
dashboardRouter.get("/notifications", employeeAuth, getNotifications);
dashboardRouter.patch("/notifications/read-all", employeeAuth, markAllNotificationsAsRead);
dashboardRouter.patch("/notifications/:id/read", employeeAuth, markNotificationAsRead);
dashboardRouter.delete("/notifications/:id", employeeAuth, deleteNotification);

export default dashboardRouter;
