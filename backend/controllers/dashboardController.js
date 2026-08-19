import { Attendance } from "../models/attendanceModel.js";
import { Employee } from "../models/employeeModel.js";
import { Leave } from "../models/leaveModel.js";
import { Payroll } from "../models/payrollModel.js";

//admin dashboard overview

export const getDashboardOverview = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Employees
    const totalEmployees = await Employee.countDocuments({
      isActive: true,
    });

    // Attendance
    const presentToday = await Attendance.countDocuments({
      date: today,
      clockIn: { $ne: null },
    });

    const lateToday = await Attendance.countDocuments({
      date: today,
      status: "Late",
    });

    // Leave
    const onLeave = await Leave.countDocuments({
      status: "Approved",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    const absentToday = totalEmployees - presentToday - onLeave;

    // Leave Summary
    const totalRequests = await Leave.countDocuments();

    const approvedLeaves = await Leave.countDocuments({
      status: "Approved",
    });

    const pendingLeaves = await Leave.countDocuments({
      status: "Pending",
    });

    const rejectedLeaves = await Leave.countDocuments({
      status: "Rejected",
    });

    // Payroll
    const payrollSummary = await Payroll.aggregate([
      {
        $group: {
          _id: null,
          totalPayroll: { $sum: "$netSalary" },
          paidPayroll: {
            $sum: {
              $cond: [{ $eq: ["$status", "Paid"] }, "$netSalary", 0],
            },
          },
          pendingPayroll: {
            $sum: {
              $cond: [{ $eq: ["$status", "Pending"] }, "$netSalary", 0],
            },
          },
        },
      },
    ]);

    const payroll =
      payrollSummary.length > 0
        ? payrollSummary[0]
        : {
            totalPayroll: 0,
            paidPayroll: 0,
            pendingPayroll: 0,
          };

    // Employees by Department
    const departments = await Employee.aggregate([
      {
        $group: {
          _id: "$department",
          total: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          total: -1,
        },
      },
    ]);

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

//employee dashboard
export const employeeDashboardOverview = async (req, res) => {
  try {
    const employeeId = req.employee.id;

    // Employee Details
    const employee = await Employee.findById(employeeId)
      .select("fullName email department position isActive")
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // All attendance records
    const attendance = await Attendance.find({
      employee: employeeId,
    }).lean();

    const presentDays = attendance.filter(
      (item) => item.status === "On Time" || item.status === "Late",
    ).length;

    const lateDays = attendance.filter((item) => item.status === "Late").length;

    // Today's attendance
    const today = new Date().toISOString().split("T")[0];

    const todayAttendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    }).lean();

    // Leave (placeholder)
    const leaveBalance = 0;

    // Latest payroll
    const latestPayslip = await Payroll.findOne({
      employee: employeeId,
    })
      .sort({ paymentDate: -1 })
      .lean();

    res.status(200).json({
      success: true,
      employee,
      overview: {
        presentDays,
        lateDays,
        leaveBalance,
        netSalary: latestPayslip ? latestPayslip.netSalary : 0,
        latestPayslip: latestPayslip
          ? {
              month: latestPayslip.payMonth,
              amount: latestPayslip.netSalary,
            }
          : null,
      },

      // Add this
      todayAttendance,

      // Keep this for future leave requests
      recentLeaves: [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};