import express from "express";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createNotification,
} from "../controllers/notificationController.js";
import { employeeAuth } from "../middleware/employeeAuth.js";

const notificationRouter = express.Router();

// Role-flexible authentication: accepts both admin token, employee token, or header role fallback
notificationRouter.get("/", employeeAuth, getNotifications);
notificationRouter.patch("/read-all", employeeAuth, markAllNotificationsAsRead);
notificationRouter.patch("/:id/read", employeeAuth, markNotificationAsRead);
notificationRouter.delete("/:id", employeeAuth, deleteNotification);
notificationRouter.post("/", employeeAuth, createNotification);
notificationRouter.post("/create", employeeAuth, createNotification);

export default notificationRouter;
