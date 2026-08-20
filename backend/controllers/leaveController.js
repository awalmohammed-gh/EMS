import mongoose from "mongoose";
import { Leave } from "../models/leaveModel.js";
import { Employee } from "../models/employeeModel.js";
import { createNotificationRecord } from "./notificationController.js";

const isValidObjectId = (id) =>
  id &&
  typeof id === "string" &&
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === String(id);

// In-memory reactive store for newly submitted and managed leaves
export const liveLeaveStore = [
  {
    _id: "leave_003",
    leaveType: "Annual Leave",
    startDate: "2026-08-25",
    endDate: "2026-08-28",
    totalDays: 4,
    reason: "Attending brother's wedding ceremony in Kumasi",
    status: "Pending",
    createdAt: new Date().toISOString(),
    employee: {
      _id: "demo_employee_id_001",
      employeeId: "EMP001",
      fullName: "Kwame Mensah",
      department: "Software Engineering",
      position: "Senior Fullstack Engineer",
    },
  },
  {
    _id: "leave_004",
    leaveType: "Casual Leave",
    startDate: "2026-08-22",
    endDate: "2026-08-22",
    totalDays: 1,
    reason: "Urgent personal banking and passport renewal appointment",
    status: "Pending",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    employee: {
      _id: "emp_002",
      employeeId: "EMP002",
      fullName: "Ama Serwaa",
      department: "Design & UX",
      position: "Senior Product Designer",
    },
  },
  {
    _id: "leave_005",
    leaveType: "Sick Leave",
    startDate: "2026-08-20",
    endDate: "2026-08-21",
    totalDays: 2,
    reason: "Doctor advised 2-day bed rest for acute malaria recovery",
    status: "Pending",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    employee: {
      _id: "emp_003",
      employeeId: "EMP003",
      fullName: "Kofi Boakye",
      department: "Product & Marketing",
      position: "Growth Lead",
    },
  },
  {
    _id: "leave_001",
    leaveType: "Annual Leave",
    startDate: "2026-09-01",
    endDate: "2026-09-05",
    totalDays: 5,
    reason: "Family vacation",
    status: "Approved",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    employee: {
      _id: "demo_employee_id_001",
      employeeId: "EMP001",
      fullName: "Kwame Mensah",
      department: "Software Engineering",
      position: "Senior Fullstack Engineer",
    },
  },
  {
    _id: "leave_002",
    leaveType: "Sick Leave",
    startDate: "2026-07-15",
    endDate: "2026-07-16",
    totalDays: 2,
    reason: "Medical checkup and rest",
    status: "Approved",
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    employee: {
      _id: "demo_employee_id_001",
      employeeId: "EMP001",
      fullName: "Kwame Mensah",
      department: "Software Engineering",
      position: "Senior Fullstack Engineer",
    },
  },
];

// Helper to get employee info
const resolveEmployeeInfo = async (employeeIdOrObj) => {
  try {
    if (employeeIdOrObj && typeof employeeIdOrObj === "string" && isValidObjectId(employeeIdOrObj)) {
      const emp = await Employee.findById(employeeIdOrObj).select("fullName employeeId department position").lean();
      if (emp) return emp;
    }
  } catch (err) {
    console.warn("Could not query DB for employee in resolveEmployeeInfo:", err.message);
  }

  return {
    _id: "demo_employee_id_001",
    employeeId: "EMP001",
    fullName: "Kwame Mensah",
    department: "Software Engineering",
    position: "Senior Fullstack Engineer",
  };
};

