import mongoose from "mongoose";
import { Employee } from "../models/employeeModel.js";
import { Payroll } from "../models/payrollModel.js";
import { Leave } from "../models/leaveModel.js";
import { Attendance } from "../models/attendanceModel.js";
import { liveAttendanceStore } from "./employeeAttendance.js";

const isValidObjectId = (id) =>
  id &&
  typeof id === "string" &&
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === String(id);

const livePayrollStore = [];

// Helper: Calculate working days in a month (excluding Sat/Sun)
const getWorkingDaysInMonth = (year = 2026, monthIndex = 7) => {
  let count = 0;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, monthIndex, d).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  return count > 0 ? count : 22;
};

// Calculate monthly salary breakdown based on real attendance (deductions ONLY on absent status)
export const calculateMonthlyPayrollSummary = async (req, res) => {
  try {
    const { employeeId, month, year, baseSalaryInput } = req.query;

    const targetMonth = month || "August 2026";
    const targetYear = parseInt(year, 10) || 2026;
    const standardWorkingDays = getWorkingDaysInMonth(targetYear, 7); // Default ~22 days

    let targetEmployee = null;

    if (employeeId && employeeId !== "all") {
      try {
        if (isValidObjectId(employeeId)) {
          targetEmployee = await Employee.findById(employeeId).lean();
        } else {
          targetEmployee = await Employee.findOne({
            $or: [{ employeeId }, { email: employeeId }],
          }).lean();
        }
      } catch (err) {
        console.warn("Could not query DB employee in calculateMonthlyPayrollSummary:", err.message);
      }
    }

    if (!targetEmployee) {
      targetEmployee = await Employee.findOne({ isActive: true }).lean();
    }

    if (!targetEmployee) {
      return res.status(404).json({
        success: false,
        message: "No active employee found to calculate payroll summary.",
      });
    }

    const baseSalary = parseFloat(baseSalaryInput) || (targetEmployee.salary ? Number(targetEmployee.salary) : 4000);
    const dailyRate = parseFloat((baseSalary / standardWorkingDays).toFixed(2));
    const hourlyRate = parseFloat((dailyRate / 8).toFixed(2));

    const isTargetValidObjId = isValidObjectId(targetEmployee._id);

    // 1. Gather Attendance Records
    let attendanceRecords = [];
    if (isTargetValidObjId) {
      try {
        const dbAttendance = await Attendance.find({
          employee: targetEmployee._id,
        }).lean();

        if (dbAttendance && dbAttendance.length > 0) {
          attendanceRecords = dbAttendance;
        }
      } catch (err) {
        console.warn("DB attendance query for payroll calculation:", err.message);
      }
    }

    // Add active live clock-ins from memory
    liveAttendanceStore.forEach((liveAtt) => {
      if (liveAtt.employee === String(targetEmployee._id)) {
        if (!attendanceRecords.some((a) => a.date === liveAtt.date)) {
          attendanceRecords.push(liveAtt);
        }
      }
    });

    // Compute attendance counts directly from database records
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let onTimeDays = 0;
    let totalWorkHours = 0;

    attendanceRecords.forEach((record) => {
      const hrs = record.workHours || 8;
      totalWorkHours += hrs;

      const st = (record.status || "").toLowerCase();
      if (st === "absent") {
        absentDays++;
      } else {
        presentDays++;
        if (st === "late") {
          lateDays++;
        } else {
          onTimeDays++;
        }
      }
    });

    // 2. Gather Approved Leave Requests
    let approvedLeaves = [];
    if (isTargetValidObjId) {
      try {
        const dbLeaves = await Leave.find({
          employee: targetEmployee._id,
          status: "Approved",
        }).lean();

        if (dbLeaves && dbLeaves.length > 0) {
          approvedLeaves = dbLeaves;
        }
      } catch (err) {
        console.warn("DB leave query for payroll calculation:", err.message);
      }
    }

    let approvedPaidLeaveDays = 0;
    let approvedUnpaidLeaveDays = 0;

    approvedLeaves.forEach((leave) => {
      const days = Number(leave.totalDays) || 1;
      if (leave.leaveType === "Unpaid Leave") {
        approvedUnpaidLeaveDays += days;
        absentDays += days; // Unpaid leave counts as absent
      } else {
        approvedPaidLeaveDays += days;
      }
    });

    // Absence-based calculation: Deductions trigger ONLY when status === 'absent'
    // For employees with full attendance (absentDays === 0), process standard base salary with 0 deductions.
    const absenceDeductions = parseFloat((absentDays * dailyRate).toFixed(2));
    const grossSalary = baseSalary;
    const totalDeductions = absenceDeductions;
    const netCalculatedSalary = parseFloat(Math.max(0, grossSalary - totalDeductions).toFixed(2));

    const summary = {
      month: targetMonth,
      year: targetYear,
      employee: targetEmployee,
      workingDaysMetric: {
        standardWorkingDays,
        presentDays,
        onTimeDays,
        lateDays,
        absentDays,
        totalWorkHours,
        approvedPaidLeaveDays,
        approvedUnpaidLeaveDays,
      },
      rates: {
        monthlyBaseSalary: baseSalary,
        dailyRate,
        hourlyRate,
      },
      salaryCalculation: {
        grossSalary,
        basicSalary: baseSalary,
        absentDays,
        absenceDeductions,
        deductions: {
          absenceDeduction: absenceDeductions,
          total: totalDeductions,
        },
        allowances: {
          total: 0,
        },
        netCalculatedSalary,
      },
      formulaExplanation: {
        baseSalaryFormula: "Full Standard Base Salary",
        deductionsFormula: "Absent Days * Daily Rate (triggered ONLY on status === 'absent')",
        netSalaryFormula: "Gross Salary - Absenteeism Deductions",
      },
    };

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Error in calculateMonthlyPayrollSummary:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to calculate payroll summary.",
    });
  }
};

