import mongoose from "mongoose";
import { Payroll } from "../models/payrollModel.js";
import { Attendance } from "../models/attendanceModel.js";
import { Employee } from "../models/employeeModel.js";
import { CompanySettings } from "../models/CompanySettings.js";
import { evaluateLatenessPenalty } from "./payrollController.js";
import { logErrorToFile } from "../utils/logger.js";

/**
 * Controller for Attendance Penalties & Payroll Cost Impact Analytics
 * Aggregates live data across the last 6 rolling months directly from MongoDB.
 * Optimized with defensive aggregation pipelines and null-safety for zero-state empty databases.
 */
export const getPenaltyImpactAnalytics = async (req, res) => {
  try {
    // 1. Establish the exact 6 rolling months timeline (starting 5 months prior up to current month)
    const now = new Date();
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
        startDate: new Date(yr, mIdx, 1, 0, 0, 0, 0),
        endDate: new Date(yr, mIdx + 1, 0, 23, 59, 59, 999),
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
      console.warn("Could not fetch company settings for analytics:", err?.message || err);
    }

    const dailyAbsenceRate = Number(companySettings.absenceDeductionRate || 10);

    // 3. Fetch active employees headcount & baseline salary
    let activeEmployees = [];
    let totalActiveBaseSalary = 0;
    try {
      activeEmployees = await Employee.find({
        $or: [{ status: "active" }, { status: { $exists: false }, isActive: { $ne: false } }],
      }).lean() || [];

      totalActiveBaseSalary = activeEmployees.reduce((sum, e) => {
        const sal = Number(e?.salary !== undefined ? e.salary : (e?.basicSalary !== undefined ? e.basicSalary : (e?.baseSalary || 0)));
        return sum + (isNaN(sal) ? 0 : sal);
      }, 0);
    } catch (err) {
      console.warn("Could not fetch employees for analytics:", err?.message || err);
    }

    // 4. Perform efficient MongoDB aggregation on Payroll records grouped by month
    const startPeriodKey = months[0].key;
    const endPeriodKey = months[months.length - 1].key;

    let payrollAggregations = [];
    try {
      payrollAggregations = await Payroll.aggregate([
        {
          $project: {
            payMonth: { $ifNull: ["$payMonth", ""] },
            paymentDate: "$paymentDate",
            baseSalary: { $ifNull: ["$baseSalary", { $ifNull: ["$basicSalary", 0] }] },
            allowances: { $ifNull: ["$allowances", 0] },
            absentDaysDeduction: {
              $ifNull: [
                "$absentDaysDeduction",
                { $ifNull: ["$absenceDeductions", { $ifNull: ["$absenceDeductionDetails.totalAmount", 0] }] }
              ]
            },
            latenessDeduction: {
              $ifNull: [
                "$latenessDeduction",
                { $ifNull: ["$latenessPenalties", { $ifNull: ["$latenessDeductionDetails.totalAmount", 0] }] }
              ]
            },
            waivedTotal: {
              $ifNull: [
                "$penaltyOverride.totalWaived",
                {
                  $add: [
                    { $ifNull: ["$penaltyOverride.waivedAbsenceDeduction", 0] },
                    { $ifNull: ["$penaltyOverride.waivedLatenessDeduction", 0] }
                  ]
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: "$payMonth",
            headcount: { $sum: 1 },
            totalGross: { $sum: { $add: ["$baseSalary", "$allowances"] } },
            totalAbsence: { $sum: "$absentDaysDeduction" },
            totalLateness: { $sum: "$latenessDeduction" },
            totalWaived: { $sum: "$waivedTotal" },
            paymentDates: { $push: "$paymentDate" }
          }
        }
      ]) || [];
    } catch (err) {
      console.warn("Payroll aggregation query failed, will fallback gracefully:", err?.message || err);
      payrollAggregations = [];
    }

    // 5. Query attendance logs for 6-month window
    let attendanceRecords = [];
    try {
      attendanceRecords = await Attendance.find({
        date: { $gte: `${startPeriodKey}-01`, $lte: `${endPeriodKey}-31` },
      })
      .select("employee date status isExcused latePenalty clockIn")
      .lean() || [];
    } catch (err) {
      console.warn("Could not query attendance collection:", err?.message || err);
      attendanceRecords = [];
    }

    // Group attendance records by month key (YYYY-MM) in memory for O(1) monthly lookup
    const attendanceByMonth = new Map();
    for (const att of attendanceRecords) {
      if (!att || !att.date) continue;
      const monthPrefix = String(att.date).substring(0, 7);
      if (!attendanceByMonth.has(monthPrefix)) {
        attendanceByMonth.set(monthPrefix, []);
      }
      attendanceByMonth.get(monthPrefix).push(att);
    }

    // 6. Aggregate metrics dynamically for each of the 6 rolling months
    const monthlySeries = months.map((m) => {
      // Check for aggregated payroll entry matching month name or key
      const matchingPayrollAgg = payrollAggregations.find((p) => {
        if (!p || !p._id) return false;
        const pMonth = String(p._id).toLowerCase().trim();
        const matchesName = pMonth.includes(m.short.toLowerCase()) || pMonth.includes(monthNamesFull[m.monthIndex].toLowerCase());
        const matchesYear = pMonth.includes(String(m.year));
        if (matchesName && matchesYear) return true;

        if (p.paymentDates && Array.isArray(p.paymentDates)) {
          const matchedDate = p.paymentDates.some((pd) => {
            if (!pd) return false;
            const parsed = new Date(pd);
            return parsed.getFullYear() === m.year && parsed.getMonth() === m.monthIndex;
          });
          if (matchedDate) return true;
        }

        return matchesName;
      });

      const matchingAttendance = attendanceByMonth.get(m.key) || [];

      let absenceDeductions = 0;
      let latenessPenalties = 0;
      let penaltiesWaived = 0;
      let totalGrossPayroll = 0;
      let headcount = 0;

      if (matchingPayrollAgg && matchingPayrollAgg.headcount > 0) {
        headcount = matchingPayrollAgg.headcount || 0;
        totalGrossPayroll = Number(matchingPayrollAgg.totalGross || 0);
        absenceDeductions = Number(matchingPayrollAgg.totalAbsence || 0);
        latenessPenalties = Number(matchingPayrollAgg.totalLateness || 0);
        penaltiesWaived = Number(matchingPayrollAgg.totalWaived || 0);
      } else if (matchingAttendance.length > 0) {
        const uniqueEmpMap = new Map();

        for (const att of matchingAttendance) {
          if (!att) continue;
          const empId = String(att.employee?._id || att.employee || "");
          if (empId) uniqueEmpMap.set(empId, true);

          const status = String(att.status || "").toLowerCase();
          const isExcused = Boolean(att.isExcused);

          if (isExcused) {
            const excusedAmount = Number(att.latePenalty || 0) || (status === "absent" ? dailyAbsenceRate : 0);
            penaltiesWaived += (isNaN(excusedAmount) ? 0 : excusedAmount);
          } else {
            if (status === "absent") {
              absenceDeductions += dailyAbsenceRate;
            } else if (att.latePenalty && Number(att.latePenalty) > 0) {
              latenessPenalties += Number(att.latePenalty);
            } else if (att.clockIn) {
              const evalRes = evaluateLatenessPenalty(
                att.clockIn,
                companySettings.workStartTime || "08:00",
                companySettings
              );
              if (evalRes && evalRes.penalty > 0) {
                latenessPenalties += Number(evalRes.penalty);
              }
            }
          }
        }

        headcount = uniqueEmpMap.size || activeEmployees.length || 0;
        totalGrossPayroll = totalActiveBaseSalary > 0 ? totalActiveBaseSalary : 0;
      }

      // Safe bounds math
      absenceDeductions = Math.max(0, isNaN(absenceDeductions) ? 0 : absenceDeductions);
      latenessPenalties = Math.max(0, isNaN(latenessPenalties) ? 0 : latenessPenalties);
      penaltiesWaived = Math.max(0, isNaN(penaltiesWaived) ? 0 : penaltiesWaived);
      totalGrossPayroll = Math.max(0, isNaN(totalGrossPayroll) ? 0 : totalGrossPayroll);

      const grossPenalties = absenceDeductions + latenessPenalties;
      const netPenalties = Math.max(0, grossPenalties - penaltiesWaived);
      const netPayroll = Math.max(0, totalGrossPayroll - netPenalties);
      const penaltyImpactPercentage = totalGrossPayroll > 0
        ? parseFloat(((netPenalties / totalGrossPayroll) * 100).toFixed(2))
        : 0;

      return {
        month: m.short,
        monthFull: m.full,
        absenceDeductions: parseFloat(absenceDeductions.toFixed(2)),
        latenessPenalties: parseFloat(latenessPenalties.toFixed(2)),
        penaltiesWaived: parseFloat(penaltiesWaived.toFixed(2)),
        netPenalties: parseFloat(netPenalties.toFixed(2)),
        totalNetPenalties: parseFloat(netPenalties.toFixed(2)),
        totalPenalties: parseFloat(netPenalties.toFixed(2)),
        absencePenalties: parseFloat(absenceDeductions.toFixed(2)),
        grossPayroll: parseFloat(totalGrossPayroll.toFixed(2)),
        totalGrossPayroll: parseFloat(totalGrossPayroll.toFixed(2)),
        netPayroll: parseFloat(netPayroll.toFixed(2)),
        penaltyImpactPercentage: isNaN(penaltyImpactPercentage) ? 0 : penaltyImpactPercentage,
        headcount,
      };
    });

    // 7. Aggregate Top 5 Metric Cards Mathematical Formulas across the full 6 months
    const total6MoPenalties = monthlySeries.reduce((sum, m) => sum + (m.netPenalties || 0), 0);
    const totalAbsenceDeductions = monthlySeries.reduce((sum, m) => sum + (m.absenceDeductions || 0), 0);
    const totalLatenessPenalties = monthlySeries.reduce((sum, m) => sum + (m.latenessPenalties || 0), 0);
    const totalPenaltiesWaived = monthlySeries.reduce((sum, m) => sum + (m.penaltiesWaived || 0), 0);
    const total6MoGrossPayroll = monthlySeries.reduce((sum, m) => sum + (m.totalGrossPayroll || 0), 0);

    const avgImpactRate = total6MoGrossPayroll > 0
      ? parseFloat(((total6MoPenalties / total6MoGrossPayroll) * 100).toFixed(2))
      : 0;

    const summary = {
      total6MoPenalties: parseFloat(total6MoPenalties.toFixed(2)),
      totalNetPenalties6Mo: parseFloat(total6MoPenalties.toFixed(2)),
      totalPenalties6Mo: parseFloat(total6MoPenalties.toFixed(2)),
      totalAbsenceDeductions: parseFloat(totalAbsenceDeductions.toFixed(2)),
      totalAbsencePenalties6Mo: parseFloat(totalAbsenceDeductions.toFixed(2)),
      totalLatenessPenalties: parseFloat(totalLatenessPenalties.toFixed(2)),
      totalLatenessPenalties6Mo: parseFloat(totalLatenessPenalties.toFixed(2)),
      totalPenaltiesWaived: parseFloat(totalPenaltiesWaived.toFixed(2)),
      totalWaived6Mo: parseFloat(totalPenaltiesWaived.toFixed(2)),
      total6MoGrossPayroll: parseFloat(total6MoGrossPayroll.toFixed(2)),
      totalGross6Mo: parseFloat(total6MoGrossPayroll.toFixed(2)),
      totalGrossPayroll: parseFloat(total6MoGrossPayroll.toFixed(2)),
      avgImpactRate: isNaN(avgImpactRate) ? 0 : avgImpactRate,
      avgPenaltyImpactRate: isNaN(avgImpactRate) ? 0 : avgImpactRate,
      hasLiveRecords: total6MoGrossPayroll > 0 || total6MoPenalties > 0,
    };

    return res.status(200).json({
      success: true,
      data: monthlySeries,
      summary,
    });
  } catch (error) {
    console.error("Error in getPenaltyImpactAnalytics controller:", error);
    logErrorToFile({
      route: "/api/admin/analytics/penalties-impact",
      statusCode: 500,
      error,
      req,
      details: "Failure in MongoDB aggregation pipeline or processing in getPenaltyImpactAnalytics",
    });
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to calculate live penalty impact analytics.",
    });
  }
};

