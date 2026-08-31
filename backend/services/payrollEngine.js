import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import CompanySettings from "../models/CompanySettings.js";
import User from "../models/User.js";
import Employee from "../models/Employee.js";
import Leave from "../models/Leave.js";
import { liveAttendanceStore } from "../controllers/employeeAttendance.js";
import { liveLeaveStore } from "../controllers/leaveController.js";

const isValidObjectId = (id) =>
  id &&
  typeof id === "string" &&
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === String(id);

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Returns the count of Monday-Friday business days in a month.
 */
export function getWorkingDaysInMonth(year, monthIndex) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  return count || 22;
}

/**
 * Evaluates lateness penalty for a given clock-in time and company settings.
 */
export function evaluateLatenessPenalty(clockInInput, workStartTime = "08:00", settings = {}) {
  if (!clockInInput) {
    return { isLate: false, minutesLate: 0, penalty: 0, tier: "On Time" };
  }

  let startHour = 8;
  let startMinute = 0;
  if (typeof workStartTime === "string" && workStartTime.trim()) {
    const clean = workStartTime.trim();
    const isPM = /pm/i.test(clean);
    const isAM = /am/i.test(clean);
    const match = clean.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      startHour = h;
      startMinute = m;
    }
  }

  let clockInDate = null;
  if (clockInInput instanceof Date) {
    clockInDate = clockInInput;
  } else if (typeof clockInInput === "string") {
    const parsed = new Date(clockInInput);
    if (!isNaN(parsed.getTime())) {
      clockInDate = parsed;
    } else {
      const timeMatch = clockInInput.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const dummy = new Date();
        let h = parseInt(timeMatch[1], 10);
        const m = parseInt(timeMatch[2], 10);
        if (/pm/i.test(clockInInput) && h < 12) h += 12;
        if (/am/i.test(clockInInput) && h === 12) h = 0;
        dummy.setHours(h, m, 0, 0);
        clockInDate = dummy;
      }
    }
  }

  if (!clockInDate || isNaN(clockInDate.getTime())) {
    return { isLate: false, minutesLate: 0, penalty: 0, tier: "On Time" };
  }

  const clockInHour = clockInDate.getHours();
  const clockInMinute = clockInDate.getMinutes();
  const startTotalMinutes = startHour * 60 + startMinute;
  const clockInTotalMinutes = clockInHour * 60 + clockInMinute;
  const delayMinutes = Math.max(0, clockInTotalMinutes - startTotalMinutes);

  if (delayMinutes === 0) {
    return { isLate: false, minutesLate: 0, penalty: 0, tier: "On Time" };
  }

  // Check custom latenessTiers if provided
  if (Array.isArray(settings.latenessTiers) && settings.latenessTiers.length > 0) {
    const matched = settings.latenessTiers.find(
      (t) => delayMinutes <= (t.maxMinutes || 9999) && delayMinutes >= (t.minMinutes || 1)
    );
    if (matched) {
      return {
        isLate: true,
        minutesLate: delayMinutes,
        penalty: Number(matched.penalty || matched.fine || 0),
        tier: matched.name || `Tier ${matched.tier || ""}`,
      };
    }
  }

  const t1 = settings.lateTier1_amount !== undefined && Number(settings.lateTier1_amount) >= 0 ? Number(settings.lateTier1_amount) : 10;
  const t2 = settings.lateTier2_amount !== undefined && Number(settings.lateTier2_amount) >= 0 ? Number(settings.lateTier2_amount) : 30;
  const t3 = settings.lateTier3_amount !== undefined && Number(settings.lateTier3_amount) >= 0 ? Number(settings.lateTier3_amount) : 50;
  const t4 = settings.lateTier4_amount !== undefined && Number(settings.lateTier4_amount) >= 0 ? Number(settings.lateTier4_amount) : 75;
  const t5 = settings.lateTier5_amount !== undefined && Number(settings.lateTier5_amount) >= 0 ? Number(settings.lateTier5_amount) : 100;
  const t6 = settings.lateTier6_amount !== undefined && Number(settings.lateTier6_amount) >= 0 ? Number(settings.lateTier6_amount) : 150;

  let penalty = 0;
  let tier = "";
  if (delayMinutes >= 1 && delayMinutes <= 30) {
    penalty = t1;
    tier = "1–30 mins late (Tier 1)";
  } else if (delayMinutes >= 31 && delayMinutes <= 60) {
    penalty = t2;
    tier = "31–60 mins late (Tier 2)";
  } else if (delayMinutes >= 61 && delayMinutes <= 120) {
    penalty = t3;
    tier = "61–120 mins (Tier 3)";
  } else if (delayMinutes >= 121 && delayMinutes <= 180) {
    penalty = t4;
    tier = "121–180 mins (Tier 4)";
  } else if (delayMinutes >= 181 && delayMinutes <= 240) {
    penalty = t5;
    tier = "181–240 mins (Tier 5)";
  } else {
    penalty = t6;
    tier = "241+ mins (Tier 6)";
  }

  return {
    isLate: true,
    minutesLate: delayMinutes,
    penalty,
    tier,
  };
}

