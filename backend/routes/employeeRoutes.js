import express from "express"
import { createEmployeeAccount,employeeLogin,employeeLogout} from "../controllers/employeeAuthentication.js";
import { verifyAdmin } from "../middleware/authAdmin.js";
import { employeeDetails, employeeNameList } from "../controllers/employeeController.js";
import { employeeAuth } from "../middleware/employeeAuth.js";

const employeeRouter = express.Router();

//create account for employees
employeeRouter.post("/employee-account",verifyAdmin, createEmployeeAccount)
employeeRouter.post("/login-account", employeeLogin);
employeeRouter.post("/logout-account", employeeLogout);


//employees details
employeeRouter.get("/all-employees", employeeDetails);
employeeRouter.get("/list-employee-name", employeeNameList);


export default employeeRouter;
