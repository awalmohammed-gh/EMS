import express from "express";
import { employeeDashboardOverview, getDashboardOverview } from "../controllers/dashboardController.js";
import { verifyAdmin } from "../middleware/authAdmin.js";
import { employeeAuth } from "../middleware/employeeAuth.js";

const dashboardRouter = express.Router();

dashboardRouter.get("/admin-dashboard", verifyAdmin, getDashboardOverview);
dashboardRouter.get("/employee-dashboard", employeeAuth, employeeDashboardOverview);

export default dashboardRouter;