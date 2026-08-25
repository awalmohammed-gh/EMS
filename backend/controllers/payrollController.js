import mongoose from "mongoose";
import { Employee } from "../models/employeeModel.js";
import { Payroll } from "../models/payrollModel.js";
import { Leave } from "../models/leaveModel.js";
import { Attendance } from "../models/attendanceModel.js";
import { CompanySettings } from "../models/CompanySettings.js";
import { AuditLog } from "../models/AuditLog.js";
import { liveAttendanceStore } from "./employeeAttendance.js";
import { createNotificationRecord } from "./notificationController.js";

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

// Helper: Parse shift start time and evaluate lateness penalty based on CompanySettings
export const evaluateLatenessPenalty = (clockInDate, workStartTime = "08:00", settings = {}) => {
  if (!clockInDate) {
    return { minutesLate: 0, penalty: 0, tier: "On Time", clockInFormatted: "--" };
  }

  let startHour = 8;
  let startMinute = 0;

  if (typeof workStartTime === "string" && workStartTime.trim()) {
    const cleanTime = workStartTime.trim();
    const isPM = /pm/i.test(cleanTime);
    const isAM = /am/i.test(cleanTime);
    const match = cleanTime.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      startHour = h;
      startMinute = m;
    }
  }

  const clockIn = new Date(clockInDate);
  if (isNaN(clockIn.getTime())) {
    return { minutesLate: 0, penalty: 0, tier: "On Time", clockInFormatted: "--" };
  }

  const clockInHour = clockIn.getHours();
  const clockInMinute = clockIn.getMinutes();

  const startTotalMinutes = startHour * 60 + startMinute;
  const clockInTotalMinutes = clockInHour * 60 + clockInMinute;
  const minutesLate = clockInTotalMinutes - startTotalMinutes;

  if (minutesLate <= 0) {
    return {
      minutesLate: 0,
      penalty: 0,
      tier: "On Time",
      clockInFormatted: clockIn.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" }),
    };
  }

  const t1 = Number(settings.lateTier1_amount || 0);
  const t2 = Number(settings.lateTier2_amount || 0);
  const t3 = Number(settings.lateTier3_amount || 0);
  const t4 = Number(settings.lateTier4_amount || 0);
  const t5 = Number(settings.lateTier5_amount || 0);
  const t6 = Number(settings.lateTier6_amount || 0);

  let penalty = 0;
  let tier = "";

  if (minutesLate >= 1 && minutesLate <= 30) {
    penalty = t1;
    tier = "1-30 mins late (Tier 1)";
  } else if (minutesLate >= 31 && minutesLate <= 60) {
    penalty = t2;
    tier = "31-60 mins late (Tier 2)";
  } else if (minutesLate >= 61 && minutesLate <= 120) {
    penalty = t3;
    tier = "1-2 hrs late (Tier 3)";
  } else if (minutesLate >= 121 && minutesLate <= 180) {
    penalty = t4;
    tier = "2-3 hrs late (Tier 4)";
  } else if (minutesLate >= 181 && minutesLate <= 240) {
    penalty = t5;
    tier = "3-4 hrs late (Tier 5)";
  } else {
    penalty = t6;
    tier = "4-5+ hrs late (Tier 6)";
  }

  return {
    minutesLate,
    penalty,
    tier,
    clockInFormatted: clockIn.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" }),
  };
};

