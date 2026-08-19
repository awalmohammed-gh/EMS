import express from "express"
import { adminLogin, adminLogout } from "../controllers/adminController.js";

const adminRouter = express.Router();


adminRouter.post("/admin-login", adminLogin);
adminRouter.post("/admin-logout", adminLogout);
//admin login

export default adminRouter;
