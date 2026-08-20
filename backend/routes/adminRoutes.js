import express from "express"
import { adminLogin, adminLogout, getAdminProfile } from "../controllers/adminController.js";
import { verifyAdmin } from "../middleware/authAdmin.js";

const adminRouter = express.Router();

adminRouter.post("/admin-login", adminLogin);
adminRouter.post("/login", adminLogin);
adminRouter.post("/admin-logout", adminLogout);
adminRouter.post("/logout", adminLogout);
adminRouter.get("/me", verifyAdmin, getAdminProfile);
adminRouter.get("/profile", verifyAdmin, getAdminProfile);

export default adminRouter;
