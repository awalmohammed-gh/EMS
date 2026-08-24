import mongoose from "mongoose";
import { Attendance } from "../models/attendanceModel.js";
import { Employee } from "../models/employeeModel.js";
import { createNotificationRecord } from "./notificationController.js";

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

    // Determine status (8:30 AM threshold for standard workday)
    const startTime = new Date();
    startTime.setHours(8, 30, 0, 0);
    const status = now <= startTime ? "On Time" : "Late";

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

    const updateFields = {};
    if (clockIn !== undefined) updateFields.clockIn = clockIn ? new Date(clockIn) : null;
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

    const record = await Attendance.findOneAndUpdate(
      { employee: resolvedEmpId, date },
      {
        $set: {
          clockIn: clockIn ? new Date(clockIn) : null,
          clockOut: clockOut ? new Date(clockOut) : null,
          status: status || "Present",
          notes: notes || "Admin manual entry",
          workHours: calculatedHours,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate("employee", "fullName department position employeeId email avatar");

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