export const generatePayroll = async (req, res) => {
  try {
    const {
      employee,
      payMonth,
      paymentDate,
      basicSalary,
      allowances,
      deductions,
      paymentMethod,
      remarks,
    } = req.body;

    if (
      !employee ||
      !payMonth ||
      !paymentDate ||
      basicSalary === undefined ||
      !paymentMethod
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are required.",
      });
    }

    const netSalary =
      Number(basicSalary) + Number(allowances || 0) - Number(deductions || 0);
    const payslipNumber = `PAY-${Date.now()}`;

    let empDoc = null;
    if (isValidObjectId(employee)) {
      try {
        empDoc = await Employee.findById(employee).select("employeeId fullName email department position bankName accountNumber").lean();
      } catch (err) {
        console.warn("Could not find employee for payroll generation:", err.message);
      }
    } else if (employee) {
      try {
        empDoc = await Employee.findOne({
          $or: [{ employeeId: employee }, { email: employee }],
        }).select("employeeId fullName email department position bankName accountNumber").lean();
      } catch (err) {
        console.warn("Could not find employee by identifier for payroll generation:", err.message);
      }
    }

    if (!empDoc) {
      return res.status(404).json({
        success: false,
        message: "Employee record not found in database.",
      });
    }

    const newRecord = {
      _id: "pay_" + Date.now(),
      id: payslipNumber,
      payslipNumber,
      employee: empDoc,
      employeeId: empDoc.employeeId || "",
      employeeName: empDoc.fullName || "Staff Member",
      department: empDoc.department || "Operations",
      position: empDoc.position || "Staff Member",
      payMonth,
      month: payMonth,
      paymentDate,
      basicSalary: Number(basicSalary),
      allowances: Number(allowances || 0),
      deductions: Number(deductions || 0),
      netSalary,
      paymentMethod,
      remarks: remarks || "Generated monthly salary disbursement.",
      status: "Paid",
      createdAt: new Date().toISOString(),
    };

    // If valid MongoDB connection, save to MongoDB
    if (isValidObjectId(empDoc._id)) {
      try {
        const payroll = await Payroll.create({
          employee: empDoc._id,
          payslipNumber,
          payMonth,
          paymentDate,
          basicSalary: Number(basicSalary),
          allowances: Number(allowances || 0),
          deductions: Number(deductions || 0),
          netSalary,
          paymentMethod,
          remarks: newRecord.remarks,
          status: "Paid",
        });

        await payroll.populate(
          "employee",
          "employeeId fullName email department position",
        );

        newRecord._id = payroll._id;
      } catch (dbErr) {
        console.warn("DB storage in generatePayroll:", dbErr.message);
      }
    }

    livePayrollStore.unshift(newRecord);

    return res.status(201).json({
      success: true,
      message: "Payroll generated successfully.",
      payroll: newRecord,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Function to get all payslips for admin
export const allPayslips = async (req, res) => {
  try {
    let list = [...livePayrollStore];

    try {
      const payslips = await Payroll.find({})
        .populate("employee", "fullName employeeId department position email")
        .sort({ createdAt: -1 })
        .lean();

      if (payslips && payslips.length > 0) {
        // Merge without duplicate IDs
        payslips.forEach((p) => {
          if (!list.some((item) => String(item._id) === String(p._id) || item.payslipNumber === p.payslipNumber)) {
            list.push(p);
          }
        });
      }
    } catch (dbErr) {
      console.warn("DB fallback for allPayslips:", dbErr.message);
    }

    return res.status(200).json({
      success: true,
      list,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Function to get a single payroll/payslip record by ID or payslipNumber
export const getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Payroll ID or payslip number is required.",
      });
    }

    let foundRecord = null;

    // 1. Try finding in MongoDB if valid ObjectId
    if (isValidObjectId(id)) {
      try {
        foundRecord = await Payroll.findById(id)
          .populate("employee", "fullName employeeId department position email bankName accountNumber phone")
          .lean();
      } catch (dbErr) {
        console.warn("DB search by ID fallback:", dbErr.message);
      }
    }

    // 2. Try finding by payslipNumber or id in MongoDB
    if (!foundRecord) {
      try {
        foundRecord = await Payroll.findOne({
          $or: [{ payslipNumber: id }, { _id: id }],
        })
          .populate("employee", "fullName employeeId department position email bankName accountNumber phone")
          .lean();
      } catch (dbErr) {
        console.warn("DB search by payslipNumber fallback:", dbErr.message);
      }
    }

    // 3. Check in-memory store
    if (!foundRecord) {
      foundRecord = livePayrollStore.find(
        (p) =>
          String(p._id) === String(id) ||
          p.id === id ||
          p.payslipNumber === id ||
          p.employeeId === id,
      );
    }

    if (!foundRecord) {
      return res.status(404).json({
        success: false,
        message: `Payroll record with ID ${id} not found.`,
      });
    }

    // Normalize employee object and structure
    const employeeData = foundRecord.employee || {
      fullName: foundRecord.employeeName || "Employee",
      employeeId: foundRecord.employeeId || "",
      department: foundRecord.department || "Operations",
      position: foundRecord.position || "Staff",
      email: "",
      bankName: "",
      accountNumber: "",
    };

    const basicSalary = Number(foundRecord.basicSalary || 0);
    const allowances = Number(foundRecord.allowances || 0);
    const deductions = Number(foundRecord.deductions || 0);
    const netSalary = Number(foundRecord.netSalary || (basicSalary + allowances - deductions));

    const grossEarnings = basicSalary + allowances;

    const detailedPayroll = {
      ...foundRecord,
      _id: foundRecord._id || id,
      payslipNumber: foundRecord.payslipNumber || foundRecord.id || `PAY-${id}`,
      id: foundRecord.payslipNumber || foundRecord.id || `PAY-${id}`,
      employee: employeeData,
      employeeName: employeeData.fullName,
      employeeId: employeeData.employeeId,
      department: employeeData.department,
      position: employeeData.position,
      payMonth: foundRecord.payMonth || foundRecord.month || "August 2026",
      paymentDate: foundRecord.paymentDate || new Date().toISOString().split("T")[0],
      basicSalary,
      allowances,
      deductions,
      netSalary,
      status: foundRecord.status || "Paid",
      paymentMethod: foundRecord.paymentMethod || "Bank Transfer",
      remarks: foundRecord.remarks || "Monthly payroll calculation.",
      breakdown: {
        grossEarnings,
        basicSalary,
        absenteeismDeductions: deductions,
        allowances,
        netPayable: netSalary,
        earnings: [
          { label: "Gross Salary (Base Salary)", amount: basicSalary, type: "base" },
          ...(allowances > 0 ? [{ label: "Allowances & Bonuses", amount: allowances, type: "allowance" }] : []),
        ],
        deductionsList: [
          { label: "Absenteeism Deductions", amount: deductions, type: "absence" },
        ],
      },
    };

    return res.status(200).json({
      success: true,
      payroll: detailedPayroll,
      payslip: detailedPayroll,
    });
  } catch (error) {
    console.error("Error in getPayrollById:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve payroll details.",
    });
  }
};

