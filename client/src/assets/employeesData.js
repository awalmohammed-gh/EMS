

// src/assets/employeeData.ts

// ==========================================
// EMPLOYEE PROFILE
// ==========================================

export const employeeProfile = {
  id: "EMP001",
  name: "Kwame Mensah",
  email: "kwame.mensah@company.com",
  phone: "+233 24 123 4567",
  department: "Engineering",
  position: "Frontend Developer",
  employmentType: "Full-time",
  joinedDate: "2024-03-15",
  manager: "Michael Owusu",
  status: "Active",
};


// ==========================================
// EMPLOYEE DASHBOARD STATS
// ==========================================

export const employeeDashboardStats = [
  {
    title: "Present Days",
    value: 20,
    description: "This month",
    icon: "UserCheck",
  },
  {
    title: "Late Days",
    value: 2,
    description: "This month",
    icon: "Clock",
  },
  {
    title: "Leave Balance",
    value: 12,
    description: "Annual leave days",
    icon: "CalendarDays",
  },
  {
    title: "Latest Payslip",
    value: "GHS 4,500",
    description: "July 2026",
    icon: "Banknote",
  },
];


// ==========================================
// TODAY'S ATTENDANCE
// ==========================================

export const todayAttendance = {
  date: "2026-07-25",
  checkIn: "08:02 AM",
  checkOut: null,
  workHours: "4h 30m",
  status: "Present",
};


// ==========================================
// ATTENDANCE SUMMARY
// ==========================================

export const myAttendanceSummary = {
  workingDays: 22,
  present: 20,
  absent: 0,
  late: 2,
  attendanceRate: "90.9%",
};


// ==========================================
// LEAVE BALANCE
// ==========================================

export const myLeaveBalance = {
  annualLeave: {
    total: 15,
    used: 3,
    remaining: 12,
  },

  sickLeave: {
    total: 10,
    used: 2,
    remaining: 8,
  },

  personalLeave: {
    total: 5,
    used: 1,
    remaining: 4,
  },
};


// ==========================================
// RECENT LEAVE REQUESTS
// ==========================================

export const recentLeaveRequests = [
  {
    id: "LV001",
    leaveType: "Annual Leave",
    startDate: "2026-06-15",
    endDate: "2026-06-19",
    days: 5,
    status: "Approved",
  },
  {
    id: "LV002",
    leaveType: "Sick Leave",
    startDate: "2026-07-28",
    endDate: "2026-07-29",
    days: 2,
    status: "Pending",
  },
  {
    id: "LV003",
    leaveType: "Personal Leave",
    startDate: "2026-05-10",
    endDate: "2026-05-11",
    days: 2,
    status: "Approved",
  },
];


// ==========================================
// LATEST PAYSLIP
// ==========================================

export const latestPayslip = {
  id: "PAY001",
  month: "July 2026",
  basicSalary: 4000,
  allowances: 800,
  deductions: 300,
  netSalary: 4500,
  status: "Paid",
  paymentDate: "2026-07-25",
};


// ==========================================
// RECENT ATTENDANCE
// ==========================================

export const recentAttendance = [
  {
    id: "ATT001",
    date: "2026-07-25",
    checkIn: "08:02 AM",
    checkOut: null,
    workHours: "4h 30m",
    status: "Present",
  },
  {
    id: "ATT002",
    date: "2026-07-24",
    checkIn: "08:15 AM",
    checkOut: "05:02 PM",
    workHours: "7h 47m",
    status: "Late",
  },
  {
    id: "ATT003",
    date: "2026-07-23",
    checkIn: "07:55 AM",
    checkOut: "05:00 PM",
    workHours: "8h 05m",
    status: "Present",
  },
  {
    id: "ATT004",
    date: "2026-07-22",
    checkIn: "08:01 AM",
    checkOut: "05:10 PM",
    workHours: "8h 09m",
    status: "Present",
  },
];


// ==========================================
// QUICK ACTIONS
// ==========================================

export const employeeQuickActions = [
  {
    title: "Clock In",
    description: "Record your arrival",
    action: "clock-in",
  },
  {
    title: "Request Leave",
    description: "Submit a new leave request",
    action: "request-leave",
  },
  {
    title: "View Payslip",
    description: "View your latest payslip",
    action: "view-payslip",
  },
];