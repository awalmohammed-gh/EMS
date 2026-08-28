import mongoose from "mongoose";
import { Payroll } from "../models/payrollModel.js";
import { Attendance } from "../models/attendanceModel.js";
import { Employee } from "../models/employeeModel.js";
import { CompanySettings } from "../models/CompanySettings.js";
import { evaluateLatenessPenalty } from "./payrollController.js";

/**
 * Controller for Attendance Penalties & Payroll Cost Impact Analytics
 * Aggregates live data across the last 6 rolling months from MongoDB.
 */
export const getPenaltyImpactAnalytics = async (req, res) => {
  try {
    // 1. Establish the 6 rolling months timeline
    const now = new Date();
    // Default reference date (or current date)
    const refDate = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthNamesFull = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const mShort = monthNamesShort[mIdx];
      const mFull = `${monthNamesFull[mIdx]} ${yr}`;
      const yyyyMm = `${yr}-${String(mIdx + 1).padStart(2, "0")}`;

      months.push({
        year: yr,
        monthIndex: mIdx,
        short: mShort,
        full: mFull,
        key: yyyyMm,
      });
    }

    // 2. Fetch company penalty settings from DB
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
      const settingsDoc = await CompanySettings.findOne().lean();
      if (settingsDoc) {
        companySettings = { ...companySettings, ...settingsDoc };
      }
    } catch (err) {
      console.warn("Could not fetch company settings for analytics:", err.message);
    }

    // 3. Fetch all active employees for base salary calculation if payroll not yet run
    let activeEmployees = [];
    try {
      activeEmployees = await Employee.find({ isActive: { $ne: false } }).lean();
    } catch (err) {
      console.warn("Could not fetch employees for analytics:", err.message);
    }

    // 4. Fetch all payroll records from DB
    let payrollRecords = [];
    try {
      payrollRecords = await Payroll.find({})
        .populate("employee", "fullName employeeId department position salary basicSalary baseSalary")
        .lean();
    } catch (err) {
      console.warn("Could not query payroll collection:", err.message);
    }

    // 5. Fetch attendance records covering the 6 months period
    const startPeriodKey = months[0].key;
    let attendanceRecords = [];
    try {
      attendanceRecords = await Attendance.find({
        date: { $gte: `${startPeriodKey}-01` }
      })
      .populate("employee", "fullName employeeId department salary basicSalary baseSalary")
      .lean();
    } catch (err) {
      console.warn("Could not query attendance collection:", err.message);
    }

    // 6. Aggregate metrics dynamically for each of the 6 rolling months
    const monthlySeries = months.map((m) => {
      // Find matching payroll records for this month
      const matchingPayrolls = payrollRecords.filter((p) => {
        const pMonth = (p.payMonth || "").toLowerCase().trim();
        const matchesName = pMonth.includes(m.short.toLowerCase()) || pMonth.includes(monthNamesFull[m.monthIndex].toLowerCase());
        const matchesYear = pMonth.includes(String(m.year));
        if (matchesName && (matchesYear || payrollRecords.length <= 20)) return true;

        if (p.paymentDate) {
          const pd = new Date(p.paymentDate);
          if (pd.getFullYear() === m.year && pd.getMonth() === m.monthIndex) return true;
        }
        return false;
      });

      // Find matching attendance records for this month (date format YYYY-MM-DD)
      const matchingAttendance = attendanceRecords.filter((a) => {
        return a.date && a.date.startsWith(m.key);
      });

      let absenceDeductions = 0;
      let latenessPenalties = 0;
      let penaltiesWaived = 0;
      let grossPayroll = 0;
      let headcount = 0;

      if (matchingPayrolls.length > 0) {
        // Compute from payroll records generated for that month
        headcount = matchingPayrolls.length;
        matchingPayrolls.forEach((rec) => {
          const bSal = Number(rec.baseSalary !== undefined ? rec.baseSalary : (rec.basicSalary || rec.employee?.salary || 0));
          const allw = Number(rec.allowances || 0);
          const absD = Number(rec.absentDaysDeduction || 0);
          const lateD = Number(rec.latenessDeduction || 0);
          const waived = Number(
            rec.penaltyOverride?.totalWaived ||
            (Number(rec.penaltyOverride?.waivedAbsenceDeduction || 0) + Number(rec.penaltyOverride?.waivedLatenessDeduction || 0)) ||
            0
          );

          grossPayroll += (bSal + allw);
          absenceDeductions += absD;
          latenessPenalties += lateD;
          penaltiesWaived += waived;
        });
      } else if (matchingAttendance.length > 0) {
        // Fallback to real attendance records if payroll has not been disbursed for this month yet
        const uniqueEmpMap = new Map();

        matchingAttendance.forEach((att) => {
          const empId = String(att.employee?._id || att.employee || "");
          if (empId) uniqueEmpMap.set(empId, true);

          const status = (att.status || "").toLowerCase();
          if (status === "absent") {
            absenceDeductions += Number(companySettings.absenceDeductionRate || 10);
          } else if (status === "late" || att.clockIn) {
            const evalRes = evaluateLatenessPenalty(
              att.clockIn,
              companySettings.workStartTime || "08:00",
              companySettings
            );
            if (evalRes.penalty > 0) {
              latenessPenalties += evalRes.penalty;
            }
          }
        });

        headcount = uniqueEmpMap.size || activeEmployees.length;
        const totalBase = activeEmployees.reduce((sum, e) => sum + (Number(e.salary || e.basicSalary || e.baseSalary || 0)), 0);
        grossPayroll = totalBase > 0 ? totalBase : 0;
      } else {
        // Zero-state: Strictly 0 values when no records exist
        absenceDeductions = 0;
        latenessPenalties = 0;
        penaltiesWaived = 0;
        grossPayroll = 0;
        headcount = 0;
      }

      // Calculate Net Penalties and Net Payroll
      const grossPenalties = absenceDeductions + latenessPenalties;
      const totalNetPenalties = Math.max(0, grossPenalties - penaltiesWaived);
      const netPayroll = Math.max(0, grossPayroll - totalNetPenalties);
      const penaltyImpactPercentage = grossPayroll > 0 
        ? parseFloat(((totalNetPenalties / grossPayroll) * 100).toFixed(2)) 
        : 0;

      return {
        month: m.short,
        monthFull: m.full,
        absenceDeductions: Math.round(absenceDeductions),
        latenessPenalties: Math.round(latenessPenalties),
        penaltiesWaived: Math.round(penaltiesWaived),
        totalNetPenalties: Math.round(totalNetPenalties),
        // Aliases for component backwards-compatibility
        absencePenalties: Math.round(absenceDeductions),
        totalPenalties: Math.round(totalNetPenalties),
        grossPayroll: Math.round(grossPayroll),
        netPayroll: Math.round(netPayroll),
        penaltyImpactPercentage,
        headcount,
      };
    });

    // 7. Aggregate KPI Card Totals across 6 months
    const totalAbsenceDeductions = monthlySeries.reduce((sum, m) => sum + m.absenceDeductions, 0);
    const totalLatenessPenalties = monthlySeries.reduce((sum, m) => sum + m.latenessPenalties, 0);
    const totalPenaltiesWaived = monthlySeries.reduce((sum, m) => sum + m.penaltiesWaived, 0);
    const totalNetPenalties = monthlySeries.reduce((sum, m) => sum + m.totalNetPenalties, 0);
    const totalGrossPayroll = monthlySeries.reduce((sum, m) => sum + m.grossPayroll, 0);

    const avgPenaltyImpactRate = totalGrossPayroll > 0
      ? parseFloat(((totalNetPenalties / totalGrossPayroll) * 100).toFixed(2))
      : 0;

    const summary = {
      totalPenalties6Mo: totalNetPenalties,
      totalNetPenalties6Mo: totalNetPenalties,
      totalAbsencePenalties6Mo: totalAbsenceDeductions,
      totalAbsenceDeductions: totalAbsenceDeductions,
      totalLatenessPenalties6Mo: totalLatenessPenalties,
      totalLatenessPenalties: totalLatenessPenalties,
      totalWaived6Mo: totalPenaltiesWaived,
      totalPenaltiesWaived: totalPenaltiesWaived,
      totalGross6Mo: totalGrossPayroll,
      totalGrossPayroll: totalGrossPayroll,
      avgPenaltyImpactRate,
      hasLiveRecords: totalGrossPayroll > 0 || totalNetPenalties > 0,
    };

    return res.status(200).json({
      success: true,
      data: monthlySeries,
      summary,
    });
  } catch (error) {
    console.error("Error in getPenaltyImpactAnalytics controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to calculate live penalty impact analytics.",
    });
  }
};

export default {
  getPenaltyImpactAnalytics,
};
