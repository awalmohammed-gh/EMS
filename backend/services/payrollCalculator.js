/**
 * Shared Payroll Calculator Service
 * Single source of truth for payroll calculations across Admin and Employee portals.
 * Formula: netPay = baseSalary + allowances - absenceDeductions - latenessPenalties - manualDeductions
 */

import mongoose from "mongoose";
import { Payroll } from "../models/payrollModel.js";
import { CompanySettings } from "../models/CompanySettings.js";
import { Employee } from "../models/employeeModel.js";
import { Attendance } from "../models/attendanceModel.js";
import { Leave } from "../models/leaveModel.js";

/**
 * Standard Net Pay Formula
 */
export const calculateNetPay = ({
  baseSalary = 0,
  allowances = 0,
  absenceDeductions = 0,
  latenessPenalties = 0,
  manualDeductions = 0,
}) => {
  const base = Number(baseSalary) || 0;
  const allow = Number(allowances) || 0;
  const abs = Number(absenceDeductions) || 0;
  const late = Number(latenessPenalties) || 0;
  const manual = Number(manualDeductions) || 0;

  const totalDeductions = parseFloat((abs + late + manual).toFixed(2));
  const net = Math.max(0, parseFloat((base + allow - totalDeductions).toFixed(2)));

  return {
    baseSalary: base,
    allowances: allow,
    absenceDeductions: abs,
    latenessPenalties: late,
    manualDeductions: manual,
    totalAttendanceDeductions: parseFloat((abs + late).toFixed(2)),
    totalDeductions,
    grossSalary: parseFloat((base + allow).toFixed(2)),
    netPay: net,
    netSalary: net,
  };
};

/**
 * Find the official published payslip for an employee from MongoDB
 */
export const getPublishedPayslipForEmployee = async (employeeId, payMonth = null) => {
  if (!employeeId) return null;

  const query = {
    $or: [],
    status: { $in: ["Published", "published", "Paid", "paid"] },
  };

  if (mongoose.Types.ObjectId.isValid(employeeId)) {
    query.$or.push({ employee: new mongoose.Types.ObjectId(employeeId) });
  }
  query.$or.push({ employeeId: String(employeeId) });

  if (payMonth) {
    query.payMonth = payMonth;
  }

  try {
    const published = await Payroll.findOne(query)
      .sort({ paymentDate: -1, createdAt: -1 })
      .populate("employee", "fullName employeeId department position email bankName accountNumber phone")
      .lean();

    return published;
  } catch (err) {
    console.warn("Error finding published payslip in MongoDB:", err.message);
    return null;
  }
};

/**
 * Persist or update an immutable payslip snapshot in MongoDB
 */
export const persistImmutablePayslipSnapshot = async (payslipPayload) => {
  const {
    employee,
    payslipNumber,
    payMonth,
    paymentDate,
    basicSalary,
    baseSalary,
    earnings = [],
    allowances = 0,
    deductions = [],
    customDeductions = [],
    absentDaysDeduction = 0,
    latenessDeduction = 0,
    totalAttendanceDeductions = 0,
    originalAbsenceDeduction = 0,
    originalLatenessDeduction = 0,
    penaltyOverride = null,
    absenceDeductionDetails = null,
    latenessDeductionDetails = null,
    breakdown = null,
    netSalary,
    netPay,
    paymentMethod = "Bank Transfer",
    remarks = "",
    status = "Published",
  } = payslipPayload;

  const finalBase = Number(baseSalary !== undefined ? baseSalary : basicSalary) || 0;
  const finalAllowances = Number(allowances) || (Array.isArray(earnings) ? earnings.reduce((s, e) => s + Number(e.amount || 0), 0) : 0);
  const finalAbsence = Number(absentDaysDeduction) || 0;
  const finalLateness = Number(latenessDeduction) || 0;
  const finalManualDeductions = Array.isArray(deductions)
    ? deductions.reduce((s, d) => s + Number(d.amount || 0), 0)
    : (Array.isArray(customDeductions) ? customDeductions.reduce((s, d) => s + Number(d.amount || 0), 0) : Number(deductions || 0));

  const calculated = calculateNetPay({
    baseSalary: finalBase,
    allowances: finalAllowances,
    absenceDeductions: finalAbsence,
    latenessPenalties: finalLateness,
    manualDeductions: finalManualDeductions,
  });

  const finalNet = Number(netSalary !== undefined && netSalary !== null ? netSalary : (netPay !== undefined ? netPay : calculated.netPay));

  const immutableBreakdown = breakdown || {
    baseSalary: finalBase,
    grossEarnings: calculated.grossSalary,
    allowances: finalAllowances,
    absenceDeduction: {
      daysCount: absenceDeductionDetails?.daysCount || (finalAbsence > 0 ? Math.round(finalAbsence / (absenceDeductionDetails?.ratePerDay || 15)) : 0),
      ratePerDay: absenceDeductionDetails?.ratePerDay || 15,
      totalAmount: finalAbsence,
    },
    latenessDeduction: {
      totalLateMinutes: latenessDeductionDetails?.totalLateMinutes || 0,
      lateDaysCount: latenessDeductionDetails?.lateDaysCount || (finalLateness > 0 ? 1 : 0),
      tierBreakdown: latenessDeductionDetails?.tierBreakdown || [],
      totalAmount: finalLateness,
    },
    customDeductions: Array.isArray(deductions) ? deductions : (Array.isArray(customDeductions) ? customDeductions : []),
    totalAttendanceDeductions: calculated.totalAttendanceDeductions,
    totalDeductions: calculated.totalDeductions,
    netSalary: finalNet,
  };

  const docData = {
    employee: employee?._id || employee,
    payslipNumber: payslipNumber || `PAY-${Date.now()}`,
    payMonth,
    paymentDate: paymentDate || new Date(),
    basicSalary: finalBase,
    baseSalary: finalBase,
    earnings: Array.isArray(earnings) ? earnings : [],
    allowances: finalAllowances,
    deductions: Array.isArray(deductions) ? deductions : (Array.isArray(customDeductions) ? customDeductions : []),
    customDeductions: Array.isArray(customDeductions) ? customDeductions : (Array.isArray(deductions) ? deductions : []),
    absentDaysDeduction: finalAbsence,
    latenessDeduction: finalLateness,
    totalAttendanceDeductions: calculated.totalAttendanceDeductions,
    originalAbsenceDeduction: Number(originalAbsenceDeduction || finalAbsence),
    originalLatenessDeduction: Number(originalLatenessDeduction || finalLateness),
    penaltyOverride: penaltyOverride || { isWaived: false },
    absenceDeductionDetails: absenceDeductionDetails || immutableBreakdown.absenceDeduction,
    latenessDeductionDetails: latenessDeductionDetails || immutableBreakdown.latenessDeduction,
    breakdown: immutableBreakdown,
    netSalary: finalNet,
    netPay: finalNet,
    paymentMethod,
    remarks,
    status: status || "Published",
  };

  const savedRecord = await Payroll.findOneAndUpdate(
    { employee: docData.employee, payMonth: docData.payMonth },
    docData,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate("employee", "fullName employeeId department position email bankName accountNumber phone");

  return savedRecord;
};

export default {
  calculateNetPay,
  getPublishedPayslipForEmployee,
  persistImmutablePayslipSnapshot,
};
