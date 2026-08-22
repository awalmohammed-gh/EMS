import express from "express";
import {
  adminLogin,
  adminLogout,
  getAdminProfile,
  createAdminAccount,
  updateEmployeeStatus,
  deleteEmployee,
} from "../controllers/adminController.js";
import { verifyAdmin } from "../middleware/authAdmin.js";

const adminRouter = express.Router();

adminRouter.post("/admin-login", adminLogin);
adminRouter.post("/login", adminLogin);
adminRouter.post("/admin-logout", adminLogout);
adminRouter.post("/logout", adminLogout);
adminRouter.post("/create-account", verifyAdmin, createAdminAccount);
adminRouter.post("/register", verifyAdmin, createAdminAccount);
adminRouter.get("/me", verifyAdmin, getAdminProfile);
adminRouter.get("/profile", verifyAdmin, getAdminProfile);

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


