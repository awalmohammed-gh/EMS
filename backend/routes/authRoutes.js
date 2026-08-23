import express from "express";
import {
  adminRegister,
  adminLogin,
  checkAdminExists,
  employeeLogin,
  authLogout,
  getAuthMe,
} from "../controllers/authController.js";

const authRouter = express.Router();

// Admin Authentication Routes
authRouter.get("/admin/exists", checkAdminExists);
authRouter.post("/admin/register", adminRegister);
authRouter.post("/admin/login", adminLogin);
authRouter.post("/admin/logout", authLogout);

// Employee Authentication Routes
authRouter.post("/employee/login", employeeLogin);
authRouter.post("/employee/logout", authLogout);

// General Session Routes
authRouter.post("/logout", authLogout);
authRouter.get("/me", getAuthMe);

export default authRouter;
