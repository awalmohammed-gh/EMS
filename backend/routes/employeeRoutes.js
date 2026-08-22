import express from "express";
import {
  createEmployeeAccount,
  employeeLogin,
  employeeLogout,
} from "../controllers/employeeAuthentication.js";
import { verifyAdmin } from "../middleware/authAdmin.js";
import {
  employeeDetails,
  employeeNameList,
  getEmployeeById,
  getCurrentLoggedInEmployee,
  updateCurrentEmployee,
} from "../controllers/employeeController.js";
import { updateEmployeeStatus, deleteEmployee } from "../controllers/adminController.js";
import { employeeAuth } from "../middleware/employeeAuth.js";

const employeeRouter = express.Router();

// Create account for employees (supports both custom and REST standard endpoints)
employeeRouter.post("/employee-account", verifyAdmin, createEmployeeAccount);
employeeRouter.post("/create", verifyAdmin, createEmployeeAccount);
employeeRouter.post("/add", verifyAdmin, createEmployeeAccount);
employeeRouter.post("/", verifyAdmin, createEmployeeAccount);

// Authentication endpoints
employeeRouter.post("/login-account", employeeLogin);
employeeRouter.post("/login", employeeLogin);
employeeRouter.post("/logout-account", employeeLogout);
employeeRouter.post("/logout", employeeLogout);

// Employee details & directory list (supports both custom and REST standard endpoints)
employeeRouter.get("/me", employeeAuth, getCurrentLoggedInEmployee);
employeeRouter.put("/me", employeeAuth, updateCurrentEmployee);
employeeRouter.put("/profile", employeeAuth, updateCurrentEmployee);
employeeRouter.get("/all-employees", employeeDetails);
employeeRouter.get("/all", employeeDetails);
employeeRouter.get("/directory", employeeDetails);
employeeRouter.get("/list", employeeDetails);
employeeRouter.get("/", employeeDetails);

employeeRouter.get("/list-employee-name", employeeNameList);
employeeRouter.get("/names", employeeNameList);
employeeRouter.get("/profile/:id", getEmployeeById);
employeeRouter.get("/:id", getEmployeeById);

// Admin-only status modification
employeeRouter.put("/:id/status", verifyAdmin, updateEmployeeStatus);
employeeRouter.put("/status/:id", verifyAdmin, updateEmployeeStatus);
employeeRouter.patch("/:id/status", verifyAdmin, updateEmployeeStatus);

// Admin-only deletion
employeeRouter.delete("/:id", verifyAdmin, deleteEmployee);

export default employeeRouter;

