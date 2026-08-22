import mongoose from "mongoose";
import { Attendance } from "../models/attendanceModel.js";
import { Employee } from "../models/employeeModel.js";

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

// Clock in handler
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

    const today = new Date().toISOString().split("T")[0];
    const key = `${employeeId}_${today}`;
    const now = new Date();

    // Determine status (8:30 AM threshold)
    const startTime = new Date();
    startTime.setHours(8, 30, 0, 0);
    const status = now <= startTime ? "On Time" : "Late";

    // 1. Check live in-memory store
    let liveRecord = liveAttendanceStore.get(key);
    if (liveRecord && liveRecord.clockIn) {
      return res.status(200).json({
        success: true,
        alreadyClockedIn: true,
        message: "You have already clocked in today.",
        attendance: liveRecord,
      });
    }

    // 2. Check MongoDB
    if (isValidObjectId(employeeId)) {
      try {
        const existingAttendance = await Attendance.findOne({
          employee: employeeId,
          date: today,
        }).lean();

        if (existingAttendance && existingAttendance.clockIn) {
          liveAttendanceStore.set(key, existingAttendance);
          return res.status(200).json({
            success: true,
            alreadyClockedIn: true,
            message: "You have already clocked in today.",
            attendance: existingAttendance,
          });
        }
      } catch (dbErr) {
        console.warn("DB check in clockIn skipped:", dbErr.message);
      }
    }

    // 3. Create new attendance record
    let newRecord = {
      _id: "att_" + Date.now(),
      employee: employeeId,
      date: today,
      clockIn: now.toISOString(),
      clockOut: null,
      status,
      workHours: 0,
    };

    // Attempt MongoDB save
    if (isValidObjectId(employeeId)) {
      try {
        const dbCreated = await Attendance.create({
          employee: employeeId,
          date: today,
          clockIn: now,
          status,
        });
        if (dbCreated) {
          newRecord = dbCreated.toObject ? dbCreated.toObject() : dbCreated;
        }
      } catch (dbErr) {
        console.warn("DB create in clockIn:", dbErr.message);
      }
    }

    // Update live memory store
    liveAttendanceStore.set(key, newRecord);

    return res.status(201).json({
      success: true,
      alreadyClockedIn: false,
      message: "Clocked in successfully.",
      attendance: newRecord,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Clock out handler
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

    const today = new Date().toISOString().split("T")[0];
    const key = `${employeeId}_${today}`;
    const now = new Date();

    let record = liveAttendanceStore.get(key);

    // If not in memory, check MongoDB
    if (!record && isValidObjectId(employeeId)) {
      try {
        const dbRecord = await Attendance.findOne({
          employee: employeeId,
          date: today,
        });
        if (dbRecord) {
          record = {
            _id: dbRecord._id.toString(),
            employee: employeeId,
            date: dbRecord.date,
            clockIn: dbRecord.clockIn ? new Date(dbRecord.clockIn).toISOString() : null,
            clockOut: dbRecord.clockOut ? new Date(dbRecord.clockOut).toISOString() : null,
            status: dbRecord.status || "On Time",
            workHours: dbRecord.workHours || 0,
          };
        }
      } catch (dbErr) {
        console.warn("DB search in clockOut skipped:", dbErr.message);
      }
    }

    if (!record || !record.clockIn) {
      return res.status(400).json({
        success: false,
        message: "No clock-in record found for today. Please clock in first.",
      });
    }

    if (record.clockOut) {
      return res.status(400).json({
        success: false,
        message: "You have already clocked out today.",
        attendance: record,
      });
    }

    // Calculate hours worked
    const clockInTime = new Date(record.clockIn);
    const diffMs = Math.max(0, now.getTime() - clockInTime.getTime());
    const hoursWorked = Math.max(0.1, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));

    record.clockOut = now.toISOString();
    record.workHours = hoursWorked;

    // Update MongoDB if available
    if (isValidObjectId(employeeId)) {
      try {
        await Attendance.findOneAndUpdate(
          { employee: employeeId, date: today },
          { clockOut: now, workHours: hoursWorked },
          { new: true },
        );
      } catch (dbErr) {
        console.warn("DB update in clockOut:", dbErr.message);
      }
    }

    // Update live memory store
    liveAttendanceStore.set(key, record);

    return res.status(200).json({
      success: true,
      message: "Clocked out successfully.",
      attendance: record,
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

    // If ID is not an ObjectId, lookup employee document to get real ObjectId
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
        }).sort({ date: -1 }).lean();

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

// Get all attendance for admin
export const getAllAttendance = async (req, res) => {
  try {
    let attendance = [];

    try {
      const dbAtt = await Attendance.find({})
        .populate("employee", "fullName department position employeeId email")
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
          employee = await Employee.findById(employeeId).select("fullName position department employeeId").lean();
        }

        const dbAtt = await Attendance.findOne({
          employee: employeeId,
          date: today,
        }).lean();

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