/**
 * Unified Single Source of Truth for Monthly Penalties & Attendance Breakdown.
 * Accurately queries attendance logs across date formats and computes exact penalties.
 */
export async function calculateMonthlyPenalties(employeeId, year, monthIndex) {
  const currentYear = year || new Date().getFullYear();
  const currentMonthIdx = monthIndex !== undefined ? monthIndex : new Date().getMonth();

  // Start and End of selected month in UTC/Local bounds
  const startDate = new Date(Date.UTC(currentYear, currentMonthIdx, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(currentYear, currentMonthIdx + 1, 0, 23, 59, 59, 999));
  const monthStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, "0")}`;
  const monthName = `${MONTH_NAMES[currentMonthIdx]} ${currentYear}`;

  let settings = {
    workStartTime: "08:00",
    absenceRate: 15.00,
    absenceDeductionRate: 15.00,
    lateTier1_amount: 10,
    lateTier2_amount: 30,
    lateTier3_amount: 50,
    lateTier4_amount: 75,
    lateTier5_amount: 100,
    lateTier6_amount: 150,
    latenessTiers: [
      { minMinutes: 1, maxMinutes: 30, penalty: 10 },
      { minMinutes: 31, maxMinutes: 60, penalty: 30 },
      { minMinutes: 61, maxMinutes: 9999, penalty: 150 },
    ],
  };

  try {
    const dbSettings = await CompanySettings.findOne().lean();
    if (dbSettings) {
      settings = {
        ...settings,
        ...dbSettings,
        absenceRate: Number(dbSettings.absenceRate || dbSettings.absenceDeductionRate || 15.00),
      };
    }
  } catch (err) {
    console.warn("Could not query CompanySettings:", err.message);
  }

  // Resolve target employee and associated IDs
  let targetEmployee = null;
  let targetObjectId = null;
  let targetEmpCode = "";

  if (employeeId && employeeId !== "all") {
    try {
      if (isValidObjectId(employeeId)) {
        targetEmployee = await Employee.findById(employeeId).lean();
        targetObjectId = employeeId;
        if (!targetEmployee) {
          targetEmployee = await User.findById(employeeId).lean();
        }
      } else {
        targetEmployee = await Employee.findOne({
          $or: [{ employeeId }, { email: employeeId }],
        }).lean();
        if (!targetEmployee) {
          targetEmployee = await User.findOne({
            $or: [{ employeeId }, { email: employeeId }],
          }).lean();
        }
      }
    } catch (err) {
      console.warn("Error querying employee in calculateMonthlyPenalties:", err.message);
    }
  }

  if (!targetEmployee) {
    try {
      targetEmployee = await Employee.findOne({ isActive: true }).lean();
      if (!targetEmployee) {
        targetEmployee = await User.findOne({ role: "employee" }).lean();
      }
    } catch (e) {
      // fallback
    }
  }

  if (targetEmployee) {
    targetObjectId = targetEmployee._id?.toString() || targetObjectId;
    targetEmpCode = targetEmployee.employeeId || "";
  }

  // Build employee query clause matching both ObjectId and string ID formats
  const empMatchOr = [];
  if (targetObjectId) {
    empMatchOr.push({ employee: targetObjectId });
    if (isValidObjectId(targetObjectId)) {
      empMatchOr.push({ employee: new mongoose.Types.ObjectId(targetObjectId) });
    }
    empMatchOr.push({ employeeId: targetObjectId });
  }
  if (targetEmpCode) {
    empMatchOr.push({ employeeId: targetEmpCode });
  }
  if (employeeId && typeof employeeId === "string") {
    empMatchOr.push({ employeeId: employeeId });
    if (isValidObjectId(employeeId)) {
      empMatchOr.push({ employee: new mongoose.Types.ObjectId(employeeId) });
      empMatchOr.push({ employee: employeeId });
    }
  }

  // Fetch all attendance logs for the month (matching Date objects, ISO strings, and YYYY-MM prefixes)
  let logs = [];
  try {
    const query = {
      $and: [
        empMatchOr.length > 0 ? { $or: empMatchOr } : {},
        {
          $or: [
            { date: { $gte: startDate, $lte: endDate } },
            { date: { $regex: `^${monthStr}` } },
            { clockIn: { $gte: startDate, $lte: endDate } },
            { clockInTime: { $gte: startDate, $lte: endDate } },
          ],
        },
      ],
    };

    logs = await Attendance.find(query).lean();
  } catch (err) {
    console.warn("Attendance.find error in calculateMonthlyPenalties:", err.message);
  }

  // Merge live attendance store if in-memory clock-in exists
  if (Array.isArray(liveAttendanceStore)) {
    liveAttendanceStore.forEach((liveAtt) => {
      const matchEmp =
        String(liveAtt.employee) === String(targetObjectId) ||
        String(liveAtt.employee?._id) === String(targetObjectId) ||
        liveAtt.employeeId === targetEmpCode ||
        liveAtt.employee?.employeeId === targetEmpCode;

      if (matchEmp && liveAtt.date && String(liveAtt.date).startsWith(monthStr)) {
        if (!logs.some((l) => l.date === liveAtt.date)) {
          logs.push(liveAtt);
        }
      }
    });
  }

  let attendedDays = 0;
  let lateCount = 0;
  let totalLatePenalties = 0;
  const lateLogs = [];

  logs.forEach((log) => {
    const hasClockIn = log.clockInTime || log.clockIn;
    const isExplicitAbsent = (log.status || "").toLowerCase() === "absent";

    if (hasClockIn || (log.status && !isExplicitAbsent)) {
      attendedDays += 1;
    }

    const evalResult = hasClockIn ? evaluateLatenessPenalty(hasClockIn, settings.workStartTime, settings) : null;
    const isLate =
      (log.status || "").toLowerCase() === "late" ||
      Number(log.lateMinutes || log.delayMinutes || 0) > 0 ||
      Number(log.latePenalty || 0) > 0 ||
      (evalResult && evalResult.isLate);

    if (isLate && !isExplicitAbsent) {
      lateCount += 1;
      let fine = 0;
      if (log.latePenalty !== undefined && Number(log.latePenalty) > 0) {
        fine = Number(log.latePenalty);
      } else if (evalResult && evalResult.penalty > 0) {
        fine = evalResult.penalty;
      } else if (Number(log.lateMinutes || log.delayMinutes || 0) > 0) {
        const mins = Number(log.lateMinutes || log.delayMinutes);
        if (mins <= 30) fine = settings.lateTier1_amount || 10;
        else if (mins <= 60) fine = settings.lateTier2_amount || 30;
        else fine = settings.lateTier6_amount || 150;
      } else {
        fine = settings.lateTier1_amount || 10;
      }

      totalLatePenalties += fine;
      lateLogs.push({
        date: log.date,
        clockInTime: hasClockIn,
        lateMinutes: log.lateMinutes || log.delayMinutes || evalResult?.minutesLate || 15,
        penalty: fine,
        tier: log.penaltyTier || evalResult?.tier || "Late Penalty",
      });
    }
  });

  // Query approved leaves
  let approvedLeaveDays = 0;
  try {
    const leaves = await Leave.find({
      $and: [
        empMatchOr.length > 0 ? { $or: empMatchOr } : {},
        { status: "Approved" },
      ],
    }).lean();

    leaves.forEach((l) => {
      approvedLeaveDays += Number(l.totalDays || l.days || 1);
    });
  } catch (err) {
    console.warn("Leave query notice:", err.message);
  }

  const standardWorkingDays = getWorkingDaysInMonth(currentYear, currentMonthIdx);
  const absentDays = Math.max(0, standardWorkingDays - attendedDays - approvedLeaveDays);
  const absenceRate = Number(settings.absenceRate || settings.absenceDeductionRate || 15.00);
  const totalAbsenceDeductions = parseFloat((absentDays * absenceRate).toFixed(2));

  const baseSalary = Number(
    targetEmployee?.baseSalary ??
    targetEmployee?.basicSalary ??
    targetEmployee?.salary ??
    2500
  );

  return {
    targetEmployee,
    monthName,
    year: currentYear,
    monthIndex: currentMonthIdx,
    standardWorkingDays,
    attendedDays,
    lateCount,
    lateDays: lateCount,
    lateLogs,
    totalLatePenalties: parseFloat(totalLatePenalties.toFixed(2)),
    latenessPenalties: parseFloat(totalLatePenalties.toFixed(2)),
    approvedLeaveDays,
    absentDays,
    absenceRate,
    absenceDeductions: totalAbsenceDeductions,
    baseSalary,
    allowances: 0,
    netSalary: parseFloat(
      Math.max(0, baseSalary - totalAbsenceDeductions - totalLatePenalties).toFixed(2)
    ),
    remarks: `Calculated from ${attendedDays} attended days, ${absentDays} absent days, and ${lateCount} late check-in(s) for ${monthName}.`,
  };
}

/**
 * Calculates complete employee payroll with allowance, waiver, and custom deduction support.
 */
export async function calculateEmployeePayrollEngine(employeeId, year, monthIndex, options = {}) {
  const penaltySummary = await calculateMonthlyPenalties(employeeId, year, monthIndex);
  const baseSalary = options.baseSalaryInput !== undefined && !isNaN(Number(options.baseSalaryInput))
    ? Number(options.baseSalaryInput)
    : penaltySummary.baseSalary;

  const allowances = Number(options.allowances || 0);
  const customDeductions = Number(options.customDeductions || options.deductions || 0);
  const absenceDeductions = penaltySummary.absenceDeductions;
  const latenessPenalties = penaltySummary.latenessPenalties;

  const totalDeductions = parseFloat(
    (customDeductions + absenceDeductions + latenessPenalties).toFixed(2)
  );
  const netSalary = parseFloat(
    Math.max(0, baseSalary + allowances - totalDeductions).toFixed(2)
  );

  return {
    ...penaltySummary,
    baseSalary,
    basicSalary: baseSalary,
    allowances,
    customDeductions,
    totalDeductions,
    netSalary,
    earnedBaseSalary: baseSalary,
  };
}

/**
 * Enforces single source of truth for net salary and deduction calculations.
 */
export function computeNetSalary({
  baseSalary = 0,
  allowances = 0,
  absentDays = 0,
  dailyAbsenceRate = 15.00,
  latenessFines = 0,
  otherDeductions = 0
} = {}) {
  const numBase = Number(baseSalary) || 0;
  const numAllowances = Number(allowances) || 0;
  const numAbsentDays = Number(absentDays) || 0;
  const numDailyAbsenceRate = Number(dailyAbsenceRate) || 15.00;
  const numLatenessFines = Number(latenessFines) || 0;
  const numOtherDeductions = Number(otherDeductions) || 0;

  const totalEarnings = numBase + numAllowances;
  const totalAbsenceDeduction = numAbsentDays * numDailyAbsenceRate;
  const totalDeductions = totalAbsenceDeduction + numLatenessFines + numOtherDeductions;
  const netSalary = Math.max(0, totalEarnings - totalDeductions);

  return {
    baseSalary: Number(numBase),
    allowances: Number(numAllowances),
    absentDays: Number(numAbsentDays),
    absenceDeductions: Number(totalAbsenceDeduction.toFixed(2)),
    latenessPenalties: Number(numLatenessFines.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    netSalary: Number(netSalary.toFixed(2)),
  };
}

export default {
  computeNetSalary,
  calculateMonthlyPenalties,
  calculateEmployeePayrollEngine,
  getWorkingDaysInMonth,
  evaluateLatenessPenalty,
};