// Function to update payroll status (e.g. Paid, Pending, Failed)
export const updatePayrollStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required.",
      });
    }

    let updated = null;

    if (isValidObjectId(id)) {
      try {
        updated = await Payroll.findByIdAndUpdate(
          id,
          { status, ...(remarks && { remarks }) },
          { new: true },
        ).populate("employee", "fullName employeeId department position");
      } catch (err) {
        console.warn("DB update status fallback:", err.message);
      }
    }

    // Update in live memory store
    const inMem = livePayrollStore.find(
      (p) => String(p._id) === String(id) || p.payslipNumber === id || p.id === id,
    );
    if (inMem) {
      inMem.status = status;
      if (remarks) inMem.remarks = remarks;
      updated = inMem;
    }

    return res.status(200).json({
      success: true,
      message: `Payroll status updated to ${status}.`,
      payroll: updated || { _id: id, status, remarks },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update payroll status.",
    });
  }
};

// Function to delete a payroll record
export const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;

    if (isValidObjectId(id)) {
      try {
        await Payroll.findByIdAndDelete(id);
      } catch (err) {
        console.warn("DB delete fallback:", err.message);
      }
    }

    const index = livePayrollStore.findIndex(
      (p) => String(p._id) === String(id) || p.payslipNumber === id || p.id === id,
    );
    if (index !== -1) {
      livePayrollStore.splice(index, 1);
    }

    return res.status(200).json({
      success: true,
      message: "Payroll record deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete payroll record.",
    });
  }
};

