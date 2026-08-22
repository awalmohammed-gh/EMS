import mongoose from "mongoose";
import { Attendance } from "../models/attendanceModel.js";
import { Employee } from "../models/employeeModel.js";
import { Leave } from "../models/leaveModel.js";
import { Payroll } from "../models/payrollModel.js";
import {
  getEmployeeLiveToday,
  liveAttendanceStore,
} from "./employeeAttendance.js";
import { liveLeaveStore } from "./leaveController.js";
import { getNotifications } from "./notificationController.js";

const isValidObjectId = (id) =>
  id &&
  typeof id === "string" &&
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === String(id);

// Admin dashboard overview
export const getDashboardOverview = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    let totalEmployees = 0;
    let presentToday = 0;
    let lateToday = 0;
    let onLeave = 0;
    let absentToday = 0;
    let totalRequests = 0;
    let approvedLeaves = 0;
    let pendingLeaves = 0;
    let rejectedLeaves = 0;
    let payroll = {
      totalPayroll: 0,
      paidPayroll: 0,
      pendingPayroll: 0,
    };
    let departments = [];
    let attendanceTrends = [
      { day: "Mon", present: 0, late: 0, absent: 0, onLeave: 0 },
      { day: "Tue", present: 0, late: 0, absent: 0, onLeave: 0 },
      { day: "Wed", present: 0, late: 0, absent: 0, onLeave: 0 },
      { day: "Thu", present: 0, late: 0, absent: 0, onLeave: 0 },
      { day: "Fri", present: 0, late: 0, absent: 0, onLeave: 0 },
    ];
    let leaveTypeDistribution = [];
    let pendingApprovalsList = [];

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

      attendanceTrends = [
        { day: "Mon", present: presentToday, late: lateToday, absent: absentToday, onLeave },
        { day: "Tue", present: presentToday, late: lateToday, absent: absentToday, onLeave },
        { day: "Wed", present: presentToday, late: lateToday, absent: absentToday, onLeave },
        { day: "Thu", present: presentToday, late: lateToday, absent: absentToday, onLeave },
        { day: "Fri", present: presentToday, late: lateToday, absent: absentToday, onLeave },
      ];

      // Gather real pending leaves for visual approvals tracker
      const dbPendingLeaves = await Leave.find({ status: "Pending" })
        .populate("employee", "fullName department position employeeId")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();

      if (dbPendingLeaves && dbPendingLeaves.length > 0) {
        pendingApprovalsList = dbPendingLeaves;
      }

      // Group leave by type
      const leaveTypeCounts = await Leave.aggregate([
        { $group: { _id: "$leaveType", count: { $sum: 1 } } },
      ]);
      if (leaveTypeCounts.length > 0) {
        const colors = ["#002185", "#ff5500", "#16A34A", "#8B5CF6", "#F59E0B", "#06B6D4"];
        leaveTypeDistribution = leaveTypeCounts.map((item, idx) => ({
          name: item._id || "Other",
          value: item.count,
          fill: colors[idx % colors.length],
        }));
      }

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
      console.warn("DB query for admin dashboard:", dbErr.message);
    }

    // Merge in-memory pending leaves if not in list
    if (liveLeaveStore && liveLeaveStore.length > 0) {
      const inMemoryPending = liveLeaveStore.filter((l) => l.status === "Pending");
      inMemoryPending.forEach((item) => {
        if (!pendingApprovalsList.some((p) => String(p._id) === String(item._id))) {
          pendingApprovalsList.unshift(item);
        }
      });
      pendingLeaves = liveLeaveStore.filter((l) => l.status === "Pending").length || pendingLeaves;
      totalRequests = Math.max(totalRequests, liveLeaveStore.length);
      approvedLeaves = liveLeaveStore.filter((l) => l.status === "Approved").length || approvedLeaves;
      rejectedLeaves = liveLeaveStore.filter((l) => l.status === "Rejected").length || rejectedLeaves;
    }

    // Dynamic leave status breakdown for charts
    const leaveStatusData = [
      { name: "Approved", value: approvedLeaves, fill: "#16A34A" },
      { name: "Pending", value: pendingLeaves, fill: "#ff5500" },
      { name: "Rejected", value: rejectedLeaves, fill: "#DC2626" },
    ];

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
          totalPayroll: payroll.totalPayroll || 0,
          paid: payroll.paidPayroll || 0,
          pending: payroll.pendingPayroll || 0,
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
        attendanceTrends,
        leaveStatusData,
        leaveTypeDistribution,
        pendingApprovalsList,
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
    const rawEmployeeId = req.employee?.id || req.employee?._id;
    const today = new Date().toISOString().split("T")[0];

    let employee = null;
    let presentDays = 0;
    let lateDays = 0;
    let leaveBalance = 15;
    let latestPayslip = null;
    let recentLeaves = [];
    let todayAttendance = null;

    if (rawEmployeeId) {
      todayAttendance = getEmployeeLiveToday(rawEmployeeId, today);
    }

    try {
      let dbEmployee = null;
      let validObjectId = null;

      if (isValidObjectId(rawEmployeeId)) {
        validObjectId = rawEmployeeId;
        dbEmployee = await Employee.findById(rawEmployeeId)
          .select("fullName email department position isActive employeeId phone")
          .lean();
      } else if (rawEmployeeId) {
        dbEmployee = await Employee.findOne({
          $or: [
            { employeeId: rawEmployeeId },
            { email: rawEmployeeId },
          ],
        })
          .select("fullName email department position isActive employeeId phone")
          .lean();
        if (dbEmployee && dbEmployee._id) {
          validObjectId = dbEmployee._id.toString();
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

        // Query real leaves from DB
        const dbLeaves = await Leave.find({ employee: validObjectId })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();

        if (dbLeaves && dbLeaves.length > 0) {
          recentLeaves = dbLeaves;
          const usedDays = dbLeaves
            .filter((l) => l.status === "Approved")
            .reduce((acc, curr) => acc + (curr.totalDays || curr.days || 0), 0);
          leaveBalance = Math.max(0, 15 - usedDays);
        }
      }

      // Merge in-memory live leave store items
      if (liveLeaveStore && liveLeaveStore.length > 0 && employee) {
        const matchingLive = liveLeaveStore.filter(
          (l) =>
            String(l.employee?._id) === String(rawEmployeeId) ||
            String(l.employee?._id) === String(validObjectId) ||
            l.employee?.employeeId === employee.employeeId
        );
        matchingLive.forEach((item) => {
          if (!recentLeaves.some((r) => String(r._id) === String(item._id))) {
            recentLeaves.unshift(item);
          }
        });
      }
    } catch (dbErr) {
      console.warn("DB error in employee dashboard overview:", dbErr.message);
    }

    res.status(200).json({
      success: true,
      employee,
      overview: {
        presentDays,
        lateDays,
        leaveBalance,
        netSalary: latestPayslip ? latestPayslip.amount : 0,
        latestPayslip,
      },
      todayAttendance,
      recentLeaves,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Dashboard Alerts & System Notifications (uses live DB/Reactive store - zero mock data)
export const getDashboardNotifications = async (req, res) => {
  return getNotifications(req, res);
};

