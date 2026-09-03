import mongoose from "mongoose";
import { Attendance } from "../models/attendanceModel.js";
import { Employee } from "../models/employeeModel.js";
import { CompanySettings } from "../models/CompanySettings.js";
import { createNotificationRecord } from "./notificationController.js";
import { evaluateLatenessPenalty, calculateLatenessPenalty } from "../utils/latenessPenaltyCalculator.js";
import { calculateWorkHours, parseTimeToMinutes, safeDateTime } from "../utils/calculateWorkHours.js";

const isValidObjectId = (id) =>
  id &&
  typeof id === "string" &&
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === String(id);

// In-memory attendance storage for real-time reactivity & fast lookups
export const liveAttendanceStore = new Map();

// Helper to get active record for an employee today
export const getEmployeeLiveToday = (employeeId, todayStr) => {
  const key = `${employeeId}_${todayStr}`;
  return liveAttendanceStore.get(key) || null;
};

// Helper to resolve employee ObjectId
const resolveEmployeeObjectId = async (idOrKey) => {
  if (!idOrKey) return null;
  if (isValidObjectId(idOrKey)) return idOrKey;
  try {
    const emp = await Employee.findOne({
      $or: [{ employeeId: idOrKey }, { email: idOrKey }],
    }).select("_id").lean();
    return emp ? emp._id.toString() : null;
  } catch {
    return null;
  }
};