// Function to export monthly payroll summary reports
export const exportPayrollReport = async (req, res) => {
  try {
    const { month, format } = req.query;
    let records = [...livePayrollStore];

    try {
      const dbRecords = await Payroll.find({})
        .populate("employee", "fullName employeeId department position bankName accountNumber")
        .lean();
      if (dbRecords && dbRecords.length > 0) {
        records = dbRecords;
      }
    } catch (err) {
      console.warn("DB export fallback:", err.message);
    }

    if (month && month !== "All" && month !== "All Months") {
      records = records.filter(
        (r) => (r.payMonth && r.payMonth.toLowerCase().includes(month.toLowerCase())) ||
               (r.month && r.month.toLowerCase().includes(month.toLowerCase())),
      );
    }

    const exportRows = records.map((r, i) => {
      const empName = r.employee?.fullName || r.employeeName || "Employee";
      const empId = r.employee?.employeeId || r.employeeId || `EMP00${i + 1}`;
      const dept = r.employee?.department || r.department || "Operations";
      const basic = Number(r.basicSalary || 0);
      const allow = Number(r.allowances || 0);
      const deduct = Number(r.deductions || 0);
      const net = Number(r.netSalary || (basic + allow - deduct));

      return {
        payslipNumber: r.payslipNumber || r.id || `PAY-${i + 1}`,
        employeeId: empId,
        employeeName: empName,
        department: dept,
        payMonth: r.payMonth || r.month || "August 2026",
        paymentDate: r.paymentDate || "2026-08-25",
        basicSalary: basic,
        allowances: allow,
        deductions: deduct,
        netSalary: net,
        paymentMethod: r.paymentMethod || "Bank Transfer",
        status: r.status || "Paid",
      };
    });

    return res.status(200).json({
      success: true,
      reportMonth: month || "All Months",
      totalCount: exportRows.length,
      totalDisbursement: exportRows.reduce((acc, r) => acc + r.netSalary, 0),
      data: exportRows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate export report.",
    });
  }
};

