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
export const changeEmployeePassword = (data) => {
  return api.put("/employee/change-password", data);
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
export const getPenaltySettings = () => {
  return api.get("/admin/settings/penalties");
};
export const updatePenaltySettings = (data) => {
  return api.put("/admin/settings/penalties", data);
};
export const createAdminAccount = (data) => {
  return api.post("/auth/admin/register", data);
};


//generate payroll
export const payrollGenerate = (data) => {
  return api.post("/admin/payroll/generate", data).catch(() => {
    return api.post("/pay/generate", data);
  });
};

export const calculateEmployeePayroll = (params) => {
  return api.get("/admin/payroll/calculate-employee", { params }).catch(() => {
    return api.get("/pay/calculate-summary", { params });
  });
};

export const calculatePayrollSummary = (params) => {
  return api.get("/admin/payroll/calculate-employee", { params }).catch(() => {
    return api.get("/pay/calculate-summary", { params });
  });
};

export const getAllPayslips = (params) => {
  const config = params && params.params ? params : { params };
  return api.get("/admin/payroll/records", config).catch(() => {
    return api.get("/pay/payslips", config);
  });
};

export const getPayrollRecords = (params) => {
  const config = params && params.params ? params : { params };
  return api.get("/admin/payroll/records", config).catch(() => {
    return api.get("/pay/records", config).catch(() => {
      return api.get("/pay/payslips", config);
    });
  });
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
  return api.delete(`/admin/payroll/${id}`).catch(() => {
    return api.delete(`/pay/${id}`);
  });
};

export const exportPayrollReport = (params) => {
  return api.get("/pay/export", { params });
};

export const getPayrollAnalytics = (params) => {
  return api.get("/pay/analytics", { params });
};

export const getPayrollCycles = (params) => {
  return api.get("/admin/payroll/cycles", { params }).catch(() => {
    return api.get("/pay/cycles", { params });
  });
};

export const getPenaltyImpactAnalytics = (params) => {
  return api.get("/admin/analytics/penalty-impact", { params }).catch(() => {
    return api.get("/pay/penalty-impact", { params });
  });
};

export const getEmployeeLivePayrollSummary = (params) => {
  return api.get("/pay/live-summary", { params });
};

export const getMonthlyPayrollRun = (params) => {
  return api.get("/admin/payroll/monthly-run", { params }).catch(() => {
    return api.get("/pay/monthly-run", { params });
  });
};

export const getSalaryProjection = (params) => {
  return api.get("/employee/salary-projection/current", { params });
};

export const getCurrentSalaryProjection = (params) => {
  return api.get("/employee/salary-projection/current", { params });
};

export const calculateSalaryProjection = (data) => {
  return api.post("/employee/salary-projection", data);
};

export const getEmployeePayslip = () => {
  return api.get("/employee/payslips/my-payslips").catch(() => {
    return api.get("/pay/employee-payslip");
  });
};

export const getMyPayslips = () => {
  return api.get("/employee/payslips/my-payslips").catch(() => {
    return api.get("/pay/employee-payslip");
  });
};

export const syncAttendance = (data = {}) => {
  return api.post("/attendance/sync", data);
};

export const syncAttendancePenalties = (data = {}) => {
  return api.post("/attendance/sync-penalties", data);
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

export const excuseAttendanceRecord = (id, data) => {
  return api.put(`/attendance/record/${id}/excuse`, data);
};

export const flagAttendanceRecord = (id, data) => {
  return api.put(`/attendance/record/${id}/flag`, data);
};

export const unflagAttendanceRecord = (id) => {
  return api.put(`/attendance/record/${id}/unflag`);
};

export const recalculateAttendanceRecord = (id) => {
  return api.put(`/attendance/record/${id}/recalculate`);
};

export const deleteAttendanceRecord = (id) => {
  return api.delete(`/attendance/${id}`);
};

export const createManualAttendanceRecord = (data) => {
  return api.post("/attendance/manual-record", data);
};


export const bulkUploadBiometricAttendance = (data) => {
  return api.post("/attendance/bulk-upload", data);
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
  return api.post("/leave/apply", data).catch(() => {
    return api.post("/employee/leave/apply", data);
  });
};

export const myLeave = () => {
  return api.get("/employee/leave-requests").catch(() => {
    return api.get("/leave/my-leaves");
  });
};

export const getEmployeeLeaveRequests = () => {
  return api.get("/employee/leave-requests").catch(() => {
    return api.get("/leave/my-leaves");
  });
};

export const allLeaves = () => {
  return api.get("/admin/leave/all").catch(() => {
    return api.get("/leave/all");
  });
};

export const updateStatus = (id, status, adminRemark = "", adminNotes = "") => {
  const payload = {
    status,
    adminRemark: adminRemark || adminNotes,
    adminNotes: adminNotes || adminRemark,
  };
  return api.patch(`/admin/leave/${id}/status`, payload).catch(() => {
    return api.put(`/admin/leave/${id}/status`, payload).catch(() => {
      return api.put(`/leave/status/${id}`, payload);
    });
  });
};

export const updateLeaveStatusAdmin = (id, payload) => {
  const body = typeof payload === "string" ? { status: payload } : payload;
  return api.patch(`/admin/leave/${id}/status`, body).catch(() => {
    return api.put(`/admin/leave/${id}/status`, body).catch(() => {
      return api.put(`/leave/status/${id}`, body);
    });
  });
};

export const getEmployeeLeaveStats = () => {
  return api.get("/employee/leave/stats").catch(() => {
    return api.get("/leave/employee-stats");
  });
};

export const deleteLeave = (id) => {
  return api.delete(`/admin/leave/${id}`).catch(() => {
    return api.delete(`/leave/${id}`);
  });
};

export const deleteLeaveRequest = (id) => {
  return api.delete(`/leave/${id}`);
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

// Admin Settings Audit Logs
export const getAuditLogs = (params) => {
  return api.get("/admin/audit-logs", { params });
};

// Profile Picture & Avatar Management
export const uploadProfilePicture = (formData) => {
  return api.patch("/users/profile-picture", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const removeProfilePicture = () => {
  return api.delete("/users/profile-picture");
};