// Clock in handler - Automatic real-time recording
export const clockIn = async (req, res) => {
  try {
    // For standard employees, hardcode the employeeId strictly to the authenticated user ID
    const isEmployeeRole = req.user?.role === "employee" || (!req.admin && req.employee);
    let employeeId = isEmployeeRole
      ? (req.user?._id || req.user?.id || req.employee?.id || req.employee?._id)
      : (req.user?._id || req.user?.id || req.employee?.id || req.employee?._id || req.body?.employeeId);

    const resolvedId = await resolveEmployeeObjectId(employeeId);
    if (resolvedId) employeeId = resolvedId;

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee identification required for clock in.",
      });
    }

    // Lookup employee details for rich notification & response
    let employeeDoc = null;
    if (isValidObjectId(employeeId)) {
      try {
        employeeDoc = await Employee.findById(employeeId)
          .select("fullName employeeId department position email avatar profile_picture baseSalary salary")
          .lean();
      } catch (err) {
        console.warn("Could not fetch employee details for clockIn:", err.message);
      }
    }

    const employeeCode = employeeDoc?.employeeId || req.employee?.employeeId || "";
    const today = new Date().toISOString().split("T")[0];
    const key = `${employeeId}_${today}`;

    // Parse check-in timestamp (from body or server clock)
    const checkInTimestamp = req.body?.clockInTime || req.body?.timestamp || req.body?.clockIn || new Date();
    const now = new Date(checkInTimestamp);
    const validNow = !isNaN(now.getTime()) ? now : new Date();

    // Fetch active CompanySettings for work start time and lateness penalty matrix
    let settingsDoc = null;
    try {
      settingsDoc = await CompanySettings.getSingletonSettings();
    } catch (err) {
      settingsDoc = {};
    }

    const workStartTime = settingsDoc?.workStartTime || "08:00";
    const penaltyEval = evaluateLatenessPenalty(validNow, workStartTime, settingsDoc || {});
    const delayMinutes = penaltyEval.delayMinutes ?? penaltyEval.minutesLate ?? 0;
    const latePenalty = penaltyEval.latePenalty ?? penaltyEval.penalty ?? 0;
    const penaltyTier = penaltyEval.tier || (delayMinutes > 0 ? "Late" : "On Time");
    const status = delayMinutes > 0 ? "Late" : "On Time";

    // 1. Check MongoDB for existing record today
    let existingDoc = null;
    if (isValidObjectId(employeeId)) {
      try {
        existingDoc = await Attendance.findOne({
          employee: employeeId,
          date: today,
        }).populate("employee", "fullName employeeId department position email avatar").lean();
      } catch (dbErr) {
        console.warn("DB check in clockIn:", dbErr.message);
      }
    }

    if (existingDoc && (existingDoc.clockIn || existingDoc.clockInTime)) {
      liveAttendanceStore.set(key, existingDoc);
      return res.status(200).json({
        success: true,
        alreadyClockedIn: true,
        message: "You have already clocked in today.",
        attendance: existingDoc,
        status: existingDoc.lateMinutes > 0 || (existingDoc.status || "").toLowerCase() === "late" ? "late" : "on-time",
        delayMinutes: existingDoc.delayMinutes ?? existingDoc.lateMinutes ?? 0,
        lateMinutes: existingDoc.lateMinutes ?? existingDoc.delayMinutes ?? 0,
        latePenalty: existingDoc.latePenalty || 0,
        penaltyTier: existingDoc.penaltyTier || "",
        hasClockedIn: true,
        hasClockedOut: Boolean(existingDoc.clockOut || existingDoc.clockOutTime),
      });
    }

    // 2. Atomically create or update attendance record in MongoDB
    let savedRecord = null;
    if (isValidObjectId(employeeId)) {
      try {
        savedRecord = await Attendance.findOneAndUpdate(
          { employee: employeeId, date: today },
          {
            $set: {
              employeeId: employeeCode,
              clockIn: validNow,
              clockInTime: validNow,
              status: status,
              workHours: 0,
              delayMinutes: delayMinutes,
              lateMinutes: delayMinutes,
              latePenalty: latePenalty,
              penaltyTier: penaltyTier,
            },
            $setOnInsert: {
              employee: employeeId,
              date: today,
              clockOut: null,
              clockOutTime: null,
              notes: "",
            },
          },
          { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        ).populate("employee", "fullName employeeId department position email avatar");

        if (savedRecord && savedRecord.toObject) {
          savedRecord = savedRecord.toObject();
        }
      } catch (dbErr) {
        console.warn("DB upsert in clockIn:", dbErr.message);
      }
    }

    if (!savedRecord) {
      savedRecord = {
        _id: "att_" + Date.now(),
        employee: employeeDoc || { _id: employeeId, fullName: req.employee?.fullName || "Employee" },
        employeeId: employeeCode,
        date: today,
        clockIn: validNow.toISOString(),
        clockInTime: validNow.toISOString(),
        clockOut: null,
        clockOutTime: null,
        status,
        workHours: 0,
        delayMinutes,
        lateMinutes: delayMinutes,
        latePenalty,
        penaltyTier,
      };
    }

    // Update live memory store
    liveAttendanceStore.set(key, savedRecord);

    // Push automated notification record targeting Admins
    try {
      const empName = employeeDoc?.fullName || req.employee?.fullName || "Employee";
      const empCode = employeeDoc?.employeeId || req.employee?.employeeId || "Staff";
      const timeStr = validNow.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      await createNotificationRecord({
        recipient_id: "admin",
        recipient_role: "admin",
        sender_id: String(employeeId),
        sender_role: "employee",
        sender_name: empName,
        title: "Employee Clock In",
        message: `${empName} (${empCode}) clocked in at ${timeStr} [${status}]`,
        type: "attendance_alert",
        category: "attendance",
        priority: status === "Late" ? "medium" : "info",
        action_url: "/admin/dashboard/attendance",
        action_label: "View Attendance",
        metadata: {
          employeeId: empCode,
          employeeName: empName,
          date: today,
          status,
          clockIn: validNow.toISOString(),
        },
      });

      // If late, also push an automated in-app notification directly to the employee
      if (status === "Late") {
        try {
          await createNotificationRecord({
            recipient_id: String(employeeId),
            recipient_role: "employee",
            sender_id: "system",
            sender_role: "system",
            sender_name: "Attendance System",
            title: "⚠️ Lateness Penalty Alert: Upcoming Payslip Impact",
            message: `You clocked in late today at ${timeStr} (${delayMinutes} min late). A penalty of GH₵${Number(latePenalty).toFixed(
              2
            )} (${penaltyTier}) will be deducted from your upcoming payslip.`,
            type: "penalty_alert",
            category: "payroll",
            priority: "high",
            action_url: "/employee/dashboard/payslips",
            action_label: "View Payslip Impact",
            metadata: {
              date: today,
              clockIn: validNow.toISOString(),
              minutesLate: delayMinutes,
              penaltyAmount: latePenalty,
              tier: penaltyTier,
            },
          });
        } catch (empNotifErr) {
          console.error("Failed to push lateness alert to employee:", empNotifErr.message);
        }
      }
    } catch (notifErr) {
      console.error("Failed to push clock-in notification:", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      alreadyClockedIn: false,
      message: `Clock in successful (${status})!`,
      attendance: savedRecord,
      status: delayMinutes > 0 ? "late" : "on-time",
      delayMinutes,
      lateMinutes: delayMinutes,
      latePenalty,
      penaltyTier,
      hasClockedIn: true,
      hasClockedOut: false,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Clock out handler - Automatic real-time recording
export const clockOut = async (req, res) => {
  try {
    let employeeId = req.employee?.id || req.employee?._id;
    const resolvedId = await resolveEmployeeObjectId(employeeId);
    if (resolvedId) employeeId = resolvedId;

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee identification required for clock out.",
      });
    }

    // Lookup employee details for rich notification
    let employeeDoc = null;
    if (isValidObjectId(employeeId)) {
      try {
        employeeDoc = await Employee.findById(employeeId)
          .select("fullName employeeId department position email avatar profile_picture")
          .lean();
      } catch (err) {
        console.warn("Could not fetch employee details for clockOut notification:", err.message);
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const key = `${employeeId}_${today}`;
    const now = new Date();

    // Check MongoDB for clock-in record
    let record = null;
    if (isValidObjectId(employeeId)) {
      try {
        record = await Attendance.findOne({
          employee: employeeId,
          date: today,
        }).populate("employee", "fullName employeeId department position email avatar");
      } catch (dbErr) {
        console.warn("DB search in clockOut:", dbErr.message);
      }
    }

    // Fallback to memory if DB query failed
    if (!record) {
      record = liveAttendanceStore.get(key);
    }

    if (!record || !record.clockIn) {
      return res.status(400).json({
        success: false,
        message: "No clock-in record found for today. Please clock in first.",
      });
    }

    if (record.clockOut) {
      return res.status(200).json({
        success: true,
        alreadyClockedOut: true,
        message: "You have already clocked out today.",
        attendance: record,
        hasClockedIn: true,
        hasClockedOut: true,
      });
    }

    // Calculate hours worked accurately
    const clockInTime = new Date(record.clockIn);
    const diffMs = Math.max(0, now.getTime() - clockInTime.getTime());
    const hoursWorked = Math.max(0.01, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));

    // Atomically persist clock-out to MongoDB
    let updatedRecord = null;
    if (isValidObjectId(employeeId)) {
      try {
        updatedRecord = await Attendance.findOneAndUpdate(
          { employee: employeeId, date: today },
          {
            $set: {
              clockOut: now,
              workHours: hoursWorked,
            },
          },
          { returnDocument: "after" }
        ).populate("employee", "fullName employeeId department position email avatar");

        if (updatedRecord && updatedRecord.toObject) {
          updatedRecord = updatedRecord.toObject();
        }
      } catch (dbErr) {
        console.warn("DB update in clockOut:", dbErr.message);
      }
    }

    if (!updatedRecord) {
      updatedRecord = {
        ...(record.toObject ? record.toObject() : record),
        clockOut: now.toISOString(),
        workHours: hoursWorked,
      };
    }

    // Update live memory store
    liveAttendanceStore.set(key, updatedRecord);

    // Push automated notification record targeting Admins
    try {
      const empName = employeeDoc?.fullName || req.employee?.fullName || "Employee";
      const empCode = employeeDoc?.employeeId || req.employee?.employeeId || "Staff";
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      await createNotificationRecord({
        recipient_id: "admin",
        recipient_role: "admin",
        sender_id: String(employeeId),
        sender_role: "employee",
        sender_name: empName,
        title: "Employee Clock Out",
        message: `${empName} (${empCode}) clocked out at ${timeStr} (${hoursWorked} hrs recorded)`,
        type: "attendance_alert",
        category: "attendance",
        priority: "info",
        action_url: "/admin/dashboard/attendance",
        action_label: "View Attendance",
        metadata: {
          employeeId: empCode,
          employeeName: empName,
          date: today,
          clockOut: now.toISOString(),
          workHours: hoursWorked,
        },
      });
    } catch (notifErr) {
      console.error("Failed to push clock-out notification:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Clock out successful (${hoursWorked} hrs recorded)!`,
      attendance: updatedRecord,
      hasClockedIn: true,
      hasClockedOut: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Current employee profile
export const getCurrentEmployee = async (req, res) => {
  try {
    let employee = null;
    const targetId = req.employee?.id || req.employee?._id;

    if (isValidObjectId(targetId)) {
      try {
        employee = await Employee.findById(targetId).select("-password").lean();
      } catch (dbErr) {
        console.warn("DB find in getCurrentEmployee:", dbErr.message);
      }
    } else if (targetId) {
      try {
        employee = await Employee.findOne({
          $or: [{ employeeId: targetId }, { email: targetId }],
        }).select("-password").lean();
      } catch (dbErr) {
        console.warn("DB find in getCurrentEmployee by identifier:", dbErr.message);
      }
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found in database.",
      });
    }

    res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Employee attendance history
export const getEmployeeAttendance = async (req, res) => {
  try {
    let employeeId = req.employee?.id || req.employee?._id;
    let attendance = [];

    if (employeeId && !isValidObjectId(employeeId)) {
      const empDoc = await Employee.findOne({
        $or: [{ employeeId: employeeId }, { email: employeeId }],
      }).lean();
      if (empDoc) {
        employeeId = empDoc._id.toString();
      }
    }

    if (isValidObjectId(employeeId)) {
      try {
        const dbAtt = await Attendance.find({
          employee: employeeId,
        })
          .populate("employee", "fullName department position employeeId email avatar")
          .sort({ date: -1, createdAt: -1 })
          .lean();

        if (dbAtt) {
          attendance = dbAtt;
        }
      } catch (dbErr) {
        console.warn("DB query in getEmployeeAttendance:", dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all attendance for admin - Live automated database sync
export const getAllAttendance = async (req, res) => {
  try {
    let attendance = [];

    try {
      const dbAtt = await Attendance.find({})
        .populate("employee", "fullName department position employeeId email avatar")
        .sort({ date: -1, createdAt: -1 })
        .lean();

      if (dbAtt) {
        attendance = dbAtt;
      }
    } catch (dbErr) {
      console.warn("DB query in getAllAttendance:", dbErr.message);
    }

    res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get today's attendance for active employee
export const getTodayAttendance = async (req, res) => {
  try {
    let employeeId = req.employee?.id || req.employee?._id;
    const today = new Date().toISOString().split("T")[0];

    let employee = null;
    let attendance = null;

    if (employeeId && !isValidObjectId(employeeId)) {
      const empDoc = await Employee.findOne({
        $or: [{ employeeId: employeeId }, { email: employeeId }],
      }).lean();
      if (empDoc) {
        employee = empDoc;
        employeeId = empDoc._id.toString();
      }
    }

    if (isValidObjectId(employeeId)) {
      try {
        if (!employee) {
          employee = await Employee.findById(employeeId)
            .select("fullName position department employeeId email avatar profile_picture")
            .lean();
        }

        const dbAtt = await Attendance.findOne({
          employee: employeeId,
          date: today,
        })
          .populate("employee", "fullName department position employeeId email avatar")
          .lean();

        if (dbAtt) {
          attendance = dbAtt;
        }
      } catch (dbErr) {
        console.warn("DB query in getTodayAttendance:", dbErr.message);
      }
    }

    const hasClockedIn = Boolean(attendance?.clockIn);
    const hasClockedOut = Boolean(attendance?.clockOut);

    res.status(200).json({
      success: true,
      employee,
      attendance,
      hasClockedIn,
      hasClockedOut,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin manual override or retroactive adjustment (optional admin tool)
export const updateAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      clockIn,
      clockOut,
      status,
      notes,
      workHours,
      delayMinutes,
      lateMinutes,
      latePenalty,
      penaltyTier,
      isExcused,
      excuseReason,
      flaggedForReview,
      flagReason,
    } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance record ID.",
      });
    }

    let settingsDoc = null;
    try {
      settingsDoc = await CompanySettings.getSingletonSettings();
    } catch {
      settingsDoc = {};
    }

    const updateFields = {};
    const safeClockIn = clockIn ? safeDateTime(null, clockIn) || new Date(clockIn) : null;
    const safeClockOut = clockOut ? safeDateTime(null, clockOut) || new Date(clockOut) : null;

    if (clockIn !== undefined) {
      updateFields.clockIn = safeClockIn && !isNaN(safeClockIn.getTime()) ? safeClockIn : null;
      if (updateFields.clockIn) {
        const penaltyEval = evaluateLatenessPenalty(
          updateFields.clockIn,
          settingsDoc?.workStartTime || "08:00",
          settingsDoc || {}
        );
        updateFields.delayMinutes = penaltyEval.minutesLate || 0;
        updateFields.lateMinutes = penaltyEval.minutesLate || 0;
        updateFields.latePenalty = penaltyEval.penalty || 0;
        updateFields.penaltyTier = penaltyEval.tier || "";
        if (status === undefined) {
          updateFields.status = penaltyEval.minutesLate > 0 ? "Late" : "On Time";
        }
      } else {
        updateFields.delayMinutes = 0;
        updateFields.lateMinutes = 0;
        updateFields.latePenalty = 0;
        updateFields.penaltyTier = "";
      }
    }

    // Explicit overrides
    if (delayMinutes !== undefined) updateFields.delayMinutes = Number(delayMinutes) || 0;
    if (lateMinutes !== undefined) updateFields.lateMinutes = Number(lateMinutes) || 0;
    if (latePenalty !== undefined) updateFields.latePenalty = Number(latePenalty) || 0;
    if (penaltyTier !== undefined) updateFields.penaltyTier = penaltyTier;
    if (isExcused !== undefined) updateFields.isExcused = Boolean(isExcused);
    if (excuseReason !== undefined) updateFields.excuseReason = excuseReason;
    if (flaggedForReview !== undefined) updateFields.flaggedForReview = Boolean(flaggedForReview);
    if (flagReason !== undefined) updateFields.flagReason = flagReason;

    if (clockOut !== undefined) {
      updateFields.clockOut = safeClockOut && !isNaN(safeClockOut.getTime()) ? safeClockOut : null;
    }
    if (status !== undefined) updateFields.status = status;
    if (notes !== undefined) updateFields.notes = notes;

    updateFields.auditLog = {
      adminId: String(req.admin?._id || req.admin?.id || "admin"),
      adminName: req.admin?.fullName || "HR Administrator",
      reason: notes || "Attendance record adjusted by admin",
      timestamp: new Date(),
    };

    if (workHours !== undefined) {
      const parsedH = Number(workHours);
      updateFields.workHours = !isNaN(parsedH) && Number.isFinite(parsedH) ? parsedH : 0;
    } else if (clockIn && clockOut) {
      updateFields.workHours = calculateWorkHours(clockIn, clockOut);
    }

    const updated = await Attendance.findByIdAndUpdate(id, { $set: updateFields }, { returnDocument: "after" })
      .populate("employee", "fullName department position employeeId email avatar")
      .lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    // If status updated to Absent or Late, notify employee
    if (status === "Absent" || status === "Late") {
      try {
        const targetEmpId = String(updated.employee?._id || updated.employee || "");
        const settingsDoc = await CompanySettings.getSingletonSettings().catch(() => ({}));
        if (status === "Absent") {
          const rate = settingsDoc?.absenceDeductionRate || 10;
          await createNotificationRecord({
            recipient_id: targetEmpId,
            recipient_role: "employee",
            sender_id: String(req.admin?.id || "admin"),
            sender_role: "admin",
            sender_name: req.admin?.fullName || "HR Administrator",
            title: "⚠️ Absence Recorded: Upcoming Payslip Deduction",
            message: `An absence for ${updated.date} was recorded. A deduction of GH₵${rate.toFixed(2)} will be applied to your upcoming payslip.`,
            type: "penalty_alert",
            category: "payroll",
            priority: "high",
            action_url: "/employee/dashboard/payslips",
            action_label: "View Payslip",
            metadata: { date: updated.date, absenceDeductionRate: rate, status: "Absent" },
          });
        } else if (status === "Late" && updated.clockIn) {
          const penaltyEval = evaluateLatenessPenalty(new Date(updated.clockIn), settingsDoc?.workStartTime || "08:00", settingsDoc || {});
          await createNotificationRecord({
            recipient_id: targetEmpId,
            recipient_role: "employee",
            sender_id: String(req.admin?.id || "admin"),
            sender_role: "admin",
            sender_name: req.admin?.fullName || "HR Administrator",
            title: "⚠️ Lateness Penalty Alert: Upcoming Payslip Impact",
            message: `A late clock-in for ${updated.date} was logged (${penaltyEval.minutesLate} min late). A penalty of GH₵${(penaltyEval.penalty || 0).toFixed(2)} will be deducted from your upcoming payslip.`,
            type: "penalty_alert",
            category: "payroll",
            priority: "high",
            action_url: "/employee/dashboard/payslips",
            action_label: "View Payslip Impact",
            metadata: { date: updated.date, clockIn: updated.clockIn, minutesLate: penaltyEval.minutesLate, penaltyAmount: penaltyEval.penalty, tier: penaltyEval.tier },
          });
        }
      } catch (notifErr) {
        console.warn("Failed to push update attendance alert:", notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Attendance record updated successfully.",
      attendance: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Manager Quick Action: Excuse lateness entry
export const excuseAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, status = "Present" } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance record ID.",
      });
    }

    const existing = await Attendance.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    const adminName = req.admin?.fullName || req.user?.fullName || "Manager";
    const excuseNote = `[Excused by ${adminName}: ${reason || "Lateness penalty waived"}]`;
    const updatedNote = existing.notes ? `${existing.notes} | ${excuseNote}` : excuseNote;

    const updateFields = {
      isExcused: true,
      excuseReason: reason || "Lateness penalty waived by management",
      excusedBy: adminName,
      excusedAt: new Date(),
      latePenalty: 0,
      penaltyTier: "Excused",
      status: status || "Present",
      notes: updatedNote,
    };

    const updated = await Attendance.findByIdAndUpdate(id, { $set: updateFields }, { returnDocument: "after" })
      .populate("employee", "fullName department position employeeId email avatar")
      .lean();

    // Push notification to employee
    try {
      const targetEmpId = String(updated.employee?._id || updated.employee || "");
      await createNotificationRecord({
        recipient_id: targetEmpId,
        recipient_role: "employee",
        sender_id: String(req.admin?.id || "admin"),
        sender_role: "admin",
        sender_name: adminName,
        title: "🎉 Lateness Penalty Excused",
        message: `Your lateness on ${updated.date} has been excused by ${adminName}. The payroll penalty has been waived. Reason: "${reason || "Management discretion"}"`,
        type: "general",
        category: "attendance",
        priority: "medium",
        action_url: "/employee/dashboard/attendance",
        action_label: "View Attendance Log",
        metadata: { date: updated.date, isExcused: true, reason },
      });
    } catch (notifErr) {
      console.warn("Failed to push excuse notification:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Lateness for ${updated.employee?.fullName || "employee"} on ${updated.date} has been excused.`,
      attendance: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Manager Quick Action: Flag attendance record for HR/disciplinary review
export const flagAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, severity = "warning" } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance record ID.",
      });
    }

    const existing = await Attendance.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    const adminName = req.admin?.fullName || req.user?.fullName || "Manager";
    const flagNote = `[Flagged by ${adminName}: ${reason || "Flagged for HR/Manager review"}]`;
    const updatedNote = existing.notes ? `${existing.notes} | ${flagNote}` : flagNote;

    const updateFields = {
      flaggedForReview: true,
      flagReason: reason || "Flagged for HR/Manager Review",
      flaggedBy: adminName,
      flaggedAt: new Date(),
      notes: updatedNote,
    };

    const updated = await Attendance.findByIdAndUpdate(id, { $set: updateFields }, { returnDocument: "after" })
      .populate("employee", "fullName department position employeeId email avatar")
      .lean();

    // Push notification to employee
    try {
      const targetEmpId = String(updated.employee?._id || updated.employee || "");
      await createNotificationRecord({
        recipient_id: targetEmpId,
        recipient_role: "employee",
        sender_id: String(req.admin?.id || "admin"),
        sender_role: "admin",
        sender_name: adminName,
        title: "⚠️ Attendance Record Flagged for Review",
        message: `Your attendance on ${updated.date} has been flagged for administrative review: "${reason || "Requires review"}".`,
        type: "penalty_alert",
        category: "attendance",
        priority: "high",
        action_url: "/employee/dashboard/attendance",
        action_label: "View Attendance Log",
        metadata: { date: updated.date, flagReason: reason, severity },
      });
    } catch (notifErr) {
      console.warn("Failed to push flag notification:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Attendance on ${updated.date} flagged for review.`,
      attendance: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Manager Quick Action: Unflag attendance record
export const unflagAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance record ID.",
      });
    }

    const updated = await Attendance.findByIdAndUpdate(
      id,
      { $set: { flaggedForReview: false, flagReason: "", flaggedBy: "", flaggedAt: null } },
      { returnDocument: "after" }
    )
      .populate("employee", "fullName department position employeeId email avatar")
      .lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendance flag removed.",
      attendance: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Manager Quick Action: Recalculate default penalty
export const recalculateAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance record ID.",
      });
    }

    const record = await Attendance.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    const settingsDoc = await CompanySettings.getSingletonSettings().catch(() => ({}));
    const updateFields = {
      isExcused: false,
      excuseReason: "",
      excusedBy: "",
      excusedAt: null,
    };

    if (record.clockIn) {
      const penaltyEval = evaluateLatenessPenalty(
        new Date(record.clockIn),
        settingsDoc?.workStartTime || "08:00",
        settingsDoc || {}
      );
      updateFields.delayMinutes = penaltyEval.minutesLate || 0;
      updateFields.lateMinutes = penaltyEval.minutesLate || 0;
      updateFields.latePenalty = penaltyEval.penalty || 0;
      updateFields.penaltyTier = penaltyEval.tier || "";
      updateFields.status = penaltyEval.minutesLate > 0 ? "Late" : "On Time";
    }

    const updated = await Attendance.findByIdAndUpdate(id, { $set: updateFields }, { returnDocument: "after" })
      .populate("employee", "fullName department position employeeId email avatar")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Attendance penalties and status recalculated according to policy.",
      attendance: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin manual entry creation
export const createManualAttendance = async (req, res) => {
  try {
    const { employeeId, date, clockIn, clockOut, status, notes } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and Date are required.",
      });
    }

    const resolvedEmpId = await resolveEmployeeObjectId(employeeId);
    if (!resolvedEmpId) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    let calculatedHours = 0;
    if (clockIn && clockOut) {
      calculatedHours = calculateWorkHours(clockIn, clockOut);
    }

    let settingsDoc = null;
    try {
      settingsDoc = await CompanySettings.getSingletonSettings();
    } catch {
      settingsDoc = {};
    }

    let delayMinutes = 0;
    let latePenalty = 0;
    let penaltyTier = "";
    let finalStatus = status || "Present";

    const safeClockInDate = clockIn ? safeDateTime(date, clockIn) : null;
    const safeClockOutDate = clockOut ? safeDateTime(date, clockOut) : null;

    if (safeClockInDate && !isNaN(safeClockInDate.getTime())) {
      const penaltyEval = evaluateLatenessPenalty(
        safeClockInDate,
        settingsDoc?.workStartTime || "08:00",
        settingsDoc || {}
      );
      delayMinutes = penaltyEval.minutesLate || 0;
      latePenalty = penaltyEval.penalty || 0;
      penaltyTier = penaltyEval.tier || "";
      if (!status) {
        finalStatus = delayMinutes > 0 ? "Late" : "On Time";
      }
    }

    const record = await Attendance.findOneAndUpdate(
      { employee: resolvedEmpId, date },
      {
        $set: {
          clockIn: safeClockInDate && !isNaN(safeClockInDate.getTime()) ? safeClockInDate : null,
          clockOut: safeClockOutDate && !isNaN(safeClockOutDate.getTime()) ? safeClockOutDate : null,
          status: finalStatus,
          notes: notes || "Admin manual entry",
          workHours: !isNaN(calculatedHours) && Number.isFinite(calculatedHours) ? calculatedHours : 0,
          delayMinutes,
          lateMinutes: delayMinutes,
          latePenalty,
          penaltyTier,
          auditLog: {
            adminId: String(req.admin?._id || req.admin?.id || "admin"),
            adminName: req.admin?.fullName || "HR Administrator",
            reason: notes || "Manual attendance entry created by admin",
            timestamp: new Date(),
          },
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).populate("employee", "fullName department position employeeId email avatar");

    // If status is Absent or Late, notify employee about upcoming deduction
    if (status === "Absent" || status === "Late") {
      try {
        const targetEmpId = String(resolvedEmpId || record?.employee?._id || record?.employee || "");
        const settingsDoc = await CompanySettings.getSingletonSettings().catch(() => ({}));
        if (status === "Absent") {
          const rate = settingsDoc?.absenceDeductionRate || 10;
          await createNotificationRecord({
            recipient_id: targetEmpId,
            recipient_role: "employee",
            sender_id: String(req.admin?.id || "admin"),
            sender_role: "admin",
            sender_name: req.admin?.fullName || "HR Administrator",
            title: "⚠️ Absence Recorded: Upcoming Payslip Deduction",
            message: `An absence for ${date} was recorded by HR. A deduction of GH₵${rate.toFixed(2)} will be applied to your upcoming payslip.`,
            type: "penalty_alert",
            category: "payroll",
            priority: "high",
            action_url: "/employee/dashboard/payslips",
            action_label: "View Payslip",
            metadata: { date, absenceDeductionRate: rate, status: "Absent" },
          });
        } else if (status === "Late" && clockIn) {
          const penaltyEval = evaluateLatenessPenalty(new Date(clockIn), settingsDoc?.workStartTime || "08:00", settingsDoc || {});
          await createNotificationRecord({
            recipient_id: targetEmpId,
            recipient_role: "employee",
            sender_id: String(req.admin?.id || "admin"),
            sender_role: "admin",
            sender_name: req.admin?.fullName || "HR Administrator",
            title: "⚠️ Lateness Penalty Alert: Upcoming Payslip Impact",
            message: `A late clock-in for ${date} was recorded (${penaltyEval.minutesLate} min late). A penalty of GH₵${(penaltyEval.penalty || 0).toFixed(2)} will be deducted from your upcoming payslip.`,
            type: "penalty_alert",
            category: "payroll",
            priority: "high",
            action_url: "/employee/dashboard/payslips",
            action_label: "View Payslip Impact",
            metadata: { date, clockIn, minutesLate: penaltyEval.minutesLate, penaltyAmount: penaltyEval.penalty, tier: penaltyEval.tier },
          });
        }
      } catch (notifErr) {
        console.warn("Failed to push manual attendance creation alert:", notifErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Manual attendance record saved successfully.",
      attendance: record,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Bulk upload daily attendance logs from biometric time-clocks (CSV import)
 * Automatically updates individual employee attendance status, work hours & lateness for the period.
 */
export const bulkUploadBiometricAttendance = async (req, res) => {
  try {
    const { records, deviceId, autoCalculateStatus = true } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No biometric attendance records provided in bulk payload.",
      });
    }

    // 1. Fetch company settings for shift start time & lateness threshold
    let settings = {
      workStartTime: "08:00",
      absenceDeductionRate: 10,
    };
    try {
      const dbSettings = await CompanySettings.findOne().lean();
      if (dbSettings) settings = { ...settings, ...dbSettings };
    } catch (err) {
      console.warn("Could not fetch company settings for bulk attendance:", err.message);
    }

    // 2. Fetch all employees for fast in-memory code/id/email lookup
    let allEmployeesList = [];
    try {
      allEmployeesList = await Employee.find({}).select("_id employeeId email fullName").lean();
    } catch (err) {
      console.warn("Could not query employees list:", err.message);
    }

    const employeeLookup = new Map();
    allEmployeesList.forEach((emp) => {
      const idStr = emp._id.toString();
      employeeLookup.set(idStr, emp);
      if (emp.employeeId) employeeLookup.set(emp.employeeId.toUpperCase().trim(), emp);
      if (emp.email) employeeLookup.set(emp.email.toLowerCase().trim(), emp);
      if (emp.fullName) employeeLookup.set(emp.fullName.toLowerCase().trim(), emp);
    });

    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];
    const processedRecords = [];

    for (let i = 0; i < records.length; i++) {
      const raw = records[i];
      const rowNum = i + 1;

      const rawEmpId = String(raw.employeeId || raw.staffId || raw.id || raw.code || raw.badgeNo || "").trim();
      const rawDate = String(raw.date || "").trim();

      if (!rawEmpId || !rawDate) {
        errors.push({
          row: rowNum,
          error: "Missing required Employee ID or Date.",
          data: raw,
        });
        continue;
      }

      // Match employee
      const matchedEmp =
        employeeLookup.get(rawEmpId) ||
        employeeLookup.get(rawEmpId.toUpperCase()) ||
        employeeLookup.get(rawEmpId.toLowerCase());

      if (!matchedEmp) {
        errors.push({
          row: rowNum,
          error: `Employee with identifier "${rawEmpId}" not found in system.`,
          data: raw,
        });
        continue;
      }

      // Normalize date (format to YYYY-MM-DD)
      let normalizedDate = rawDate;
      if (rawDate.includes("/")) {
        const parts = rawDate.split("/");
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            // DD/MM/YYYY or MM/DD/YYYY -> normalize
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            const p2 = parseInt(parts[2], 10);
            if (p0 > 12) {
              // DD/MM/YYYY
              normalizedDate = `${p2}-${String(p1).padStart(2, "0")}-${String(p0).padStart(2, "0")}`;
            } else {
              // MM/DD/YYYY or DD/MM/YYYY
              normalizedDate = `${p2}-${String(p0).padStart(2, "0")}-${String(p1).padStart(2, "0")}`;
            }
          }
        }
      }

      // Parse clockIn and clockOut
      let clockInDate = null;
      let clockOutDate = null;

      if (raw.clockIn && raw.clockIn !== "--" && raw.clockIn !== "null") {
        if (String(raw.clockIn).includes("T") || String(raw.clockIn).includes("-")) {
          clockInDate = new Date(raw.clockIn);
        } else {
          // Time only e.g. "08:15" or "08:15:00"
          const timeParts = String(raw.clockIn).trim().split(":");
          const d = new Date(`${normalizedDate}T00:00:00`);
          if (timeParts.length >= 2) {
            d.setHours(parseInt(timeParts[0], 10) || 0, parseInt(timeParts[1], 10) || 0, parseInt(timeParts[2], 10) || 0);
            clockInDate = d;
          }
        }
      }

      if (raw.clockOut && raw.clockOut !== "--" && raw.clockOut !== "null") {
        if (String(raw.clockOut).includes("T") || String(raw.clockOut).includes("-")) {
          clockOutDate = new Date(raw.clockOut);
        } else {
          const timeParts = String(raw.clockOut).trim().split(":");
          const d = new Date(`${normalizedDate}T00:00:00`);
          if (timeParts.length >= 2) {
            d.setHours(parseInt(timeParts[0], 10) || 0, parseInt(timeParts[1], 10) || 0, parseInt(timeParts[2], 10) || 0);
            clockOutDate = d;
          }
        }
      }

      // Calculate work hours
      let calculatedHours = Number(raw.workHours) || 0;
      if (!calculatedHours && clockInDate && clockOutDate) {
        const diffMs = Math.max(0, clockOutDate.getTime() - clockInDate.getTime());
        calculatedHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
      } else if (!calculatedHours && clockInDate) {
        calculatedHours = 8; // standard workday default
      }

      // Determine attendance status
      let determinedStatus = raw.status ? String(raw.status).trim() : "";
      if (!determinedStatus || autoCalculateStatus) {
        if (!clockInDate && !clockOutDate) {
          determinedStatus = "Absent";
        } else if (clockInDate) {
          const evalRes = evaluateLatenessPenalty(
            clockInDate,
            settings.workStartTime || "08:00",
            settings
          );
          if (evalRes.minutesLate > 0) {
            determinedStatus = "Late";
          } else {
            determinedStatus = "On Time";
          }
        } else {
          determinedStatus = "Present";
        }
      }

      const noteText = raw.notes || (deviceId || raw.deviceId ? `Biometric Time-Clock (Device: ${deviceId || raw.deviceId})` : "Biometric Time-Clock Log");

      try {
        const existing = await Attendance.findOne({
          employee: matchedEmp._id,
          date: normalizedDate,
        });

        if (existing) {
          existing.clockIn = clockInDate || existing.clockIn;
          existing.clockOut = clockOutDate || existing.clockOut;
          existing.workHours = calculatedHours || existing.workHours;
          existing.status = determinedStatus || existing.status;
          existing.notes = noteText;
          await existing.save();
          updatedCount++;
          processedRecords.push(existing);
        } else {
          const newRec = await Attendance.create({
            employee: matchedEmp._id,
            date: normalizedDate,
            clockIn: clockInDate,
            clockOut: clockOutDate,
            workHours: calculatedHours,
            status: determinedStatus,
            notes: noteText,
          });
          createdCount++;
          processedRecords.push(newRec);
        }
      } catch (saveErr) {
        errors.push({
          row: rowNum,
          error: saveErr.message || "Failed to save attendance record to database.",
          data: raw,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk biometric attendance uploaded: ${createdCount} created, ${updatedCount} updated, ${errors.length} skipped.`,
      stats: {
        totalReceived: records.length,
        createdCount,
        updatedCount,
        errorCount: errors.length,
      },
      errors,
    });
  } catch (error) {
    console.error("Error in bulkUploadBiometricAttendance:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process bulk biometric attendance upload.",
    });
  }
};

// Sync & Re-evaluate attendance lateness & penalty logs for current pay period
export const syncAttendancePenalties = async (req, res) => {
  try {
    let employeeId =
      req.user?._id ||
      req.user?.id ||
      req.employee?.id ||
      req.employee?._id ||
      req.body?.employeeId ||
      req.query?.employeeId;

    const isAdmin = req.user?.role === "admin" || req.user?.role === "superadmin" || req.body?.all === true;
    const resolvedId = employeeId ? await resolveEmployeeObjectId(employeeId) : null;

    let settingsDoc = null;
    try {
      settingsDoc = await CompanySettings.getSingletonSettings();
    } catch {
      settingsDoc = {};
    }

    const workStartTime = settingsDoc?.workStartTime || "08:00";
    const now = new Date();
    const currentYear = Number(req.query?.year || req.body?.year || now.getFullYear());
    const currentMonth = Number(req.query?.month || req.body?.month || (now.getMonth() + 1));
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

    // Build filter for records in the current pay period
    let filter = {};
    if (!isAdmin && resolvedId) {
      filter = {
        employee: resolvedId,
        $or: [
          { date: { $regex: `^${monthPrefix}` } },
          { clockIn: { $gte: new Date(currentYear, currentMonth - 1, 1), $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59) } },
        ],
      };
    } else {
      filter = {
        $or: [
          { date: { $regex: `^${monthPrefix}` } },
          { clockIn: { $gte: new Date(currentYear, currentMonth - 1, 1), $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59) } },
        ],
      };
    }

    const records = await Attendance.find(filter).populate("employee", "fullName employeeId email baseSalary");

    let recordsEvaluated = 0;
    let latenessCount = 0;
    let totalPenaltyDeductions = 0;

    for (const record of records) {
      if (record.clockIn) {
        const checkInDate = new Date(record.clockIn);
        if (!isNaN(checkInDate.getTime())) {
          const evalResult = evaluateLatenessPenalty(checkInDate, workStartTime, settingsDoc || {});
          const delayMins = evalResult.delayMinutes ?? evalResult.minutesLate ?? 0;
          const penaltyVal = evalResult.latePenalty ?? evalResult.penalty ?? 0;
          const tierName = evalResult.tier || (delayMins > 0 ? "Late" : "On Time");

          record.delayMinutes = delayMins;
          record.lateMinutes = delayMins;
          record.latePenalty = penaltyVal;
          record.penaltyTier = tierName;

          if (delayMins > 0) {
            record.status = "Late";
            latenessCount += 1;
            totalPenaltyDeductions += penaltyVal;
          } else if (record.status === "Late") {
            record.status = "On Time";
          }

          await record.save();
          recordsEvaluated += 1;

          // Update liveAttendanceStore as well
          const empIdStr = String(record.employee?._id || record.employee || "");
          const dateStr = record.date || checkInDate.toISOString().split("T")[0];
          if (empIdStr && dateStr) {
            const liveKey = `${empIdStr}_${dateStr}`;
            if (liveAttendanceStore.has(liveKey)) {
              const liveRec = liveAttendanceStore.get(liveKey);
              liveAttendanceStore.set(liveKey, {
                ...liveRec,
                delayMinutes: delayMins,
                lateMinutes: delayMins,
                latePenalty: penaltyVal,
                penaltyTier: tierName,
                status: record.status,
              });
            }
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully re-evaluated attendance logs for ${recordsEvaluated} records in pay period ${monthPrefix}.`,
      recordsEvaluated,
      latenessCount,
      totalPenaltyDeductions,
      payPeriod: monthPrefix,
      workStartTime,
    });
  } catch (error) {
    console.error("Error in syncAttendancePenalties:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to re-evaluate attendance penalty logs.",
    });
  }
};

// Delete attendance record permanently from database
export const deleteAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Attendance record ID parameter is required.",
      });
    }

    // Remove from in-memory reactive store
    if (liveAttendanceStore instanceof Map) {
      for (const [key, record] of liveAttendanceStore.entries()) {
        if (
          record &&
          (String(record._id) === String(id) || String(record.id) === String(id))
        ) {
          liveAttendanceStore.delete(key);
        }
      }
    } else if (Array.isArray(liveAttendanceStore)) {
      const storeIdx = liveAttendanceStore.findIndex(
        (a) => String(a._id) === String(id) || String(a.id) === String(id)
      );
      if (storeIdx !== -1) {
        liveAttendanceStore.splice(storeIdx, 1);
      }
    }

    // Remove from MongoDB Database
    let deletedDoc = null;
    try {
      if (isValidObjectId(id)) {
        deletedDoc = await Attendance.findByIdAndDelete(id);
      } else {
        deletedDoc = await Attendance.findOneAndDelete({ _id: id });
      }
    } catch (dbErr) {
      console.warn("DB delete attendance error:", dbErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Attendance record permanently deleted from database.",
      id,
    });
  } catch (error) {
    console.error("Error deleting attendance record:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete attendance record.",
    });
  }
};

