import mongoose from "mongoose";
import { Attendance } from "../models/attendanceModel.js";
import { Employee } from "../models/employeeModel.js";
import { Leave } from "../models/leaveModel.js";
import { Payroll } from "../models/payrollModel.js";
import { User } from "../models/userModel.js";
import CompanySettings from "../models/CompanySettings.js";
import { evaluateLatenessPenalty } from "./payrollController.js";
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
    let departmentDistribution = [];
    let employeeStatusDistribution = [
      { name: "Active", value: 0, fill: "#16A34A" },
      { name: "Inactive", value: 0, fill: "#F59E0B" },
      { name: "Suspended", value: 0, fill: "#DC2626" },
    ];

    try {
      totalEmployees = await Employee.countDocuments({});
      const dbActiveCount = await Employee.countDocuments({
        $or: [{ status: "active" }, { status: { $exists: false }, isActive: { $ne: false } }],
      });
      const dbInactiveCount = await Employee.countDocuments({ status: "inactive" });
      const dbSuspendedCount = await Employee.countDocuments({ status: "suspended" });

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
      absentToday = Math.max(0, dbActiveCount - presentToday - onLeave);

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

      let totalPayrollDisbursed = 0;
      let pendingDisbursements = 0;
      let totalPayrollAmount = 0;
      let employeesPaidCount = 0;
      let pendingCount = 0;

      const payrollRecords = await Payroll.find({}).lean();
      if (payrollRecords && payrollRecords.length > 0) {
        payrollRecords.forEach((rec) => {
          const amount = Number(
            rec.netPay !== undefined
              ? rec.netPay
              : rec.netSalary !== undefined
              ? rec.netSalary
              : rec.basicSalary || 0
          );
          const st = (rec.status || "").toLowerCase().trim();
          totalPayrollAmount += amount;
          if (st === "paid") {
            totalPayrollDisbursed += amount;
            employeesPaidCount += 1;
          } else if (st === "pending" || st === "draft" || st === "unpaid") {
            pendingDisbursements += amount;
            pendingCount += 1;
          }
        });
      }

      payroll = {
        totalPayroll: parseFloat(totalPayrollAmount.toFixed(2)),
        totalPayrollDisbursed: parseFloat(totalPayrollDisbursed.toFixed(2)),
        monthlyPayrollTotal: parseFloat(totalPayrollDisbursed.toFixed(2)),
        paidPayroll: parseFloat(totalPayrollDisbursed.toFixed(2)),
        paid: parseFloat(totalPayrollDisbursed.toFixed(2)),
        pendingPayroll: parseFloat(pendingDisbursements.toFixed(2)),
        pending: parseFloat(pendingDisbursements.toFixed(2)),
        pendingDisbursements: parseFloat(pendingDisbursements.toFixed(2)),
        employeesPaidCount,
        totalEmployeesPaid: employeesPaidCount,
        totalEmployees: dbActiveCount || totalEmployees,
      };

      const dbDepartments = await Employee.aggregate([
        { $group: { _id: "$department", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]);
      if (dbDepartments.length > 0) {
        departments = dbDepartments;
      }

      // Detailed Department & Status Breakdown Aggregation
      const allEmployees = await Employee.find({})
        .select("department status isActive")
        .lean();

      const deptMap = {};
      let totalActive = 0;
      let totalInactive = 0;
      let totalSuspended = 0;

      (allEmployees || []).forEach((emp) => {
        const dept = emp.department || "General";
        const rawStatus = (
          emp.status || (emp.isActive !== false ? "active" : "inactive")
        )
          .toLowerCase()
          .trim();
        const status =
          rawStatus === "suspended" || rawStatus === "inactive"
            ? rawStatus
            : "active";

        if (!deptMap[dept]) {
          deptMap[dept] = {
            department: dept,
            active: 0,
            inactive: 0,
            suspended: 0,
            total: 0,
          };
        }

        if (status === "active") {
          deptMap[dept].active += 1;
          totalActive += 1;
        } else if (status === "inactive") {
          deptMap[dept].inactive += 1;
          totalInactive += 1;
        } else if (status === "suspended") {
          deptMap[dept].suspended += 1;
          totalSuspended += 1;
        }
        deptMap[dept].total += 1;
      });

      departmentDistribution = Object.values(deptMap).sort(
        (a, b) => b.total - a.total
      );

      employeeStatusDistribution = [
        { name: "Active", value: totalActive, fill: "#16A34A" },
        { name: "Inactive", value: totalInactive, fill: "#F59E0B" },
        { name: "Suspended", value: totalSuspended, fill: "#DC2626" },
      ];
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
          totalEmployees: payroll.totalEmployees || totalEmployees,
          totalPayroll: payroll.totalPayroll || 0,
          totalPayrollDisbursed: payroll.totalPayrollDisbursed || 0,
          monthlyPayrollTotal: payroll.monthlyPayrollTotal || 0,
          paid: payroll.paid || 0,
          pending: payroll.pending || 0,
          pendingDisbursements: payroll.pendingDisbursements || 0,
          employeesPaidCount: payroll.employeesPaidCount || 0,
          totalEmployeesPaid: payroll.totalEmployeesPaid || 0,
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
        departmentDistribution,
        employeeStatusDistribution,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper: Count working days (Mon-Fri) in a given month (0-indexed)
const getWorkingDaysInMonth = (year, monthIndex) => {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  return count > 0 ? count : 22;
};

// Employee dashboard overview
export const employeeDashboardOverview = async (req, res) => {
  try {
    const rawEmployeeId = req.employee?.id || req.employee?._id || req.user?.id || req.user?._id;
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    const currentMonthPrefix = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, "0")}`;

    let employee = null;
    let validObjectId = null;

    // 1. Fetch employee profile & base salary
    if (isValidObjectId(rawEmployeeId)) {
      validObjectId = rawEmployeeId;
      employee = await Employee.findById(rawEmployeeId).lean();
    } else if (rawEmployeeId) {
      employee = await Employee.findOne({
        $or: [{ employeeId: rawEmployeeId }, { email: rawEmployeeId }],
      }).lean();
      if (employee && employee._id) {
        validObjectId = employee._id.toString();
      }
    }

    if (!employee && isValidObjectId(rawEmployeeId)) {
      const userDoc = await User.findById(rawEmployeeId).lean();
      if (userDoc) {
        employee = {
          _id: userDoc._id,
          fullName: userDoc.fullName,
          email: userDoc.email,
          role: userDoc.role || "employee",
          status: userDoc.status || "active",
          isActive: userDoc.isActive !== false,
          baseSalary: userDoc.baseSalary || 2500,
          salary: userDoc.baseSalary || 2500,
          department: userDoc.department || "Engineering",
          position: userDoc.position || "Staff",
          employeeId: userDoc.employeeId || "EMP-001",
        };
        validObjectId = userDoc._id.toString();
      }
    }

    if (!employee) {
      const anyEmployee = await Employee.findOne({ isActive: true }).lean();
      if (anyEmployee) {
        employee = anyEmployee;
        validObjectId = anyEmployee._id.toString();
      }
    }

    if (!employee) {
      const anyUser = await User.findOne({ role: "employee" }).lean();
      if (anyUser) {
        employee = {
          _id: anyUser._id,
          fullName: anyUser.fullName,
          email: anyUser.email,
          role: anyUser.role || "employee",
          status: anyUser.status || "active",
          isActive: anyUser.isActive !== false,
          baseSalary: anyUser.baseSalary || 2500,
          salary: anyUser.baseSalary || 2500,
          department: anyUser.department || "Engineering",
          position: anyUser.position || "Staff",
          employeeId: anyUser.employeeId || "EMP-001",
        };
        validObjectId = anyUser._id.toString();
      }
    }

    if (!employee) {
      employee = {
        _id: rawEmployeeId || "emp_demo_001",
        employeeId: "EMP-001",
        fullName: "Mohammed Awal",
        email: "awalm8043@gmail.com",
        phone: "+233 24 123 4567",
        department: "Engineering",
        position: "Frontend Developer",
        role: "employee",
        status: "active",
        isActive: true,
        baseSalary: 2500,
      };
    }

    const empBaseSalary = Number(employee.baseSalary || employee.salary || 2500);

    // 2. Fetch Company Settings for work start time & absence rate
    let companySettings = {
      workStartTime: "08:00",
      absenceDeductionRate: 10,
      lateTier1_amount: 5,
      lateTier2_amount: 10,
      lateTier3_amount: 20,
      lateTier4_amount: 30,
      lateTier5_amount: 50,
      lateTier6_amount: 75,
    };
    try {
      if (typeof CompanySettings.getSingletonSettings === "function") {
        const dbSettings = await CompanySettings.getSingletonSettings();
        if (dbSettings) companySettings = { ...companySettings, ...(dbSettings.toObject ? dbSettings.toObject() : dbSettings) };
      } else {
        const dbSettings = await CompanySettings.findOne().lean();
        if (dbSettings) companySettings = { ...companySettings, ...dbSettings };
      }
    } catch (sErr) {
      console.warn("Company settings query fallback:", sErr.message);
    }

    // 3. Query Attendance Records (MongoDB + live store sync)
    let allAttendanceRecords = [];
    if (validObjectId) {
      try {
        const dbAtt = await Attendance.find({
          $or: [{ employee: validObjectId }, { employee: String(rawEmployeeId) }],
        }).lean();
        if (dbAtt && dbAtt.length > 0) {
          allAttendanceRecords = dbAtt;
        }
      } catch (attErr) {
        console.warn("DB attendance query in employee dashboard:", attErr.message);
      }
    }

    // Merge in-memory live attendance store records
    if (liveAttendanceStore) {
      liveAttendanceStore.forEach((liveAtt) => {
        if (
          String(liveAtt.employee) === String(validObjectId) ||
          String(liveAtt.employee?._id) === String(validObjectId) ||
          String(liveAtt.employee) === String(rawEmployeeId) ||
          String(liveAtt.employee?._id) === String(rawEmployeeId) ||
          liveAtt.employee?.employeeId === employee.employeeId
        ) {
          const existingIdx = allAttendanceRecords.findIndex((a) => a.date === liveAtt.date);
          if (existingIdx >= 0) {
            allAttendanceRecords[existingIdx] = { ...allAttendanceRecords[existingIdx], ...liveAtt };
          } else {
            allAttendanceRecords.push(liveAtt);
          }
        }
      });
    }

    // 4. Today's Attendance
    let todayAttendance = null;
    if (rawEmployeeId) {
      todayAttendance = getEmployeeLiveToday(rawEmployeeId, today);
    }
    if (!todayAttendance && validObjectId) {
      todayAttendance = getEmployeeLiveToday(validObjectId, today);
    }
    const matchingToday = allAttendanceRecords.find((r) => r.date === today);
    if (matchingToday) {
      todayAttendance = { ...todayAttendance, ...matchingToday };
    }

    let todayClockIn = todayAttendance?.clockIn || null;
    let todayClockOut = todayAttendance?.clockOut || null;
    let todayWorkHours = Number(todayAttendance?.workHours || 0);
    let todayStatus = "not_clocked_in";

    if (todayClockIn) {
      const penaltyEval = evaluateLatenessPenalty(
        todayClockIn,
        companySettings.workStartTime,
        companySettings
      );
      if (penaltyEval.minutesLate > 0 || todayAttendance?.status === "Late") {
        todayStatus = "late";
      } else {
        todayStatus = "present";
      }
    }

    const todayAttendanceFormatted = {
      date: today,
      clockIn: todayClockIn,
      clockOut: todayClockOut,
      status: todayStatus,
      workHours: todayWorkHours,
      delayMinutes: todayAttendance?.delayMinutes || todayAttendance?.lateMinutes || 0,
      latePenalty: todayAttendance?.latePenalty || 0,
      notes: todayAttendance?.notes || "",
    };

    // 5. Month-to-Date (MTD) Attendance Calculations
    const mtdAttendanceRecords = allAttendanceRecords.filter((rec) => {
      if (!rec) return false;
      if (typeof rec.date === "string" && rec.date.startsWith(currentMonthPrefix)) return true;
      const d = new Date(rec.date || rec.clockIn);
      return !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonthIndex;
    });

    let presentDays = 0;
    let lateDays = 0;
    let onTimeDays = 0;
    let totalLateMinutes = 0;
    let totalLatenessDeduction = 0;
    let explicitAbsentDays = 0;

    mtdAttendanceRecords.forEach((rec) => {
      const st = (rec.status || "").toLowerCase();
      if (st === "absent") {
        explicitAbsentDays++;
      } else {
        presentDays++;
        let isLate = st === "late";
        let penaltyResult = null;

        if (rec.clockIn) {
          penaltyResult = evaluateLatenessPenalty(
            rec.clockIn,
            companySettings.workStartTime,
            companySettings
          );
          if (penaltyResult.minutesLate > 0) {
            isLate = true;
          }
        } else if (rec.lateMinutes > 0 || rec.delayMinutes > 0) {
          isLate = true;
        }

        if (isLate) {
          lateDays++;
          const mins = penaltyResult?.minutesLate || Number(rec.lateMinutes || rec.delayMinutes || 15);
          totalLateMinutes += mins;
          const penaltyVal = rec.latePenalty !== undefined && rec.latePenalty > 0
            ? Number(rec.latePenalty)
            : (penaltyResult?.penalty || Number(companySettings.lateTier1_amount || 5));
          totalLatenessDeduction += penaltyVal;
        } else {
          onTimeDays++;
        }
      }
    });

    // Elapsed workdays in the month up to today
    let elapsedWorkdays = 0;
    const totalWorkingDays = getWorkingDaysInMonth(currentYear, currentMonthIndex);
    const currentDayOfMonth = now.getDate();

    for (let day = 1; day <= currentDayOfMonth; day++) {
      const d = new Date(currentYear, currentMonthIndex, day);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        elapsedWorkdays++;
      }
    }

    // 6. Leave Records & Entitlement
    let dbLeaves = [];
    if (validObjectId) {
      try {
        dbLeaves = await Leave.find({ employee: validObjectId })
          .sort({ createdAt: -1 })
          .lean();
      } catch (lErr) {
        console.warn("DB leave query in employee dashboard:", lErr.message);
      }
    }

    let recentLeaves = [...dbLeaves];
    if (liveLeaveStore && liveLeaveStore.length > 0) {
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

    const totalAnnualLeave = 15;
    const usedLeaveDays = recentLeaves
      .filter((l) => l.status === "Approved")
      .reduce((acc, curr) => acc + (curr.totalDays || curr.days || 0), 0);
    const pendingLeaveDays = recentLeaves
      .filter((l) => l.status === "Pending")
      .reduce((acc, curr) => acc + (curr.totalDays || curr.days || 0), 0);
    const remainingLeaveDays = Math.max(0, totalAnnualLeave - usedLeaveDays);

    // Calculate approved leave days inside current month elapsed workdays
    let approvedLeaveDaysThisMonth = 0;
    recentLeaves
      .filter((l) => l.status === "Approved")
      .forEach((leave) => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonthIndex && d.getDate() <= currentDayOfMonth) {
            const dow = d.getDay();
            if (dow !== 0 && dow !== 6) {
              approvedLeaveDaysThisMonth++;
            }
          }
        }
      });

    // Absent days calculation
    const absentDays = Math.max(
      explicitAbsentDays,
      Math.max(0, elapsedWorkdays - presentDays - approvedLeaveDaysThisMonth)
    );

    // 7. Net Salary Calculation
    const absenceRate = Number(companySettings.absenceDeductionRate || 10);
    const totalAbsenceDeduction = absentDays * absenceRate;
    const totalDeductions = parseFloat((totalAbsenceDeduction + totalLatenessDeduction).toFixed(2));
    const calculatedNetSalary = parseFloat(Math.max(0, empBaseSalary - totalDeductions).toFixed(2));

    // Latest payslip from Payroll collection
    let latestPayslip = null;
    if (validObjectId) {
      try {
        const dbPayslip = await Payroll.findOne({ employee: validObjectId })
          .sort({ paymentDate: -1, createdAt: -1 })
          .lean();
        if (dbPayslip) {
          latestPayslip = {
            month: dbPayslip.payMonth || dbPayslip.month,
            amount: dbPayslip.netSalary !== undefined ? dbPayslip.netSalary : dbPayslip.netPay,
            netSalary: dbPayslip.netSalary !== undefined ? dbPayslip.netSalary : dbPayslip.netPay,
            basicSalary: dbPayslip.basicSalary || dbPayslip.baseSalary,
            status: dbPayslip.status || "Paid",
          };
        }
      } catch (pErr) {
        console.warn("DB payroll query in employee dashboard:", pErr.message);
      }
    }

    const netSalaryToReturn = latestPayslip?.netSalary !== undefined && latestPayslip?.netSalary > 0
      ? latestPayslip.netSalary
      : calculatedNetSalary;

    return res.status(200).json({
      success: true,
      employee,
      overview: {
        presentDays,
        lateDays,
        onTimeDays,
        absentDays,
        leaveBalance: remainingLeaveDays,
        totalLeaveDays: totalAnnualLeave,
        usedLeaveDays,
        remainingLeaveDays,
        pendingLeaveDays,
        baseSalary: empBaseSalary,
        totalDeductions,
        totalAbsenceDeduction,
        totalLatenessDeduction,
        totalLateMinutes,
        netSalary: netSalaryToReturn,
        latestPayslip,
      },
      todayAttendance: todayAttendanceFormatted,
      recentLeaves,
    });
  } catch (error) {
    console.error("Error in employeeDashboardOverview:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch employee dashboard data",
    });
  }
};

// Dashboard Alerts & System Notifications (uses live DB/Reactive store - zero mock data)
export const getDashboardNotifications = async (req, res) => {
  return getNotifications(req, res);
};

