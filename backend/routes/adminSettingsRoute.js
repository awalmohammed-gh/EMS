import express from "express";
import {
  getSettings,
  updateAttendanceSettings,
  updateCompanySettings,
  updateEmployeeSettings,
  updateLeaveSettings,
  updatePayrollSettings,
  updateSecuritySettings,
} from "../controllers/adminSettingsController.js";


const settingsRouter = express.Router();

settingsRouter.get("/get-settings", getSettings);

settingsRouter.put("/company", updateCompanySettings);
settingsRouter.put("/employee", updateEmployeeSettings);
settingsRouter.put("/payroll", updatePayrollSettings);
settingsRouter.put("/leave", updateLeaveSettings);
settingsRouter.put("/attendance", updateAttendanceSettings);
settingsRouter.put("/security", updateSecuritySettings);

export default settingsRouter;
