import { Attendance } from "../models/attendanceModel.js";
import { Employee } from "../models/employeeModel.js";

export const clockIn = async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const today = new Date().toISOString().split("T")[0];

    // Check if already clocked in today
    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    }).lean();

    if (existingAttendance) {
      return res.status(200).json({
        success: true,
        alreadyClockedIn: true,
        message: "You have already clocked in today.",
        attendance: existingAttendance,
      });
    }

    const now = new Date();

    const startTime = new Date();
    startTime.setHours(8, 30, 0, 0);

    const status = now <= startTime ? "On Time" : "Late";

    const attendance = await Attendance.create({
      employee: employeeId,
      date: today,
      clockIn: now,
      status,
    });

    return res.status(201).json({
      success: true,
      alreadyClockedIn: false,
      message: "Clocked in successfully.",
      attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//clock out
export const clockOut = async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const today = new Date().toISOString().split("T")[0];

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "You have not clocked in today.",
      });
    }

    if (attendance.clockOut) {
      return res.status(400).json({
        success: false,
        message: "You have already clocked out.",
      });
    }

    const now = new Date();

    attendance.clockOut = now;

    const hoursWorked =
      (attendance.clockOut.getTime() - attendance.clockIn.getTime()) /
      (1000 * 60 * 60);

    attendance.workHours = Number(hoursWorked.toFixed(2));

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Clocked out successfully.",
      attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCurrentEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.employee.id)
      .select("-password")
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
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

export const getEmployeeAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({
      employee: req.employee.id,
    }).sort({ date: -1 });

    if (attendance.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No attendance records found.",
      });
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

//get all attendance

export const getAllAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({})
      .populate("employee", "fullName department position")
      .sort({ date: -1 });

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

// get today attendance
export const getTodayAttendance = async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const today = new Date().toISOString().split("T")[0];

    // Get employee details
    const employee = await Employee.findById(employeeId)
      .select("fullName position department")
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // Get today's attendance
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    }).lean();

    res.status(200).json({
      success: true,
      employee,
      attendance,
      hasClockedIn: !!attendance?.clockIn,
      hasClockedOut: !!attendance?.clockOut,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};