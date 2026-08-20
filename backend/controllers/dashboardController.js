import mongoose from "mongoose";
import { Attendance } from "../models/attendanceModel.js";
import { Employee } from "../models/employeeModel.js";
import { Leave } from "../models/leaveModel.js";
import { Payroll } from "../models/payrollModel.js";
import {
  fallbackEmployee,
  getEmployeeLiveToday,
  liveAttendanceStore,
} from "./employeeAttendance.js";
import { liveLeaveStore } from "./leaveController.js";

// Admin dashboard overview
export const getDashboardOverview = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    let totalEmployees = 6;
    let presentToday = 4;
    let lateToday = 1;
    let onLeave = 1;
    let absentToday = 1;
    let totalRequests = 4;
    let approvedLeaves = 2;
    let pendingLeaves = 1;
    let rejectedLeaves = 1;
    let payroll = {
      totalPayroll: 32500,
      paidPayroll: 25000,
      pendingPayroll: 7500,
    };
    let departments = [
      { _id: "Software Engineering", total: 3 },
      { _id: "Administrative", total: 1 },
      { _id: "Large Format", total: 1 },
      { _id: "Digital Marketing", total: 1 },
    ];

    try {
      totalEmployees = await Employee.countDocuments({ isActive: true });
      presentToday = await Attendance.countDocuments({
        date: today,
        clockIn: { $ne: null },
      });
      lateToday = await Attendance.countDocuments({
        date: today,
        status: "Late",
      });
      onLeave = await Leave.countDocuments({
        status: "Approved",
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      });
      absentToday = Math.max(0, totalEmployees - presentToday - onLeave);

      totalRequests = await Leave.countDocuments();
      approvedLeaves = await Leave.countDocuments({ status: "Approved" });
      pendingLeaves = await Leave.countDocuments({ status: "Pending" });
      rejectedLeaves = await Leave.countDocuments({ status: "Rejected" });

      const payrollSummary = await Payroll.aggregate([
        {
          $group: {
            _id: null,
            totalPayroll: { $sum: "$netSalary" },
            paidPayroll: {
              $sum: { $cond: [{ $eq: ["$status", "Paid"] }, "$netSalary", 0] },
            },
            pendingPayroll: {
              $sum: {
                $cond: [{ $eq: ["$status", "Pending"] }, "$netSalary", 0],
              },
            },
          },
        },
      ]);

      if (payrollSummary.length > 0) {
        payroll = payrollSummary[0];
      }

      const dbDepartments = await Employee.aggregate([
        { $group: { _id: "$department", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]);
      if (dbDepartments.length > 0) {
        departments = dbDepartments;
      }
    } catch (dbErr) {
      console.warn("Using fallback data for admin dashboard:", dbErr.message);
    }

    res.status(200).json({
      success: true,
      overview: {
        cards: {
          totalEmployees,
          presentToday,
          onLeave,
          pendingLeaves,
        },
        payroll: {
          totalEmployees,
          totalPayroll: payroll.totalPayroll,
          paid: payroll.paidPayroll,
          pending: payroll.pendingPayroll,
        },
        attendance: {
          totalEmployees,
          present: presentToday,
          onLeave,
          late: lateToday,
          absent: absentToday,
        },
        leave: {
          totalRequests,
          approved: approvedLeaves,
          pending: pendingLeaves,
          rejected: rejectedLeaves,
        },
        departments,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Employee dashboard overview
export const employeeDashboardOverview = async (req, res) => {
  try {
    const rawEmployeeId = req.employee?.id || req.employee?._id || fallbackEmployee._id;
    const today = new Date().toISOString().split("T")[0];

    let employee = fallbackEmployee;
    let presentDays = 20;
    let lateDays = 2;
    let leaveBalance = 14;
    let latestPayslip = {
      month: "August 2026",
      amount: 4500,
      netSalary: 4500,
    };

    // Check live in-memory attendance first
    let todayAttendance = getEmployeeLiveToday(rawEmployeeId, today);

    try {
      let dbEmployee = null;
      let validObjectId = null;

      if (mongoose.Types.ObjectId.isValid(rawEmployeeId) && String(new mongoose.Types.ObjectId(rawEmployeeId)) === String(rawEmployeeId)) {
        validObjectId = rawEmployeeId;
        dbEmployee = await Employee.findById(rawEmployeeId)
          .select("fullName email department position isActive employeeId phone")
          .lean();
      } else {
        // Query by employeeId or email if rawEmployeeId is string identifier
        dbEmployee = await Employee.findOne({
          $or: [
            { employeeId: rawEmployeeId },
            { email: rawEmployeeId },
            { employeeId: "EMP001" },
          ],
        })
          .select("fullName email department position isActive employeeId phone")
          .lean();
        if (dbEmployee && dbEmployee._id) {
          validObjectId = dbEmployee._id;
        }
      }

      if (dbEmployee) {
        employee = dbEmployee;
      }

      if (validObjectId) {
        const attendance = await Attendance.find({ employee: validObjectId }).lean();
        if (attendance && attendance.length > 0) {
          presentDays = attendance.filter(
            (item) => item.status === "On Time" || item.status === "Late",
          ).length;
          lateDays = attendance.filter((item) => item.status === "Late").length;
        }

        const dbTodayAttendance = await Attendance.findOne({
          employee: validObjectId,
          date: today,
        }).lean();

        if (dbTodayAttendance) {
          todayAttendance = dbTodayAttendance;
          liveAttendanceStore.set(`${rawEmployeeId}_${today}`, dbTodayAttendance);
          liveAttendanceStore.set(`${validObjectId}_${today}`, dbTodayAttendance);
        }

        const dbPayslip = await Payroll.findOne({ employee: validObjectId })
          .sort({ paymentDate: -1 })
          .lean();

        if (dbPayslip) {
          latestPayslip = {
            month: dbPayslip.payMonth,
            amount: dbPayslip.netSalary,
            netSalary: dbPayslip.netSalary,
          };
        }
      }
    } catch (dbErr) {
      console.warn("Using fallback data for employee dashboard:", dbErr.message);
    }

    res.status(200).json({
      success: true,
      employee,
      overview: {
        presentDays,
        lateDays,
        leaveBalance,
        netSalary: latestPayslip ? latestPayslip.amount : 4500,
        latestPayslip,
      },
      todayAttendance,
      recentLeaves: [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Dashboard Alerts & System Notifications
export const getDashboardNotifications = async (req, res) => {
  try {
    const role = req.headers["x-role"] || req.query.role || "admin";
    const userEmployeeId = req.employee?.id || req.headers["x-employee-id"] || "demo_employee_id_001";

    let pendingLeaves = [];

    // 1. Fetch pending leaves from DB if available
    try {
      const dbPending = await Leave.find({ status: "Pending" })
        .populate("employee", "fullName employeeId department position")
        .sort({ createdAt: -1 })
        .lean();

      if (dbPending && dbPending.length > 0) {
        pendingLeaves = dbPending;
      }
    } catch (err) {
      console.warn("DB fetch fallback for leave notifications:", err.message);
    }

    // Combine with in-memory pending leaves if not already present
    if (liveLeaveStore && liveLeaveStore.length > 0) {
      const inMemoryPending = liveLeaveStore.filter((l) => l.status === "Pending");
      inMemoryPending.forEach((item) => {
        if (!pendingLeaves.some((p) => String(p._id) === String(item._id))) {
          pendingLeaves.push(item);
        }
      });
    }

    // Format Leave Notifications
    const leaveNotifications = pendingLeaves.map((item) => {
      const empName = item.employee?.fullName || "An Employee";
      const empDept = item.employee?.department ? ` (${item.employee.department})` : "";
      const days = item.totalDays || 1;
      const leaveType = item.leaveType || "Leave";
      const reasonSnippet = item.reason ? ` - "${item.reason.length > 50 ? item.reason.slice(0, 47) + "..." : item.reason}"` : "";

      return {
        id: `leave_${item._id}`,
        type: "leave_request",
        category: "leave",
        title: `New ${leaveType} Request`,
        message: `${empName}${empDept} requested ${days} day${days > 1 ? "s" : ""} from ${item.startDate} to ${item.endDate}${reasonSnippet}`,
        timestamp: item.createdAt || new Date().toISOString(),
        priority: "high",
        unread: true,
        actionUrl: role === "admin" ? "/admin/dashboard/leave" : "/employee/dashboard/leave",
        actionLabel: role === "admin" ? "Review Leave" : "View Status",
        metadata: {
          leaveId: item._id,
          employeeName: empName,
          leaveType,
          totalDays: days,
          startDate: item.startDate,
          endDate: item.endDate,
        },
      };
    });

    // Curated System Updates & Operational Alerts
    const systemUpdates = [
      {
        id: "sys_update_001",
        type: "system_update",
        category: "system",
        title: "August 2026 Payroll Cycle Processed",
        message: "Payroll calculations and automated net disbursements for August 2026 have been generated and reconciled.",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        priority: "medium",
        unread: true,
        actionUrl: role === "admin" ? "/admin/dashboard/payslips" : "/employee/dashboard/payslips",
        actionLabel: "View Payslips",
        metadata: {
          period: "August 2026",
          status: "Processed",
        },
      },
      {
        id: "sys_update_002",
        type: "system_update",
        category: "announcement",
        title: "Company Holiday Notice: Founders' Day",
        message: "Statutory public holiday scheduled on September 21, 2026. Normal operations resume the following business day.",
        timestamp: new Date(Date.now() - 3600000 * 7).toISOString(),
        priority: "info",
        unread: true,
        actionUrl: role === "admin" ? "/admin/dashboard" : "/employee/dashboard",
        actionLabel: "View Calendar",
        metadata: {
          holidayDate: "2026-09-21",
        },
      },
      {
        id: "sys_update_003",
        type: "system_update",
        category: "security",
        title: "Security & Role Policy Update",
        message: "Two-factor authentication standards and session timeout rules have been updated for administrative personnel.",
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        priority: "info",
        unread: false,
        actionUrl: role === "admin" ? "/admin/dashboard/settings" : "/employee/dashboard/settings",
        actionLabel: "View Settings",
        metadata: {
          policy: "Security 2.4",
        },
      },
      {
        id: "sys_update_004",
        type: "attendance_alert",
        category: "attendance",
        title: "Daily Attendance Reconciliation",
        message: "Morning check-in report finalized. 88% overall on-time staff attendance recorded for today's active roster.",
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        priority: "low",
        unread: true,
        actionUrl: role === "admin" ? "/admin/dashboard/attendance" : "/employee/dashboard/attendance",
        actionLabel: "Attendance Log",
        metadata: {
          rate: "88%",
        },
      },
    ];

    // Combine and sort by timestamp descending
    const allNotifications = [...leaveNotifications, ...systemUpdates].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );

    const unreadCount = allNotifications.filter((n) => n.unread).length;

    return res.status(200).json({
      success: true,
      notifications: allNotifications,
      unreadCount,
      counts: {
        total: allNotifications.length,
        leaves: leaveNotifications.length,
        system: systemUpdates.length,
        unread: unreadCount,
      },
    });
  } catch (error) {
    console.error("getDashboardNotifications error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve notifications",
    });
  }
};

