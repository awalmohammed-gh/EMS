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
export const updateEmployeeMe = (data) => {
  return api.put("/employee/me", data);
};

export const updateEmployeeStatus = (id, status) => {
  return api.put(`/admin/employees/${id}/status`, { status });
};

export const deleteEmployee = (id) => {
  return api.delete(`/admin/employees/${id}`);
};

// authentication & registration endpoints
export const checkAdminExists = () => {
  return api.get("/auth/admin/exists");
};

export const adminRegister = (data) => {
  return api.post("/auth/admin/register", data);
};

export const adminLogin = (data) => {
  return api.post("/auth/admin/login", data);
};

export const employeeLogin = (data) => {
  return api.post("/auth/employee/login", data);
};

export const authLogout = () => {
  return api.post("/auth/logout");
};

export const getAuthMe = () => {
  return api.get("/auth/me");
};

export const employeeLogout = () => {
  return api.post("/auth/employee/logout");
};

// admin user & employee management
export const createUserAccount = (data) => {
  return api.post("/admin/create-user", data);
};

export const createEmployeeUser = (data) => {
  return api.post("/admin/create-user", data);
};

// legacy aliases for backward compatibility
export const adminLog = (data) => {
  return api.post("/auth/admin/login", data);
};
export const adminLogout = () => {
  return api.post("/auth/admin/logout");
};
export const getAdminMe = () => {
  return api.get("/admin/me");
};
export const getAdminProfile = () => {
  return api.get("/admin/me");
};
export const updateAdminProfile = (data) => {
  return api.put("/admin/profile", data);
};
export const changeAdminPassword = (data) => {
  return api.put("/admin/change-password", data);
};
export const updateAdminSettings = (data) => {
  return api.put("/admin/settings", data);
};
export const createAdminAccount = (data) => {
  return api.post("/auth/admin/register", data);
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

export const getPayrollAnalytics = (params) => {
  return api.get("/pay/analytics", { params });
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

export const updateAttendanceRecord = (id, data) => {
  return api.put(`/attendance/record/${id}`, data);
};

export const createManualAttendanceRecord = (data) => {
  return api.post("/attendance/manual-record", data);
};



//dashboard
export const adminDashboardOverview = () =>{
  return api.get("/dashboard/admin-dashboard")
}

export const getAdminDashboardStats = () => {
  return api.get("/admin/dashboard-stats");
};

export const getAdminPayrollSummary = () => {
  return api.get("/admin/payroll/summary");
};

export const employeeDashboardOverview = () =>{
  return api.get("/dashboard/employee-dashboard");
}

export const getDashboardNotifications = (params) => {
  return api.get("/notifications", { params });
};

export const getNotifications = (params) => {
  return api.get("/notifications", { params });
};

export const markNotificationAsRead = (id) => {
  return api.put(`/notifications/${id}/read`, {});
};

export const markAllNotificationsAsRead = (params) => {
  return api.patch("/notifications/read-all", {}, { params });
};

export const deleteNotification = (id) => {
  return api.delete(`/notifications/${id}`);
};

export const deleteAllNotifications = (params) => {
  return api.delete("/notifications", { params });
};



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

export const getEmployeeLeaveStats = () => {
  return api.get("/leave/employee-stats");
};

// announcements (Supporting both /admin/announcements and /announcements)
export const getAdminAnnouncements = (params) => {
  return api.get("/admin/announcements", { params });
};

export const createAdminAnnouncement = (data) => {
  return api.post("/admin/announcements", data);
};

export const deleteAdminAnnouncement = (id) => {
  return api.delete(`/admin/announcements/${id}`);
};

export const getAnnouncements = (params) => {
  return api.get("/announcements", { params });
};

export const getAnnouncementById = (id, params) => {
  return api.get(`/announcements/${id}`, { params });
};

export const getAdminAnnouncementById = (id, params) => {
  return api.get(`/admin/announcements/${id}`, { params });
};

export const createAnnouncement = (data) => {
  return api.post("/admin/announcements", data);
};

export const updateAnnouncement = (id, data) => {
  return api.put(`/admin/announcements/${id}`, data);
};

export const togglePinAnnouncement = (id) => {
  return api.patch(`/admin/announcements/${id}/pin`, {});
};

export const deleteAnnouncement = (id) => {
  return api.delete(`/admin/announcements/${id}`);
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
