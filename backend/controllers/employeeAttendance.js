import mongoose from "mongoose";
import { Attendance } from "../models/attendanceModel.js";
import { Employee } from "../models/employeeModel.js";
import { CompanySettings } from "../models/CompanySettings.js";
import { createNotificationRecord } from "./notificationController.js";
import { evaluateLatenessPenalty } from "./payrollController.js";

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
    let employeeId = req.employee?.id || req.employee?._id;
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
          .select("fullName employeeId department position email avatar profile_picture")
          .lean();
      } catch (err) {
        console.warn("Could not fetch employee details for clockIn:", err.message);
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const key = `${employeeId}_${today}`;
    const now = new Date();

    // Fetch active CompanySettings for work start time and lateness penalty matrix
    let settingsDoc = null;
    try {
      settingsDoc = await CompanySettings.getSingletonSettings();
    } catch (err) {
      settingsDoc = {};
    }

    const workStartTime = settingsDoc?.workStartTime || "08:00";
    const penaltyEval = evaluateLatenessPenalty(now, workStartTime, settingsDoc || {});
    const delayMinutes = penaltyEval.minutesLate || 0;
    const latePenalty = penaltyEval.penalty || 0;
    const penaltyTier = penaltyEval.tier || "";
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

    if (existingDoc && existingDoc.clockIn) {
      liveAttendanceStore.set(key, existingDoc);
      return res.status(200).json({
        success: true,
        alreadyClockedIn: true,
        message: "You have already clocked in today.",
        attendance: existingDoc,
        hasClockedIn: true,
        hasClockedOut: Boolean(existingDoc.clockOut),
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
              clockIn: now,
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
              notes: "",
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
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
        date: today,
        clockIn: now.toISOString(),
        clockOut: null,
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
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

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
          clockIn: now.toISOString(),
        },
      });
      // If late, also push an automated in-app notification directly to the employee
      if (status === "Late") {
        try {
          let settingsDoc = null;
          try {
            settingsDoc = await CompanySettings.getSingletonSettings();
          } catch {
            settingsDoc = {};
          }
          const penaltyEval = evaluateLatenessPenalty(
            now,
            settingsDoc?.workStartTime || "08:00",
            settingsDoc || {}
          );
          const penaltyAmount = penaltyEval.penalty || 0;
          const minutesLate = penaltyEval.minutesLate || 0;
          const tierName = penaltyEval.tier || "Late";

          await createNotificationRecord({
            recipient_id: String(employeeId),
            recipient_role: "employee",
            sender_id: "system",
            sender_role: "system",
            sender_name: "Attendance System",
            title: "⚠️ Lateness Penalty Alert: Upcoming Payslip Impact",
            message: `You clocked in late today at ${timeStr} (${minutesLate} min late). A penalty of GH₵${penaltyAmount.toFixed(
              2
            )} (${tierName}) will be deducted from your upcoming payslip.`,
            type: "penalty_alert",
            category: "payroll",
            priority: "high",
            action_url: "/employee/dashboard/payslips",
            action_label: "View Payslip Impact",
            metadata: {
              date: today,
              clockIn: now.toISOString(),
              minutesLate,
              penaltyAmount,
              tier: tierName,
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
          { new: true }
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
    const { clockIn, clockOut, status, notes, workHours } = req.body;

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
    if (clockIn !== undefined) {
      updateFields.clockIn = clockIn ? new Date(clockIn) : null;
      if (clockIn) {
        const penaltyEval = evaluateLatenessPenalty(
          new Date(clockIn),
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
    if (clockOut !== undefined) updateFields.clockOut = clockOut ? new Date(clockOut) : null;
    if (status !== undefined) updateFields.status = status;
    if (notes !== undefined) updateFields.notes = notes;
    if (workHours !== undefined) updateFields.workHours = Number(workHours);

    const updated = await Attendance.findByIdAndUpdate(id, { $set: updateFields }, { new: true })
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
      const inTime = new Date(clockIn);
      const outTime = new Date(clockOut);
      const diff = Math.max(0, outTime.getTime() - inTime.getTime());
      calculatedHours = Number((diff / (1000 * 60 * 60)).toFixed(2));
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

    if (clockIn) {
      const penaltyEval = evaluateLatenessPenalty(
        new Date(clockIn),
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
          clockIn: clockIn ? new Date(clockIn) : null,
          clockOut: clockOut ? new Date(clockOut) : null,
          status: finalStatus,
          notes: notes || "Admin manual entry",
          workHours: calculatedHours,
          delayMinutes,
          lateMinutes: delayMinutes,
          latePenalty,
          penaltyTier,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
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