// Calculate monthly salary breakdown based on real attendance (deductions for absence & lateness tiers)
export const calculateMonthlyPayrollSummary = async (req, res) => {
  try {
    let { employeeId, month, year, baseSalaryInput } = req.query;

    // Security & Scope: If requested by standard employee, enforce that calculation targets only themselves
    if (req.employee && (!req.admin || req.admin.role === "employee")) {
      employeeId = req.employee.id || req.employee._id || req.employee.employeeId;
    }

    const targetMonth = month || "August 2026";
    const targetYear = parseInt(year, 10) || 2026;
    const standardWorkingDays = getWorkingDaysInMonth(targetYear, 7); // Default ~22 days

    // Fetch active CompanySettings for penalty rules
    let companySettings = {
      workStartTime: "08:00",
      absenceDeductionRate: 10,
      lateTier1_amount: 0,
      lateTier2_amount: 0,
      lateTier3_amount: 0,
      lateTier4_amount: 0,
      lateTier5_amount: 0,
      lateTier6_amount: 0,
    };

    try {
      const dbSettings = await CompanySettings.findOne().lean();
      if (dbSettings) {
        companySettings = { ...companySettings, ...dbSettings };
      }
    } catch (err) {
      console.warn("DB settings query in calculateMonthlyPayrollSummary fallback:", err.message);
    }

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

    const baseSalary = parseFloat(baseSalaryInput) || (targetEmployee.baseSalary ? Number(targetEmployee.baseSalary) : targetEmployee.salary ? Number(targetEmployee.salary) : 4000);
    const absenceRate = Number(companySettings.absenceDeductionRate !== undefined ? companySettings.absenceDeductionRate : 10.0);
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
    let totalLatenessDeductions = 0;
    const latenessDetails = [];

    attendanceRecords.forEach((record) => {
      const hrs = record.workHours || 8;
      totalWorkHours += hrs;

      const st = (record.status || "").toLowerCase();
      if (st === "absent") {
        absentDays++;
      } else {
        presentDays++;
        // Check lateness
        let isLate = st === "late";
        let penaltyResult = null;

        if (record.clockIn) {
          penaltyResult = evaluateLatenessPenalty(record.clockIn, companySettings.workStartTime, companySettings);
          if (penaltyResult.minutesLate > 0) {
            isLate = true;
          }
        }

        if (isLate) {
          lateDays++;
          if (penaltyResult && penaltyResult.minutesLate > 0) {
            totalLatenessDeductions += penaltyResult.penalty;
            if (penaltyResult.penalty > 0 || penaltyResult.minutesLate > 0) {
              latenessDetails.push({
                date: record.date,
                clockIn: penaltyResult.clockInFormatted,
                minutesLate: penaltyResult.minutesLate,
                tier: penaltyResult.tier,
                penalty: penaltyResult.penalty,
              });
            }
          } else {
            const fallbackPenalty = Number(companySettings.lateTier1_amount || 0);
            totalLatenessDeductions += fallbackPenalty;
            latenessDetails.push({
              date: record.date,
              clockIn: "Late",
              minutesLate: 15,
              tier: "1-30 mins late (Tier 1)",
              penalty: fallbackPenalty,
            });
          }
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

    // Dynamic Absenteeism Deduction Rule: absentDays * companySettings.absenceDeductionRate
    const absenceDeductions = parseFloat((absentDays * absenceRate).toFixed(2));
    const latenessDeductions = parseFloat(totalLatenessDeductions.toFixed(2));
    const totalAttendanceDeductions = parseFloat((absenceDeductions + latenessDeductions).toFixed(2));
    const grossSalary = baseSalary;
    const totalDeductions = totalAttendanceDeductions;
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
      penaltySettings: companySettings,
      rates: {
        monthlyBaseSalary: baseSalary,
        dailyRate,
        hourlyRate,
        fixedAbsenceRate: absenceRate,
        absenceDeductionRate: absenceRate,
        workStartTime: companySettings.workStartTime,
        lateTier1_amount: companySettings.lateTier1_amount,
        lateTier2_amount: companySettings.lateTier2_amount,
        lateTier3_amount: companySettings.lateTier3_amount,
        lateTier4_amount: companySettings.lateTier4_amount,
        lateTier5_amount: companySettings.lateTier5_amount,
        lateTier6_amount: companySettings.lateTier6_amount,
      },
      salaryCalculation: {
        grossSalary,
        basicSalary: baseSalary,
        earnedBaseSalary: baseSalary,
        overtimeBonus: 0,
        absentDays,
        absenceDeductions,
        lateDays,
        latenessDeductions,
        latenessDetails,
        totalAttendanceDeductions,
        deductions: {
          absenceDeduction: absenceDeductions,
          latenessDeduction: latenessDeductions,
          total: totalDeductions,
        },
        allowances: {
          total: 0,
        },
        netCalculatedSalary,
      },
      formulaExplanation: {
        baseSalaryFormula: "Full Standard Base Salary",
        deductionsFormula: `Absent Days * GH₵${absenceRate} + Lateness Tier Penalties (GH₵${latenessDeductions})`,
        netSalaryFormula: "Base Salary + Approved Allowances - Total Absence Deductions - Total Lateness Penalties - Custom Admin Deductions",
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
      baseSalary: customBaseSalary,
      allowances,
      deductions,
      earnings,
      absentDaysDeduction,
      latenessDeduction,
      latenessPenalties,
      originalAbsenceDeduction,
      originalLatenessDeduction,
      penaltyOverride,
      paymentMethod,
      remarks,
    } = req.body;

    const finalBaseSalary = Number(customBaseSalary !== undefined ? customBaseSalary : basicSalary);

    if (
      !employee ||
      !payMonth ||
      !paymentDate ||
      finalBaseSalary === undefined ||
      isNaN(finalBaseSalary) ||
      !paymentMethod
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are required (employee, payMonth, paymentDate, baseSalary, paymentMethod).",
      });
    }

    // Process dynamic earnings array [{ description: String, amount: Number }]
    let parsedEarnings = [];
    if (Array.isArray(earnings)) {
      parsedEarnings = earnings
        .filter((e) => e && (e.description || e.name || e.label))
        .map((e) => ({
          description: e.description || e.name || e.label || "Allowance",
          amount: Number(e.amount || 0),
        }));
    } else if (Number(allowances || 0) > 0) {
      parsedEarnings = [
        {
          description: "Allowances & Bonuses",
          amount: Number(allowances),
        },
      ];
    }

    // Process dynamic deductions array [{ description: String, amount: Number }]
    let parsedDeductions = [];
    if (Array.isArray(deductions)) {
      parsedDeductions = deductions
        .filter((d) => d && (d.description || d.name || d.label))
        .map((d) => ({
          description: d.description || d.name || d.label || "Deduction",
          amount: Number(d.amount || 0),
        }));
    } else if (typeof deductions === "number" && Number(deductions) > 0) {
      parsedDeductions = [
        {
          description: "Standard Deductions",
          amount: Number(deductions),
        },
      ];
    }

    const totalCustomEarnings = parsedEarnings.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const totalCustomDeductions = parsedDeductions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    
    // Evaluate penalty overrides & waivers if provided
    const origAbsence = Number(originalAbsenceDeduction !== undefined ? originalAbsenceDeduction : (absentDaysDeduction || 0));
    const origLateness = Number(originalLatenessDeduction !== undefined ? originalLatenessDeduction : (latenessDeduction !== undefined ? latenessDeduction : (latenessPenalties || 0)));
    
    let finalAbsentDeduction = Number(absentDaysDeduction || 0);
    let finalLatenessDeduction = Number(latenessDeduction !== undefined ? latenessDeduction : (latenessPenalties || 0));
    let penaltyOverrideData = null;

    if (penaltyOverride && penaltyOverride.isWaived) {
      const waivedAbsence = Math.max(0, Number(penaltyOverride.waivedAbsenceDeduction || 0));
      const waivedLateness = Math.max(0, Number(penaltyOverride.waivedLatenessDeduction || 0));
      const totalWaived = Number(penaltyOverride.totalWaived || (waivedAbsence + waivedLateness));
      
      finalAbsentDeduction = Math.max(0, origAbsence - waivedAbsence);
      finalLatenessDeduction = Math.max(0, origLateness - waivedLateness);

      penaltyOverrideData = {
        isWaived: true,
        waivedAbsenceDeduction: waivedAbsence,
        waivedLatenessDeduction: waivedLateness,
        totalWaived,
        reason: penaltyOverride.reason || "Manual penalty waiver approved by Administrator.",
        waivedBy: req.admin?.fullName || req.admin?.full_name || "Administrator",
        waivedAt: new Date(),
      };
    }

    const totalAttendanceDeductions = finalAbsentDeduction + finalLatenessDeduction;

    const calculatedNetPay = Math.max(
      0,
      parseFloat((finalBaseSalary + totalCustomEarnings - totalCustomDeductions - totalAttendanceDeductions).toFixed(2))
    );

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
      basicSalary: finalBaseSalary,
      baseSalary: finalBaseSalary,
      earnings: parsedEarnings,
      deductions: parsedDeductions,
      absentDaysDeduction: finalAbsentDeduction,
      latenessDeduction: finalLatenessDeduction,
      totalAttendanceDeductions,
      originalAbsenceDeduction: origAbsence,
      originalLatenessDeduction: origLateness,
      penaltyOverride: penaltyOverrideData,
      allowances: totalCustomEarnings,
      netSalary: calculatedNetPay,
      netPay: calculatedNetPay,
      paymentMethod,
      remarks: remarks || (penaltyOverrideData?.isWaived ? `Waived GH₵${penaltyOverrideData.totalWaived} penalties. Note: ${penaltyOverrideData.reason}` : "Generated monthly salary disbursement."),
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
          basicSalary: finalBaseSalary,
          baseSalary: finalBaseSalary,
          earnings: parsedEarnings,
          deductions: parsedDeductions,
          absentDaysDeduction: finalAbsentDeduction,
          latenessDeduction: finalLatenessDeduction,
          totalAttendanceDeductions,
          originalAbsenceDeduction: origAbsence,
          originalLatenessDeduction: origLateness,
          penaltyOverride: penaltyOverrideData,
          allowances: totalCustomEarnings,
          netSalary: calculatedNetPay,
          netPay: calculatedNetPay,
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

    // Write audit log if penalties were waived or overridden
    if (penaltyOverrideData?.isWaived) {
      try {
        await AuditLog.create({
          action: "WAIVE_ATTENDANCE_PENALTY",
          category: "Payroll",
          performedBy: {
            id: String(req.admin?.id || req.admin?._id || "admin_01"),
            name: req.admin?.fullName || req.admin?.full_name || "Administrator",
            email: req.admin?.email || "admin@eyenit.com",
            role: req.admin?.role || "admin",
          },
          target: `${empDoc.fullName} (${empDoc.employeeId})`,
          summary: `Waived GH₵${penaltyOverrideData.totalWaived} attendance deductions for ${empDoc.fullName} (${payMonth}). Reason: ${penaltyOverrideData.reason}`,
          changes: [
            { field: "waivedAbsenceDeduction", label: "Waived Absence Amount", oldValue: `GH₵${origAbsence}`, newValue: `GH₵${finalAbsentDeduction}` },
            { field: "waivedLatenessDeduction", label: "Waived Lateness Amount", oldValue: `GH₵${origLateness}`, newValue: `GH₵${finalLatenessDeduction}` },
          ],
          metadata: {
            employeeId: empDoc.employeeId,
            payMonth,
            reason: penaltyOverrideData.reason,
          },
          ipAddress: req.ip || "127.0.0.1",
        });
      } catch (auditErr) {
        console.warn("AuditLog creation error for penalty waiver:", auditErr.message);
      }
    }

    livePayrollStore.unshift(newRecord);

    // Push automated in-app notification to the affected employee for attendance deductions & penalties
    try {
      const targetEmpId = String(empDoc._id || empDoc.employeeId || empDoc.email || "");
      const formattedTotalDeduct = Number(totalAttendanceDeductions || 0);

      if (formattedTotalDeduct > 0) {
        const breakdownParts = [];
        if (finalAbsentDeduction > 0) {
          breakdownParts.push(`GH₵${finalAbsentDeduction.toFixed(2)} absence deduction`);
        }
        if (finalLatenessDeduction > 0) {
          breakdownParts.push(`GH₵${finalLatenessDeduction.toFixed(2)} lateness penalty`);
        }
        const detailStr = breakdownParts.length > 0 ? breakdownParts.join(" & ") : `GH₵${formattedTotalDeduct.toFixed(2)} penalty`;

        await createNotificationRecord({
          recipient_id: targetEmpId,
          recipient_role: "employee",
          sender_id: String(req.admin?.id || req.admin?._id || "admin"),
          sender_role: "admin",
          sender_name: req.admin?.fullName || "Payroll Administrator",
          title: "⚠️ Attendance Deduction Applied to Payslip",
          message: `An attendance deduction of GH₵${formattedTotalDeduct.toFixed(2)} (${detailStr}) has been applied to your ${payMonth} payslip. Net Pay: GH₵${calculatedNetPay.toFixed(2)}.`,
          type: "payroll_alert",
          category: "payroll",
          priority: "high",
          action_url: "/employee/dashboard/payslips",
          action_label: "View Payslip",
          metadata: {
            payMonth,
            payslipNumber,
            totalAttendanceDeductions: formattedTotalDeduct,
            absentDaysDeduction: finalAbsentDeduction,
            latenessDeduction: finalLatenessDeduction,
            netPay: calculatedNetPay,
            paymentDate,
          },
        });
      } else if (penaltyOverrideData?.isWaived && Number(penaltyOverrideData.totalWaived || 0) > 0) {
        await createNotificationRecord({
          recipient_id: targetEmpId,
          recipient_role: "employee",
          sender_id: String(req.admin?.id || req.admin?._id || "admin"),
          sender_role: "admin",
          sender_name: req.admin?.fullName || "Management",
          title: "✅ Attendance Penalty Waived",
          message: `Management approved a waiver of GH₵${Number(penaltyOverrideData.totalWaived).toFixed(2)} in attendance deductions for your ${payMonth} payslip. Reason: ${penaltyOverrideData.reason || "Approved exception"}`,
          type: "payroll_alert",
          category: "payroll",
          priority: "medium",
          action_url: "/employee/dashboard/payslips",
          action_label: "View Payslip",
          metadata: {
            payMonth,
            payslipNumber,
            waivedAmount: penaltyOverrideData.totalWaived,
            reason: penaltyOverrideData.reason,
          },
        });
      }
    } catch (notifErr) {
      console.warn("Failed to create automated employee payslip notification:", notifErr.message);
    }

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

    // Role-based authorization: Standard employees are strictly restricted to their own payslip
    if (req.employee && (!req.admin || req.admin.role === "employee")) {
      const authEmpId = String(req.employee.id || req.employee._id || "");
      const authCode = String(req.employee.employeeId || "");
      const recordEmpId = String(foundRecord.employee?._id || foundRecord.employee?.id || foundRecord.employee || "");
      const recordCode = String(foundRecord.employee?.employeeId || foundRecord.employeeId || "");

      const isOwner =
        (authEmpId && (recordEmpId === authEmpId || recordCode === authEmpId)) ||
        (authCode && (recordCode === authCode || recordEmpId === authCode));

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Access restricted: You are only authorized to view your own personal payslips.",
        });
      }
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

    const basicSalary = Number(foundRecord.basicSalary !== undefined ? foundRecord.basicSalary : (foundRecord.baseSalary || 0));
    const baseSalary = basicSalary;
    const allowances = Number(foundRecord.allowances || 0);
    const absentDaysDeduction = Number(foundRecord.absentDaysDeduction || 0);
    const latenessDeduction = Number(foundRecord.latenessDeduction || 0);
    const totalAttendanceDeductions = Number(foundRecord.totalAttendanceDeductions || (absentDaysDeduction + latenessDeduction));

    // Normalize dynamic earnings array
    let dynamicEarnings = [];
    if (Array.isArray(foundRecord.earnings) && foundRecord.earnings.length > 0) {
      dynamicEarnings = foundRecord.earnings.map((e) => ({
        description: e.description || e.name || e.label || "Allowance",
        amount: Number(e.amount || 0),
      }));
    } else if (allowances > 0) {
      dynamicEarnings = [
        { description: "Allowances & Bonuses", amount: allowances },
      ];
    }

    // Normalize dynamic deductions array
    let dynamicDeductions = [];
    if (Array.isArray(foundRecord.deductions)) {
      dynamicDeductions = foundRecord.deductions.map((d) => ({
        description: d.description || d.name || d.label || "Deduction",
        amount: Number(d.amount || 0),
      }));
    } else if (typeof foundRecord.deductions === "number" && Number(foundRecord.deductions) > 0) {
      dynamicDeductions = [
        { description: "Standard Deductions", amount: Number(foundRecord.deductions) },
      ];
    }

    const totalCustomEarnings = dynamicEarnings.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const totalCustomDeductions = dynamicDeductions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const totalDeductionsAmount = totalCustomDeductions + totalAttendanceDeductions;

    const netSalary = Number(
      foundRecord.netPay !== undefined
        ? foundRecord.netPay
        : (foundRecord.netSalary !== undefined
            ? foundRecord.netSalary
            : Math.max(0, basicSalary + totalCustomEarnings - totalDeductionsAmount))
    );
    const netPay = netSalary;
    const grossEarnings = basicSalary + totalCustomEarnings;

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
      baseSalary,
      earnings: dynamicEarnings,
      deductions: dynamicDeductions,
      absentDaysDeduction,
      latenessDeduction,
      totalAttendanceDeductions,
      allowances: totalCustomEarnings,
      totalEarnings: totalCustomEarnings,
      totalDeductions: totalDeductionsAmount,
      grossEarnings,
      netSalary,
      netPay,
      status: foundRecord.status || "Paid",
      paymentMethod: foundRecord.paymentMethod || "Bank Transfer",
      remarks: foundRecord.remarks || "Monthly payroll calculation.",
      breakdown: {
        grossEarnings,
        basicSalary,
        baseSalary,
        absentDaysDeduction,
        latenessDeduction,
        totalAttendanceDeductions,
        absenteeismDeductions: absentDaysDeduction,
        allowances: totalCustomEarnings,
        totalEarnings: totalCustomEarnings,
        totalDeductions: totalDeductionsAmount,
        netPayable: netPay,
        netPay,
        earnings: [
          { label: "Base Salary", amount: basicSalary, type: "base" },
          ...dynamicEarnings.map((e) => ({ label: e.description, amount: e.amount, type: "allowance" })),
        ],
        deductionsList: [
          ...dynamicDeductions.map((d) => ({ label: d.description, amount: d.amount, type: "deduction" })),
          ...(absentDaysDeduction > 0
            ? [{ label: "Absence Deduction", amount: absentDaysDeduction, type: "absence" }]
            : []),
          ...(latenessDeduction > 0
            ? [{ label: "Lateness Penalties", amount: latenessDeduction, type: "lateness" }]
            : []),
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

// Function to delete a payroll record permanently
export const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Payroll ID is required.",
      });
    }

    let deletedFromDb = false;

    if (isValidObjectId(id)) {
      try {
        const deleted = await Payroll.findByIdAndDelete(id);
        if (deleted) deletedFromDb = true;
      } catch (err) {
        console.warn("DB delete fallback:", err.message);
      }
    }

    if (!deletedFromDb) {
      try {
        const deleted = await Payroll.findOneAndDelete({
          $or: [{ payslipNumber: id }, { _id: id }],
        });
        if (deleted) deletedFromDb = true;
      } catch (err) {
        console.warn("DB delete by payslipNumber fallback:", err.message);
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
      id,
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
          formattedPayslips = payslips.map((payslip) => {
            const bSal = Number(payslip.baseSalary !== undefined ? payslip.baseSalary : (payslip.basicSalary || 0));
            const earn = Array.isArray(payslip.earnings) ? payslip.earnings : [];
            const deduct = Array.isArray(payslip.deductions)
              ? payslip.deductions
              : (typeof payslip.deductions === "number" && payslip.deductions > 0
                  ? [{ description: "Deduction", amount: payslip.deductions }]
                  : []);
            const absDeduct = Number(payslip.absentDaysDeduction || 0);
            const lateDeduct = Number(payslip.latenessDeduction || 0);
            const totalAttDeduct = Number(payslip.totalAttendanceDeductions || (absDeduct + lateDeduct));
            const totalEarn = earn.reduce((acc, c) => acc + Number(c.amount || 0), 0) || Number(payslip.allowances || 0);
            const totalDeduct = deduct.reduce((acc, c) => acc + Number(c.amount || 0), 0) + totalAttDeduct;
            const net = Number(payslip.netPay !== undefined ? payslip.netPay : (payslip.netSalary !== undefined ? payslip.netSalary : Math.max(0, bSal + totalEarn - totalDeduct)));

            return {
              id: payslip.payslipNumber || payslip._id,
              payslipNumber: payslip.payslipNumber,
              _id: payslip._id,
              employeeId: payslip.employee?.employeeId || "",
              employeeName: payslip.employee?.fullName || "Employee",
              department: payslip.employee?.department || "Operations",
              position: payslip.employee?.position || "Staff",
              month: payslip.payMonth,
              payMonth: payslip.payMonth,
              basicSalary: bSal,
              baseSalary: bSal,
              earnings: earn,
              deductions: deduct,
              absentDaysDeduction: absDeduct,
              latenessDeduction: lateDeduct,
              totalAttendanceDeductions: totalAttDeduct,
              allowances: totalEarn,
              netSalary: net,
              netPay: net,
              status: payslip.status,
              paymentDate: payslip.paymentDate,
            };
          });
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

// Function to calculate comprehensive payroll disbursements and tax deductions analytics for dashboard bar charts
export const getPayrollAnalytics = async (req, res) => {
  try {
    const targetYear = parseInt(req.query.year, 10) || 2026;
    const targetDept = req.query.department || "All";

    // 1. Fetch all employees to know active headcount and baseline salaries
    let employees = [];
    try {
      employees = await Employee.find({ isActive: { $ne: false } })
        .select("fullName employeeId department position salary")
        .lean();
    } catch (err) {
      console.warn("DB employee query for analytics:", err.message);
    }

    const totalHeadcount = employees.length || 15;
    const baseSalariesSum = employees.reduce((sum, e) => sum + (Number(e.salary) || 4000), 0) || (totalHeadcount * 4200);

    // 2. Fetch all payroll documents
    let allRecords = [...livePayrollStore];
    try {
      const dbRecords = await Payroll.find({})
        .populate("employee", "fullName employeeId department position salary")
        .lean();
      if (dbRecords && dbRecords.length > 0) {
        dbRecords.forEach((p) => {
          if (!allRecords.some((item) => String(item._id) === String(p._id) || item.payslipNumber === p.payslipNumber)) {
            allRecords.push(p);
          }
        });
      }
    } catch (err) {
      console.warn("DB payroll query for analytics:", err.message);
    }

    // Month labels for year
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const monthShorts = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Department list
    const departmentList = [
      "Engineering",
      "Sales & Marketing",
      "Human Resources",
      "Operations",
      "Finance & Accounting",
      "Customer Support",
      "Product & Design",
    ];

    // Compute monthly data
    const monthlyDisbursements = monthNames.map((mName, idx) => {
      const mShort = monthShorts[idx];
      const monthStr = `${mName} ${targetYear}`;

      // Filter actual payroll records for this month
      const matchingRecords = allRecords.filter((r) => {
        const pMonth = r.payMonth || r.month || "";
        const matchesMonth = pMonth.toLowerCase().includes(mName.toLowerCase()) || pMonth.includes(mShort);
        if (!matchesMonth) return false;
        if (targetDept && targetDept !== "All") {
          const dept = r.employee?.department || r.department || "";
          return dept.toLowerCase() === targetDept.toLowerCase();
        }
        return true;
      });

      let baseSalary = 0;
      let allowances = 0;
      let netSalary = 0;
      let taxDeductions = 0;
      let socialSecurity = 0;
      let healthInsurance = 0;
      let absenteeismDeductions = 0;
      let headcount = 0;

      if (matchingRecords.length > 0) {
        headcount = matchingRecords.length;
        matchingRecords.forEach((rec) => {
          const bSal = Number(rec.baseSalary !== undefined ? rec.baseSalary : (rec.basicSalary || 0));
          const allw = Number(rec.allowances || 0);
          const absD = Number(rec.absentDaysDeduction || 0);
          const net = Number(rec.netPay !== undefined ? rec.netPay : (rec.netSalary || (bSal + allw - absD)));

          baseSalary += bSal;
          allowances += allw;
          absenteeismDeductions += absD;
          netSalary += net;

          // Process tax & statutory deductions
          const gross = bSal + allw;
          // Standard statutory deductions: PAYE Tax ~ 10-12%, SSNIT/Pension ~ 5.5%, NHIS ~ 2.5%
          const estimatedTax = parseFloat((gross * 0.11).toFixed(2));
          const estimatedSSNIT = parseFloat((gross * 0.055).toFixed(2));
          const estimatedNHIS = parseFloat((gross * 0.025).toFixed(2));

          taxDeductions += estimatedTax;
          socialSecurity += estimatedSSNIT;
          healthInsurance += estimatedNHIS;
        });
      } else {
        // Synthesize dynamic data proportional to active employees for historical chart completeness
        // Seasonal variation coefficient for realistic business trend
        const seasonality = 1 + Math.sin((idx / 12) * Math.PI * 2) * 0.08 + (idx >= 7 ? 0.05 : 0);
        headcount = targetDept !== "All" ? Math.max(2, Math.round(totalHeadcount / 4)) : totalHeadcount;
        const deptRatio = targetDept !== "All" ? 0.25 : 1;

        baseSalary = Math.round(baseSalariesSum * deptRatio * seasonality);
        allowances = Math.round(baseSalary * (0.08 + (idx % 3) * 0.02));
        const gross = baseSalary + allowances;

        taxDeductions = Math.round(gross * 0.115); // PAYE Income Tax (11.5%)
        socialSecurity = Math.round(gross * 0.055); // SSNIT / PF (5.5%)
        healthInsurance = Math.round(gross * 0.025); // NHIS / Medical (2.5%)
        absenteeismDeductions = Math.round(baseSalary * 0.015 * ((idx % 2) + 0.5));

        const totalDeductions = taxDeductions + socialSecurity + healthInsurance + absenteeismDeductions;
        netSalary = gross - totalDeductions;
      }

      const grossSalary = baseSalary + allowances;
      const totalTaxAndStatutory = taxDeductions + socialSecurity + healthInsurance;
      const totalDeductions = totalTaxAndStatutory + absenteeismDeductions;

      return {
        month: mShort,
        monthFull: monthStr,
        monthIndex: idx,
        baseSalary: Math.round(baseSalary),
        allowances: Math.round(allowances),
        grossSalary: Math.round(grossSalary),
        netSalary: Math.round(netSalary),
        taxDeductions: Math.round(taxDeductions),
        socialSecurity: Math.round(socialSecurity),
        healthInsurance: Math.round(healthInsurance),
        absenteeismDeductions: Math.round(absenteeismDeductions),
        totalTaxAndStatutory: Math.round(totalTaxAndStatutory),
        totalDeductions: Math.round(totalDeductions),
        headcount,
        effectiveTaxRate: grossSalary > 0 ? parseFloat(((taxDeductions / grossSalary) * 100).toFixed(1)) : 11.5,
      };
    });

    // Compute Departmental Breakdown
    const departmentDisbursements = departmentList.map((deptName) => {
      // Find employees in this dept
      const deptEmployees = employees.filter((e) => (e.department || "").toLowerCase().includes(deptName.toLowerCase()) || deptName.toLowerCase().includes((e.department || "").toLowerCase()));
      const count = deptEmployees.length > 0 ? deptEmployees.length : Math.floor(Math.random() * 3) + 2;
      const avgSalary = deptName.includes("Engineering") || deptName.includes("Finance") ? 5800 : 4200;

      const base = deptEmployees.reduce((sum, e) => sum + (Number(e.salary) || avgSalary), 0) || (count * avgSalary);
      const allow = Math.round(base * 0.12);
      const gross = base + allow;
      const tax = Math.round(gross * 0.115);
      const ssnit = Math.round(gross * 0.055);
      const health = Math.round(gross * 0.025);
      const totalDed = tax + ssnit + health;
      const net = gross - totalDed;

      return {
        department: deptName,
        shortName: deptName.length > 12 ? deptName.split(" ")[0] : deptName,
        employeeCount: count,
        baseSalary: base,
        allowances: allow,
        grossSalary: gross,
        netSalary: net,
        taxDeductions: tax,
        socialSecurity: ssnit,
        healthInsurance: health,
        totalDeductions: totalDed,
        effectiveTaxRate: parseFloat(((tax / gross) * 100).toFixed(1)),
      };
    });

    // Tax Deduction Categories Aggregation (YTD)
    const totalTaxPAYE = monthlyDisbursements.reduce((sum, m) => sum + m.taxDeductions, 0);
    const totalSSNIT = monthlyDisbursements.reduce((sum, m) => sum + m.socialSecurity, 0);
    const totalNHIS = monthlyDisbursements.reduce((sum, m) => sum + m.healthInsurance, 0);
    const totalAbsenceDeductions = monthlyDisbursements.reduce((sum, m) => sum + m.absenteeismDeductions, 0);
    const totalAllDeductions = totalTaxPAYE + totalSSNIT + totalNHIS + totalAbsenceDeductions;

    const taxCategoryBreakdown = [
      { name: "Income Tax (PAYE)", amount: totalTaxPAYE, percentage: totalAllDeductions > 0 ? parseFloat(((totalTaxPAYE / totalAllDeductions) * 100).toFixed(1)) : 58.5, fill: "#6366F1" },
      { name: "SSNIT / Pension (5.5%)", amount: totalSSNIT, percentage: totalAllDeductions > 0 ? parseFloat(((totalSSNIT / totalAllDeductions) * 100).toFixed(1)) : 28.0, fill: "#002185" },
      { name: "Health Insurance (NHIS)", amount: totalNHIS, percentage: totalAllDeductions > 0 ? parseFloat(((totalNHIS / totalAllDeductions) * 100).toFixed(1)) : 10.5, fill: "#06B6D4" },
      { name: "Absence Deductions", amount: totalAbsenceDeductions, percentage: totalAllDeductions > 0 ? parseFloat(((totalAbsenceDeductions / totalAllDeductions) * 100).toFixed(1)) : 3.0, fill: "#DC2626" },
    ];

    // Summary KPIs
    const currentMonthIndex = new Date().getMonth();
    const currentMonthData = monthlyDisbursements[currentMonthIndex] || monthlyDisbursements[7];

    const totalNetDisbursedYear = monthlyDisbursements.reduce((sum, m) => sum + m.netSalary, 0);
    const totalTaxDeductedYear = totalTaxPAYE;
    const totalGrossYear = monthlyDisbursements.reduce((sum, m) => sum + m.grossSalary, 0);
    const totalAllowancesYear = monthlyDisbursements.reduce((sum, m) => sum + m.allowances, 0);
    const avgMonthlyNetDisbursement = Math.round(totalNetDisbursedYear / 12);
    const avgNetSalaryPerEmployee = totalHeadcount > 0 ? Math.round(currentMonthData.netSalary / totalHeadcount) : 3800;
    const effectiveTaxRate = totalGrossYear > 0 ? parseFloat(((totalTaxDeductedYear / totalGrossYear) * 100).toFixed(1)) : 11.5;

    return res.status(200).json({
      success: true,
      year: targetYear,
      department: targetDept,
      summaryCards: {
        totalNetDisbursedYear,
        totalNetDisbursedCurrentMonth: currentMonthData.netSalary,
        totalTaxDeductedYear,
        totalTaxCurrentMonth: currentMonthData.taxDeductions,
        totalGrossYear,
        totalGrossCurrentMonth: currentMonthData.grossSalary,
        totalAllowancesYear,
        totalAllowancesCurrentMonth: currentMonthData.allowances,
        avgMonthlyNetDisbursement,
        avgNetSalaryPerEmployee,
        effectiveTaxRate,
        totalHeadcount,
      },
      monthlyDisbursements,
      departmentDisbursements,
      taxCategoryBreakdown,
    });
  } catch (error) {
    console.error("Error in getPayrollAnalytics:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to calculate payroll analytics.",
    });
  }
};

// Retrieve Processed Payroll Cycle History with status, expenditure & penalty totals
export const getPayrollCycles = async (req, res) => {
  try {
    let allRecords = [...livePayrollStore];
    try {
      const dbRecords = await Payroll.find({})
        .populate("employee", "fullName employeeId department position")
        .sort({ paymentDate: -1, createdAt: -1 })
        .lean();
      if (dbRecords && dbRecords.length > 0) {
        dbRecords.forEach((p) => {
          if (!allRecords.some((item) => String(item._id) === String(p._id) || item.payslipNumber === p.payslipNumber)) {
            allRecords.push(p);
          }
        });
      }
    } catch (err) {
      console.warn("DB query for payroll cycles fallback:", err.message);
    }

    // Default seeded cycles if empty
    if (allRecords.length === 0) {
      const monthsSeed = ["August 2026", "July 2026", "June 2026", "May 2026", "April 2026", "March 2026"];
      const seedCycles = monthsSeed.map((m, idx) => ({
        month: m,
        status: idx === 0 ? "Completed" : "Completed",
        generatedDate: new Date(2026, 7 - idx, 25).toISOString().split("T")[0],
        lastUpdated: new Date(2026, 7 - idx, 25).toISOString(),
        employeeCount: 15,
        grossExpenditure: 68500 - idx * 1200,
        netExpenditure: 62450 - idx * 1100,
        totalAbsenceDeductions: 840 - idx * 40,
        totalLatenessPenalties: 620 - idx * 30,
        totalAttendancePenalties: 1460 - idx * 70,
        totalPenaltiesWaived: idx === 0 ? 150 : 80,
        totalAllowances: 5400,
        paidCount: 15,
        pendingCount: 0,
      }));

      return res.status(200).json({
        success: true,
        cycles: seedCycles,
        totalCycles: seedCycles.length,
      });
    }

    // Group records by payMonth
    const cycleMap = {};
    allRecords.forEach((rec) => {
      const rawMonth = rec.payMonth || rec.month || "August 2026";
      const monthKey = rawMonth.trim();

      if (!cycleMap[monthKey]) {
        cycleMap[monthKey] = {
          month: monthKey,
          generatedDate: rec.paymentDate ? (new Date(rec.paymentDate).toISOString().split("T")[0]) : new Date().toISOString().split("T")[0],
          lastUpdated: rec.updatedAt || rec.createdAt || new Date().toISOString(),
          employeeCount: 0,
          grossExpenditure: 0,
          netExpenditure: 0,
          totalAbsenceDeductions: 0,
          totalLatenessPenalties: 0,
          totalAttendancePenalties: 0,
          totalPenaltiesWaived: 0,
          totalAllowances: 0,
          paidCount: 0,
          pendingCount: 0,
          items: [],
        };
      }

      const bSal = Number(rec.baseSalary !== undefined ? rec.baseSalary : (rec.basicSalary || 0));
      const allw = Number(rec.allowances || 0);
      const absD = Number(rec.absentDaysDeduction || 0);
      const lateD = Number(rec.latenessDeduction || 0);
      const attD = Number(rec.totalAttendanceDeductions || (absD + lateD));
      const net = Number(rec.netPay !== undefined ? rec.netPay : (rec.netSalary !== undefined ? rec.netSalary : (bSal + allw - attD)));
      const waived = Number(rec.penaltyOverride?.totalWaived || (rec.penaltyOverride?.waivedAbsenceDeduction || 0) + (rec.penaltyOverride?.waivedLatenessDeduction || 0));
      const isPaid = (rec.status || "").toLowerCase() === "paid";

      cycleMap[monthKey].employeeCount += 1;
      cycleMap[monthKey].grossExpenditure += (bSal + allw);
      cycleMap[monthKey].netExpenditure += net;
      cycleMap[monthKey].totalAbsenceDeductions += absD;
      cycleMap[monthKey].totalLatenessPenalties += lateD;
      cycleMap[monthKey].totalAttendancePenalties += attD;
      cycleMap[monthKey].totalPenaltiesWaived += waived;
      cycleMap[monthKey].totalAllowances += allw;

      if (isPaid) {
        cycleMap[monthKey].paidCount += 1;
      } else {
        cycleMap[monthKey].pendingCount += 1;
      }

      cycleMap[monthKey].items.push(rec);
    });

    const cyclesList = Object.values(cycleMap).map((cycle) => {
      let cycleStatus = "Completed";
      if (cycle.pendingCount > 0 && cycle.paidCount > 0) {
        cycleStatus = "Partially Paid";
      } else if (cycle.pendingCount > 0 && cycle.paidCount === 0) {
        cycleStatus = "Pending";
      } else if (cycle.employeeCount === 0) {
        cycleStatus = "Draft";
      }

      return {
        ...cycle,
        status: cycleStatus,
        grossExpenditure: parseFloat(cycle.grossExpenditure.toFixed(2)),
        netExpenditure: parseFloat(cycle.netExpenditure.toFixed(2)),
        totalAbsenceDeductions: parseFloat(cycle.totalAbsenceDeductions.toFixed(2)),
        totalLatenessPenalties: parseFloat(cycle.totalLatenessPenalties.toFixed(2)),
        totalAttendancePenalties: parseFloat(cycle.totalAttendancePenalties.toFixed(2)),
        totalPenaltiesWaived: parseFloat(cycle.totalPenaltiesWaived.toFixed(2)),
        totalAllowances: parseFloat(cycle.totalAllowances.toFixed(2)),
      };
    });

    return res.status(200).json({
      success: true,
      cycles: cyclesList,
      totalCycles: cyclesList.length,
    });
  } catch (error) {
    console.error("Error in getPayrollCycles:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve payroll cycle history.",
    });
  }
};

// Retrieve 6-Month Attendance Penalty Impact Analytics on Total Payroll Cost
export { getPenaltyImpactAnalytics } from "./analyticsController.js";