/**
 * Controller to fetch daily and cumulative lateness deductions for the current payroll month.
 * Optimized for Recharts line chart visualization.
 */
export const getCurrentMonthLatenessAnalytics = async (req, res) => {
  try {
    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth(); // 0-11

    if (req.query.month && typeof req.query.month === "string") {
      const parts = req.query.month.trim().split("-");
      if (parts.length === 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m) && m >= 0 && m <= 11) {
          targetYear = y;
          targetMonth = m;
        }
      }
    }

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const monthKey = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`;
    const monthName = monthNames[targetMonth];
    const monthShort = monthNamesShort[targetMonth];
    const monthFull = `${monthName} ${targetYear}`;

    const totalDays = new Date(targetYear, targetMonth + 1, 0).getDate();
    const startDateStr = `${monthKey}-01`;
    const endDateStr = `${monthKey}-${String(totalDays).padStart(2, "0")}`;

    // Fetch company settings for accurate fallback calculation
    let companySettings = {
      workStartTime: "08:00",
      workEndTime: "19:00",
      latenessTiers: [],
    };
    try {
      const settingsDoc = await CompanySettings.findOne().lean();
      if (settingsDoc) {
        companySettings = { ...companySettings, ...settingsDoc };
      }
    } catch (err) {
      console.warn("Could not fetch company settings for lateness analytics:", err?.message || err);
    }

    // Build query filter
    const query = {
      date: { $gte: startDateStr, $lte: endDateStr },
    };

    if (req.query.employeeId) {
      query.employee = req.query.employeeId;
    } else if (req.user && req.user.role === "employee") {
      query.$or = [
        { employee: req.user._id || req.user.id },
        { employeeId: req.user.employeeId },
      ];
    }

    let attendanceList = [];
    try {
      attendanceList = await Attendance.find(query)
        .populate("employee", "fullName employeeId department position")
        .lean() || [];
    } catch (err) {
      console.warn("Attendance query failed in getCurrentMonthLatenessAnalytics:", err?.message || err);
      attendanceList = [];
    }

    // Initialize daily buckets (Day 1 through Day N)
    const dayBuckets = new Map();
    for (let d = 1; d <= totalDays; d++) {
      dayBuckets.set(d, {
        day: d,
        dayStr: String(d).padStart(2, "0"),
        date: `${monthKey}-${String(d).padStart(2, "0")}`,
        label: `${monthShort} ${String(d).padStart(2, "0")}`,
        dailyDeductions: 0,
        lateCount: 0,
        lateMinutes: 0,
        waivedDeductions: 0,
        employees: [],
      });
    }

    let totalMonthDeductions = 0;
    let totalLateIncidents = 0;
    let totalLateMinutes = 0;
    let totalWaivedDeductions = 0;

    for (const record of attendanceList) {
      if (!record || !record.date) continue;
      const dateParts = String(record.date).split("-");
      if (dateParts.length < 3) continue;
      const dayNum = parseInt(dateParts[2], 10);
      if (isNaN(dayNum) || !dayBuckets.has(dayNum)) continue;

      const bucket = dayBuckets.get(dayNum);
      const isExcused = Boolean(record.isExcused);
      const delayMinutes = Number(record.delayMinutes ?? record.lateMinutes ?? 0);

      let penalty = Number(record.latePenalty ?? 0);
      if ((penalty === 0 || record.latePenalty === undefined) && delayMinutes > 0 && !isExcused) {
        if (record.clockIn) {
          const evalRes = evaluateLatenessPenalty(
            record.clockIn,
            companySettings.workStartTime || "08:00",
            companySettings
          );
          if (evalRes && evalRes.penalty !== undefined) {
            penalty = Number(evalRes.penalty) || 0;
          }
        }
      }

      if (isExcused) {
        bucket.waivedDeductions += penalty;
        totalWaivedDeductions += penalty;
      } else {
        if (delayMinutes > 0 || penalty > 0) {
          bucket.dailyDeductions += penalty;
          bucket.lateCount += 1;
          bucket.lateMinutes += delayMinutes;

          totalMonthDeductions += penalty;
          totalLateIncidents += 1;
          totalLateMinutes += delayMinutes;

          if (record.employee) {
            bucket.employees.push({
              name: record.employee.fullName || "Employee",
              employeeId: record.employee.employeeId || record.employeeId || "",
              delayMinutes,
              deduction: penalty,
            });
          }
        }
      }
    }

    // Compute cumulative running totals and track peak deduction day
    let runningCumulative = 0;
    const dailySeries = [];
    let highestDay = { day: 1, date: `${monthKey}-01`, label: `${monthShort} 01`, amount: 0, lateCount: 0 };

    for (let d = 1; d <= totalDays; d++) {
      const bucket = dayBuckets.get(d);
      const dailyAmt = parseFloat(bucket.dailyDeductions.toFixed(2));
      runningCumulative = parseFloat((runningCumulative + dailyAmt).toFixed(2));

      if (dailyAmt > highestDay.amount) {
        highestDay = {
          day: d,
          date: bucket.date,
          label: bucket.label,
          amount: dailyAmt,
          lateCount: bucket.lateCount,
        };
      }

      dailySeries.push({
        day: d,
        dayNumber: d,
        dayStr: bucket.dayStr,
        date: bucket.date,
        label: bucket.label,
        dailyDeductions: dailyAmt,
        cumulativeDeductions: runningCumulative,
        lateCount: bucket.lateCount,
        lateMinutes: bucket.lateMinutes,
        waivedDeductions: parseFloat(bucket.waivedDeductions.toFixed(2)),
      });
    }

    const avgDeductionPerLate = totalLateIncidents > 0
      ? parseFloat((totalMonthDeductions / totalLateIncidents).toFixed(2))
      : 0;

    const summary = {
      month: monthFull,
      monthKey,
      totalDays,
      totalLatenessDeductions: parseFloat(totalMonthDeductions.toFixed(2)),
      totalLateIncidents,
      totalLateMinutes,
      totalWaivedDeductions: parseFloat(totalWaivedDeductions.toFixed(2)),
      averageDeductionPerLate: avgDeductionPerLate,
      highestDeductionDay: highestDay,
      currentDay: now.getMonth() === targetMonth && now.getFullYear() === targetYear ? now.getDate() : totalDays,
    };

    return res.status(200).json({
      success: true,
      month: monthFull,
      monthKey,
      dailySeries,
      summary,
    });
  } catch (error) {
    console.error("Error in getCurrentMonthLatenessAnalytics:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to retrieve monthly lateness deductions analytics.",
    });
  }
};

export default {
  getPenaltyImpactAnalytics,
  getCurrentMonthLatenessAnalytics,
};