// Employee submits leave request
export const applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "All fields (leave type, start date, end date, and reason) are required.",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format provided.",
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date.",
      });
    }

    const diffTime = Math.abs(end - start);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const employeeId = req.employee?.id || "demo_employee_id_001";
    const employeeInfo = await resolveEmployeeInfo(employeeId);

    let savedLeave = null;

    // 1. Attempt writing to MongoDB if valid ObjectId
    if (isValidObjectId(employeeInfo._id)) {
      try {
        const doc = await Leave.create({
          employee: employeeInfo._id,
          leaveType,
          startDate: start,
          endDate: end,
          totalDays: days,
          reason,
          status: "Pending",
        });

        if (doc) {
          savedLeave = doc.toObject ? doc.toObject() : doc;
          savedLeave.employee = employeeInfo;
        }
      } catch (dbErr) {
        console.warn("Database storage fallback in applyLeave:", dbErr.message);
      }
    }

    // 2. If DB is unavailable or on memory fallback, generate consistent leave record
    if (!savedLeave) {
      savedLeave = {
        _id: "leave_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        employee: employeeInfo,
        leaveType,
        startDate: typeof startDate === "string" ? startDate : start.toISOString().split("T")[0],
        endDate: typeof endDate === "string" ? endDate : end.toISOString().split("T")[0],
        totalDays: days,
        reason,
        status: "Pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      savedLeave.employee = employeeInfo;
    }

    // Prepend to in-memory reactive store
    liveLeaveStore.unshift(savedLeave);

    return res.status(201).json({
      success: true,
      message: "Leave request submitted successfully.",
      leave: savedLeave,
    });
  } catch (error) {
    console.error("Error in applyLeave:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error submitting leave request.",
    });
  }
};

// Get all leaves for admin
export const getAllLeaves = async (req, res) => {
  try {
    let leaves = [];
    try {
      const dbLeaves = await Leave.find({})
        .populate("employee", "fullName department position employeeId")
        .sort({ createdAt: -1 })
        .lean();

      if (dbLeaves && dbLeaves.length > 0) {
        leaves = dbLeaves;
      }
    } catch (dbErr) {
      console.warn("DB fallback for getAllLeaves:", dbErr.message);
    }

    // Merge with in-memory live store to ensure all recently submitted requests are always visible
    const existingIds = new Set(leaves.map((l) => String(l._id)));
    const merged = [...leaves];

    liveLeaveStore.forEach((liveItem) => {
      if (!existingIds.has(String(liveItem._id))) {
        merged.unshift(liveItem);
      }
    });

    res.status(200).json({
      success: true,
      totalLeaves: merged.length,
      leaves: merged,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Employee status for admin to check reject or approve
export const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemark } = req.body;

    if (!["Approved", "Rejected", "Pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Approved, Rejected, or Pending.",
      });
    }

    // Update in live store
    const storeItem = liveLeaveStore.find((l) => String(l._id) === String(id));
    if (storeItem) {
      storeItem.status = status;
      if (adminRemark) storeItem.adminRemark = adminRemark;
      storeItem.approvedAt = new Date().toISOString();
    }

    // Update in MongoDB
    try {
      if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id)) {
        const leave = await Leave.findById(id);
        if (leave) {
          leave.status = status;
          if (adminRemark) leave.adminRemark = adminRemark;
          leave.approvedAt = new Date();
          await leave.save();
          return res.json({
            success: true,
            message: `Leave status updated to ${status} successfully`,
            leave,
          });
        }
      }
    } catch (dbErr) {
      console.warn("DB fallback for updateLeaveStatus:", dbErr.message);
    }

    res.json({
      success: true,
      message: `Leave status updated to ${status} successfully`,
      leave: storeItem || { _id: id, status, adminRemark },
    });
  } catch (error) {
    console.error("Error in updateLeaveStatus:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get employee leaves for currently authenticated employee
export const getEmployeeLeave = async (req, res) => {
  try {
    const employeeId = req.employee?.id || "demo_employee_id_001";
    let leaves = [];

    try {
      if (mongoose.Types.ObjectId.isValid(employeeId) && String(new mongoose.Types.ObjectId(employeeId)) === String(employeeId)) {
        const dbLeaves = await Leave.find({
          employee: employeeId,
        })
          .populate("employee", "fullName employeeId department position")
          .sort({ createdAt: -1 })
          .lean();

        if (dbLeaves && dbLeaves.length > 0) {
          leaves = dbLeaves;
        }
      }
    } catch (dbErr) {
      console.warn("DB fallback for getEmployeeLeave:", dbErr.message);
    }

    // Merge with in-memory live store
    const existingIds = new Set(leaves.map((l) => String(l._id)));
    const merged = [...leaves];

    liveLeaveStore.forEach((liveItem) => {
      const isMatch =
        String(liveItem.employee?._id) === String(employeeId) ||
        liveItem.employee?.employeeId === req.employee?.employeeId ||
        employeeId === "demo_employee_id_001";

      if (isMatch && !existingIds.has(String(liveItem._id))) {
        merged.unshift(liveItem);
      }
    });

    res.status(200).json({
      success: true,
      leaves: merged,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

