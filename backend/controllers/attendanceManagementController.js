import mongoose from "mongoose";
import { Attendance } from "../models/attendanceModel.js";
import { CompanySettings } from "../models/CompanySettings.js";
import { Employee } from "../models/Employee.js";
import { AuditLog } from "../models/AuditLog.js";
import { calculateWorkHours, safeDateTime } from "../utils/calculateWorkHours.js";
import { evaluateLatenessPenalty } from "../utils/latenessPenaltyCalculator.js";
import { createNotificationRecord } from "./notificationController.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Backend Attendance Override & Retroactive Shift Adjustment
 * Handles POST /api/admin/attendance/override AND PUT /api/admin/attendance/:id/override
 * Uses CompanySettings (workStartTime, workEndTime, lateness tiers) as single source of truth.
 */
export const overrideAttendanceRecord = async (req, res) => {
  try {
    const recordId = req.params?.id || req.body?.id || null;
    const {
      employeeId,
      date,
      clockIn,
      clockOut,
      status,
      notes,
      workHours: customWorkHours,
      delayMinutes: customDelayMinutes,
      latePenalty: customLatePenalty,
      isWaived,
      waivePenalty,
      isExcused,
      excuseReason,
    } = req.body;

    // 1. Retrieve active shift configurations from CompanySettings (single source of truth)
    let settingsDoc = null;
    try {
      settingsDoc = await CompanySettings.getSingletonSettings();
    } catch {
      settingsDoc = {
        workStartTime: "08:00",
        workEndTime: "19:00",
      };
    }

    const workStartTime = settingsDoc?.workStartTime || "08:00";
    const workEndTime = settingsDoc?.workEndTime || "19:00";

    // 2. Identify target record or employee
    let existingRecord = null;
    if (recordId && isValidObjectId(recordId)) {
      existingRecord = await Attendance.findById(recordId);
    }

    const targetDate =
      date ||
      existingRecord?.date ||
      new Date().toISOString().split("T")[0];

    let targetEmployeeId = employeeId;
    let employeeObjectId = existingRecord?.employee || null;

    if (!employeeObjectId && targetEmployeeId) {
      if (isValidObjectId(targetEmployeeId)) {
        const found = await Employee.findById(targetEmployeeId).select("_id employeeId fullName");
        if (found) {
          employeeObjectId = found._id;
          targetEmployeeId = found.employeeId || targetEmployeeId;
        }
      }

      if (!employeeObjectId) {
        const found = await Employee.findOne({ employeeId: String(targetEmployeeId).trim() }).select("_id employeeId fullName");
        if (found) {
          employeeObjectId = found._id;
        }
      }
    }

    if (!existingRecord && employeeObjectId) {
      existingRecord = await Attendance.findOne({
        employee: employeeObjectId,
        date: targetDate,
      });
    }

    if (!existingRecord && !employeeObjectId) {
      return res.status(400).json({
        success: false,
        message: "Valid employee identifier or attendance record ID is required.",
      });
    }

    // 3. Format clock timestamps safely
    const safeClockIn = clockIn ? safeDateTime(targetDate, clockIn) : null;
    const safeClockOut = clockOut ? safeDateTime(targetDate, clockOut) : null;

    // 4. Calculate work hours
    let calculatedHours = 0;
    if (customWorkHours !== undefined && customWorkHours !== null && customWorkHours !== "") {
      const parsedH = Number(customWorkHours);
      calculatedHours = !isNaN(parsedH) && Number.isFinite(parsedH) ? parsedH : 0;
    } else if (safeClockIn && safeClockOut) {
      calculatedHours = calculateWorkHours(safeClockIn, safeClockOut);
    }

    // 5. Evaluate Lateness & Penalty using dynamic CompanySettings
    let delayMinutes = 0;
    let latePenalty = 0;
    let penaltyTier = "";
    let finalStatus = status || existingRecord?.status || "Present";

    if (safeClockIn && !isNaN(safeClockIn.getTime())) {
      const penaltyEval = evaluateLatenessPenalty(
        safeClockIn,
        workStartTime,
        settingsDoc || {}
      );
      delayMinutes = penaltyEval.minutesLate || 0;
      latePenalty = penaltyEval.penalty || 0;
      penaltyTier = penaltyEval.tier || "";

      // Auto-select status based on shift comparison if not explicitly specified
      if (!status) {
        finalStatus = delayMinutes > 0 ? "Late" : "On Time";
      }
    }

    // If explicit delayMinutes passed
    if (customDelayMinutes !== undefined && customDelayMinutes !== null) {
      delayMinutes = Math.max(0, Number(customDelayMinutes) || 0);
    }

    // Handle penalty waiver or manual penalty adjustment
    const penaltyWaived = Boolean(isWaived || waivePenalty || isExcused || finalStatus === "On Time" || delayMinutes === 0);
    if (penaltyWaived) {
      latePenalty = 0;
    } else if (customLatePenalty !== undefined && customLatePenalty !== null) {
      const parsedFine = Number(customLatePenalty);
      latePenalty = !isNaN(parsedFine) && parsedFine >= 0 ? parsedFine : 0;
    }

    // 6. Admin Audit Log payload
    const adminId = String(req.admin?._id || req.admin?.id || "admin_01");
    const adminName = req.admin?.fullName || req.admin?.name || "HR Administrator";
    const adjustmentReason = notes || excuseReason || "Manual shift override by administrator";
    const auditLogEntry = {
      adminId,
      adminName,
      reason: adjustmentReason,
      timestamp: new Date(),
    };

    // 7. Update or insert record
    const updatePayload = {
      date: targetDate,
      clockIn: safeClockIn && !isNaN(safeClockIn.getTime()) ? safeClockIn : null,
      clockOut: safeClockOut && !isNaN(safeClockOut.getTime()) ? safeClockOut : null,
      workHours: calculatedHours,
      delayMinutes,
      lateMinutes: delayMinutes,
      latePenalty,
      penaltyTier,
      status: finalStatus,
      notes: adjustmentReason,
      isExcused: Boolean(isExcused || penaltyWaived),
      excuseReason: excuseReason || (penaltyWaived ? "Waived during manual override" : ""),
      auditLog: auditLogEntry,
    };

    if (employeeObjectId) {
      updatePayload.employee = employeeObjectId;
    }

    let savedRecord = null;
    if (existingRecord) {
      savedRecord = await Attendance.findByIdAndUpdate(
        existingRecord._id,
        { $set: updatePayload },
        { returnDocument: "after" }
      )
        .populate("employee", "fullName department position employeeId email avatar")
        .lean();
    } else {
      savedRecord = await Attendance.findOneAndUpdate(
        { employee: employeeObjectId, date: targetDate },
        { $set: updatePayload },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      )
        .populate("employee", "fullName department position employeeId email avatar")
        .lean();
    }

    // 8. Record in global system AuditLog collection
    try {
      const empName = savedRecord?.employee?.fullName || targetEmployeeId || "Employee";
      await AuditLog.create({
        action: "ATTENDANCE_MANUAL_OVERRIDE",
        category: "Attendance",
        performedBy: {
          id: adminId,
          name: adminName,
          email: req.admin?.email || "admin@eyenit.com",
          role: req.admin?.role || "admin",
        },
        target: `Attendance: ${targetDate} (${empName})`,
        summary: `Manual override for ${empName} on ${targetDate}. Hours: ${calculatedHours}h, Status: ${finalStatus}, Penalty: GH₵${latePenalty.toFixed(2)}. Shift: ${workStartTime}–${workEndTime}.`,
        changes: [
          { field: "clockIn", label: "Clock-In Time", oldValue: existingRecord?.clockIn || "--", newValue: safeClockIn },
          { field: "clockOut", label: "Clock-Out Time", oldValue: existingRecord?.clockOut || "--", newValue: safeClockOut },
          { field: "workHours", label: "Work Hours", oldValue: existingRecord?.workHours || 0, newValue: calculatedHours },
          { field: "delayMinutes", label: "Delay Minutes", oldValue: existingRecord?.delayMinutes || 0, newValue: delayMinutes },
          { field: "latePenalty", label: "Late Penalty (GH₵)", oldValue: existingRecord?.latePenalty || 0, newValue: latePenalty },
          { field: "status", label: "Status", oldValue: existingRecord?.status || "--", newValue: finalStatus },
          { field: "notes", label: "Reason / Notes", oldValue: existingRecord?.notes || "--", newValue: adjustmentReason },
        ],
        metadata: {
          attendanceId: String(savedRecord?._id || ""),
          workStartTime,
          workEndTime,
          isWaived: penaltyWaived,
          penaltyTier,
        },
        createdAt: new Date(),
      });
    } catch (auditErr) {
      console.warn("Global audit log error in overrideAttendanceRecord:", auditErr.message);
    }

    // 9. Send alert notification to employee if penalty or absence recorded
    if (finalStatus === "Late" || finalStatus === "Absent") {
      try {
        const empTargetId = String(savedRecord?.employee?._id || employeeObjectId || "");
        if (empTargetId) {
          if (finalStatus === "Late" && latePenalty > 0) {
            await createNotificationRecord({
              recipient_id: empTargetId,
              recipient_role: "employee",
              sender_id: adminId,
              sender_role: "admin",
              sender_name: adminName,
              title: "⚠️ Attendance Adjusted: Lateness Penalty Applied",
              message: `Your attendance record for ${targetDate} was adjusted. A lateness penalty of GH₵${latePenalty.toFixed(2)} has been recorded based on your clock-in past ${workStartTime}.`,
              type: "penalty_alert",
              category: "payroll",
              priority: "high",
              action_url: "/employee/dashboard/payslips",
              action_label: "View Attendance & Payslips",
              metadata: { date: targetDate, delayMinutes, latePenalty, tier: penaltyTier },
            });
          } else if (finalStatus === "Absent") {
            const absenceRate = settingsDoc?.absenceDeductionRate || 15;
            await createNotificationRecord({
              recipient_id: empTargetId,
              recipient_role: "employee",
              sender_id: adminId,
              sender_role: "admin",
              sender_name: adminName,
              title: "⚠️ Absence Recorded by HR",
              message: `An absence for ${targetDate} was logged by HR. Standard absence deduction rate of GH₵${absenceRate.toFixed(2)} applies.`,
              type: "penalty_alert",
              category: "payroll",
              priority: "high",
              action_url: "/employee/dashboard/payslips",
              action_label: "View Details",
              metadata: { date: targetDate, absenceRate },
            });
          }
        }
      } catch (notifErr) {
        console.warn("Notification dispatch warning:", notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Attendance override applied successfully.",
      attendance: savedRecord,
      shiftSettings: {
        workStartTime,
        workEndTime,
      },
    });
  } catch (error) {
    console.error("Error in overrideAttendanceRecord:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process attendance override.",
    });
  }
};

export default {
  overrideAttendanceRecord,
};