// GET /api/attendance/performance-metrics
export const getPerformanceMetrics = async (req, res) => {
  try {
    const isEmployeeRole = req.user?.role === "employee" || (!req.admin && req.employee);
    let employeeId = isEmployeeRole
      ? (req.user?._id || req.user?.id || req.employee?.id || req.employee?._id)
      : (req.query?.employeeId || req.user?._id || req.user?.id);

    const { month, week, startDate, endDate } = req.query;
    const query = {};
    if (employeeId && isValidObjectId(employeeId)) {
      query.employee = employeeId;
    }
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (month) {
      query.date = { $regex: `^${month}` };
    }

    let records = [];
    try {
      records = await Attendance.find(query).sort({ date: 1 }).lean();
    } catch (dbErr) {
      console.warn("Could not query attendance records for performance:", dbErr.message);
    }

    let hoursWorked = 0;
    let onTimeCheckIns = 0;
    let lateCheckIns = 0;
    let absentDays = 0;
    let activeDays = 0;

    for (const r of records) {
      const status = (r.status || "").toLowerCase();
      const hrs = parseFloat(r.workHours) || (r.checkOut && r.checkIn ? 8 : (r.status === "Present" ? 8 : 0));
      hoursWorked += hrs;

      if (status.includes("late")) {
        lateCheckIns++;
        activeDays++;
      } else if (status.includes("absent") || status.includes("leave")) {
        absentDays++;
      } else if (status.includes("present") || hrs > 0) {
        onTimeCheckIns++;
        activeDays++;
      }
    }

    const isWeekRange = week && week !== "all";
    const requiredHours = isWeekRange ? 40 : 160;
    const shiftCompliance = requiredHours > 0 ? Math.min(100, Math.round((hoursWorked / requiredHours) * 100)) : 100;
    const punctualityRate = activeDays > 0 ? Math.round((onTimeCheckIns / activeDays) * 100) : 100;

    return res.status(200).json({
      success: true,
      data: {
        records,
        hoursWorked: Math.round(hoursWorked * 10) / 10,
        requiredHours,
        shiftCompliance,
        punctualityRate,
        activeDays,
        onTimeCheckIns,
        lateCheckIns,
        absentDays,
      },
    });
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to calculate performance metrics",
    });
  }
};


