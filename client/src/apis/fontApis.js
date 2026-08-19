import { api } from "./axios";

//function for admin to create account
export const employeeAccount = (data) => {
  return api.post("/employee/employee-account", data);
};

//employee

export const employeeLogin = (data) => {
  return api.post("/employee/login-account", data);
};

export const employeeLogout = () => {
  return api.post("/employee/logout-account");
};

export const allEmployees = () => {
  return api.get("/employee/all-employees");
};

export const namesList = () => {
  return api.get("/employee/list-employee-name");
};

export const getEmployee = () => {
  return api.get("/employee/me");
};

//function for admin
export const adminLog = (data) => {
  return api.post("/admin/admin-login", data);
};
export const adminLogout = () => {
  return api.post("/admin/admin-logout");
};

//generate payroll
export const payrollGenerate = (data) => {
  return api.post("/pay/generate", data);
};

export const getAllPayslips = (data) => {
  return api.get("/pay/payslips", data);
};

export const getEmployeePayslip = () => {
  return api.get("/pay/employee-payslip");
};

//attendance
export const attendanceClockIn = () => {
  return api.post("/attendance/clock-in");
};

export const attendanceClockOut = () => {
  return api.post("/attendance/clock-out");
};

export const getTodayAttendance = () => {
  return api.get("/attendance/today");
};

export const getEmployeeAttendance = () => {
  return api.get("/attendance/attendance");
};

export const getAllAttendance = () =>{
  return api.get("/attendance/all");
}

export const getNowAttendance = () =>{
  return api.get("/attendance/now");
}


//dashboard
export const adminDashboardOverview = () =>{
  return api.get("/dashboard/admin-dashboard")
}

export const employeeDashboardOverview = () =>{
  return api.get("/dashboard/employee-dashboard");
}


//leave
export const applyForLeave = (data) =>{
  return api.post("/leave/apply", data);
}

export const myLeave = () =>{
  return api.get("/leave/my-leaves");
}

export const allLeaves = () =>{
  return api.get("/leave/all");
}

export const updateStatus = (id, status) =>{
  return api.put(`/leave/status/${id}`, {status});
}