// Each employee payslip
export const employeePayslips = async (req, res) => {
  try {
    const rawEmployeeId = req.employee?.id || req.employee?._id;
    let validObjectId = null;

    if (isValidObjectId(rawEmployeeId)) {
      validObjectId = rawEmployeeId;
    } else if (rawEmployeeId) {
      try {
        const emp = await Employee.findOne({
          $or: [{ employeeId: rawEmployeeId }, { email: rawEmployeeId }],
        }).select("_id").lean();
        if (emp) validObjectId = emp._id.toString();
      } catch (err) {
        console.warn("Could not find employee for payslips query:", err.message);
      }
    }

    let formattedPayslips = [];

    if (validObjectId) {
      try {
        const payslips = await Payroll.find({
          employee: validObjectId,
        })
          .populate("employee", "employeeId fullName department position")
          .sort({ paymentDate: -1 })
          .lean();

        if (payslips && payslips.length > 0) {
          formattedPayslips = payslips.map((payslip) => ({
            id: payslip.payslipNumber || payslip._id,
            payslipNumber: payslip.payslipNumber,
            _id: payslip._id,
            employeeId: payslip.employee?.employeeId || "",
            employeeName: payslip.employee?.fullName || "Employee",
            department: payslip.employee?.department || "Operations",
            position: payslip.employee?.position || "Staff",
            month: payslip.payMonth,
            payMonth: payslip.payMonth,
            basicSalary: payslip.basicSalary,
            allowances: payslip.allowances,
            deductions: payslip.deductions,
            netSalary: payslip.netSalary,
            status: payslip.status,
            paymentDate: payslip.paymentDate,
          }));
        }
      } catch (dbErr) {
        console.warn("DB error for employeePayslips:", dbErr.message);
      }
    }

    // Merge live generated store records matching this employee
    if (livePayrollStore.length > 0 && (rawEmployeeId || validObjectId)) {
      const liveMatches = livePayrollStore.filter((p) => {
        const pEmpId = String(p.employee?._id || p.employee || "");
        return pEmpId === String(validObjectId) || pEmpId === String(rawEmployeeId) || p.employeeId === rawEmployeeId;
      });

      liveMatches.forEach((p) => {
        if (!formattedPayslips.some((f) => String(f._id) === String(p._id) || f.payslipNumber === p.payslipNumber)) {
          formattedPayslips.unshift({
            id: p.payslipNumber || p.id,
            payslipNumber: p.payslipNumber || p.id,
            _id: p._id,
            employeeId: p.employee?.employeeId || p.employeeId || "",
            employeeName: p.employee?.fullName || p.employeeName || "Employee",
            department: p.employee?.department || p.department || "Operations",
            position: p.employee?.position || p.position || "Staff",
            month: p.payMonth || p.month,
            payMonth: p.payMonth || p.month,
            basicSalary: p.basicSalary,
            allowances: p.allowances,
            deductions: p.deductions,
            netSalary: p.netSalary,
            status: p.status,
            paymentDate: p.paymentDate,
          });
        }
      });
    }

    return res.status(200).json({
      success: true,
      payslips: formattedPayslips,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
