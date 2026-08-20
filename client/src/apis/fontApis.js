import { api } from "./axios";

// function for admin to create account / add employee
export const employeeAccount = (data) => {
  return api.post("/employee/employee-account", data);
};
export const createEmployee = (data) => {
  return api.post("/employee/employee-account", data);
};
export const addEmployee = (data) => {
  return api.post("/employee/employee-account", data);
};

// employee directory & listing
export const allEmployees = () => {
  return api.get("/employee/all-employees");
};
export const getEmployees = () => {
  return api.get("/employee/all-employees");
};
export const fetchEmployeeDirectory = () => {
  return api.get("/employee/all-employees");
};

export const getEmployeeProfile = (id) => {
  return api.get(`/employee/profile/${id}`);
};

export const namesList = () => {
  return api.get("/employee/list-employee-name");
};

export const getEmployee = () => {
  return api.get("/employee/me");
};
export const getEmployeeMe = () => {
  return api.get("/employee/me");
};

// authentication
export const employeeLogin = (data) => {
  return api.post("/employee/login-account", data);
};

export const employeeLogout = () => {
  return api.post("/employee/logout-account");
};

// function for admin
export const adminLog = (data) => {
  return api.post("/admin/admin-login", data);
};
export const adminLogout = () => {
  return api.post("/admin/admin-logout");
};
export const getAdminMe = () => {
  return api.get("/admin/me");
};
export const getAdminProfile = () => {
  return api.get("/admin/me");
};

//generate payroll
export const payrollGenerate = (data) => {
  return api.post("/pay/generate", data);
};

export const calculatePayrollSummary = (params) => {
  return api.get("/pay/calculate-summary", { params });
};

export const getAllPayslips = (data) => {
  return api.get("/pay/payslips", data);
};

export const getPayrollById = (id) => {
  return api.get(`/pay/${id}`);
};

export const getPayslipDetails = (id) => {
  return api.get(`/pay/payslip/${id}`);
};

export const updatePayrollStatus = (id, data) => {
  return api.put(`/pay/status/${id}`, data);
};

export const deletePayroll = (id) => {
  return api.delete(`/pay/${id}`);
};

export const exportPayrollReport = (params) => {
  return api.get("/pay/export", { params });
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

export const getDashboardNotifications = (params) => {
  return api.get("/dashboard/notifications", { params });
}

export const getNotifications = (params) => {
  return api.get("/dashboard/notifications", { params });
}



// leave
export const applyForLeave = (data) => {
  return api.post("/leave/apply", data);
};

export const myLeave = () => {
  return api.get("/leave/my-leaves");
};

export const allLeaves = () => {
  return api.get("/leave/all");
};

export const updateStatus = (id, status, adminRemark = "") => {
  return api.put(`/leave/status/${id}`, { status, adminRemark });
};

// settings
export const getSettings = () => {
  return api.get("/settings/get-settings");
};

export const updateCompanySettings = (data) => {
  return api.put("/settings/company", data);
};

export const updateEmployeeSettings = (data) => {
  return api.put("/settings/employee", data);
};

export const updatePayrollSettings = (data) => {
  return api.put("/settings/payroll", data);
};

export const updateLeaveSettings = (data) => {
  return api.put("/settings/leave", data);
};

export const updateAttendanceSettings = (data) => {
  return api.put("/settings/attendance", data);
};

export const updateSecuritySettings = (data) => {
  return api.put("/settings/security", data);
};

