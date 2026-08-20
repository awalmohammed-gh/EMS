import express from "express";
import {
  employeeDashboardOverview,
  getDashboardOverview,
  getDashboardNotifications,
} from "../controllers/dashboardController.js";
import { verifyAdmin } from "../middleware/authAdmin.js";
import { employeeAuth } from "../middleware/employeeAuth.js";

const dashboardRouter = express.Router();

dashboardRouter.get("/admin-dashboard", verifyAdmin, getDashboardOverview);
dashboardRouter.get("/employee-dashboard", employeeAuth, employeeDashboardOverview);
dashboardRouter.get("/notifications", getDashboardNotifications);

export default dashboardRouter;
