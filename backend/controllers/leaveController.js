import mongoose from "mongoose";
import { Leave } from "../models/leaveModel.js";
import { Employee } from "../models/employeeModel.js";
import { createNotificationRecord } from "./notificationController.js";

const isValidObjectId = (id) =>
  id &&
  typeof id === "string" &&
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === String(id);

// Live reactive store for newly submitted and managed leaves (populated from real submissions and DB)
export const liveLeaveStore = [];

// Helper to get employee info directly from Database
const resolveEmployeeInfo = async (employeeIdOrObj) => {
  try {
    if (employeeIdOrObj && typeof employeeIdOrObj === "string" && isValidObjectId(employeeIdOrObj)) {
      const emp = await Employee.findById(employeeIdOrObj).select("fullName employeeId department position email").lean();
      if (emp) return emp;
    } else if (employeeIdOrObj) {
      const emp = await Employee.findOne({
        $or: [{ employeeId: employeeIdOrObj }, { email: employeeIdOrObj }],
      }).select("fullName employeeId department position email").lean();
      if (emp) return emp;
    }
  } catch (err) {
    console.warn("Could not query DB for employee in resolveEmployeeInfo:", err.message);
  }

  return null;
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

    const employeeId = req.employee?.id || req.employee?._id;
    const employeeInfo = await resolveEmployeeInfo(employeeId);

    if (!employeeInfo) {
      return res.status(401).json({
        success: false,
        message: "Employee profile not found. Please log in again.",
      });
    }

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

    // Generate real-time notification for Admin
    try {
      await createNotificationRecord({
        recipient_id: "admin",
        recipient_role: "admin",
        sender_id: String(employeeInfo._id || employeeInfo.employeeId || "emp_001"),
        sender_role: "employee",
        sender_name: employeeInfo.fullName || "Employee",
        title: `New ${leaveType} Submitted`,
        message: `${employeeInfo.fullName || "An employee"} (${employeeInfo.department || "General"}) submitted a ${days}-day ${leaveType} request (${savedLeave.startDate} to ${savedLeave.endDate}) pending approval.`,
        type: "leave_request",
        category: "leave",
        priority: "high",
        action_url: "/admin/leave",
        action_label: "Review Leave",
        metadata: {
          leaveId: savedLeave._id,
          employeeName: employeeInfo.fullName,
          department: employeeInfo.department,
          leaveType,
          totalDays: days,
          startDate: savedLeave.startDate,
          endDate: savedLeave.endDate,
        },
      });
    } catch (notifErr) {
      console.warn("Could not dispatch admin leave notification:", notifErr.message);
    }

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

    // Generate real-time notification for Employee
    try {
      const recipientEmpId = storeItem?.employee?._id || storeItem?.employee?.employeeId;
      const leaveType = storeItem?.leaveType || "Leave";
      const days = storeItem?.totalDays || 1;
      const remarkText = adminRemark ? ` Reason/Remark: "${adminRemark}"` : "";

      if (recipientEmpId) {
        await createNotificationRecord({
          recipient_id: String(recipientEmpId),
          recipient_role: "employee",
          sender_id: "admin",
          sender_role: "admin",
          sender_name: "Human Resources / Admin",
          title: status === "Approved" ? `Leave Request Approved` : `Leave Request ${status}`,
          message: `Your ${days}-day ${leaveType} request has been ${status.toLowerCase()} by management.${remarkText}`,
          type: status === "Approved" ? "leave_approved" : "leave_rejected",
          category: "leave",
          priority: status === "Approved" ? "high" : "medium",
          action_url: "/employee/dashboard/leave",
          action_label: "View Leave Status",
          metadata: {
            leaveId: id,
            status,
            adminRemark,
            leaveType,
            totalDays: days,
          },
        });
      }
    } catch (notifErr) {
      console.warn("Could not dispatch employee leave status notification:", notifErr.message);
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
    const rawEmployeeId = req.employee?.id || req.employee?._id;
    let validObjectId = null;

    if (isValidObjectId(rawEmployeeId)) {
      validObjectId = rawEmployeeId;
    } else if (rawEmployeeId) {
      try {
        const emp = await Employee.findOne({
          $or: [{ employeeId: rawEmployeeId }, { email: rawEmployeeId }],
        }).select("_id").lean();
        if (emp) validObjectId = emp._id.toString();
      } catch (err) {
        console.warn("DB employee lookup in getEmployeeLeave:", err.message);
      }
    }

    let leaves = [];

    if (validObjectId) {
      try {
        const dbLeaves = await Leave.find({
          employee: validObjectId,
        })
          .populate("employee", "fullName employeeId department position")
          .sort({ createdAt: -1 })
          .lean();

        if (dbLeaves && dbLeaves.length > 0) {
          leaves = dbLeaves;
        }
      } catch (dbErr) {
        console.warn("DB query for getEmployeeLeave:", dbErr.message);
      }
    }

    // Merge with in-memory live store for this employee
    if (liveLeaveStore.length > 0 && (rawEmployeeId || validObjectId)) {
      const existingIds = new Set(leaves.map((l) => String(l._id)));
      liveLeaveStore.forEach((liveItem) => {
        const isMatch =
          String(liveItem.employee?._id) === String(validObjectId) ||
          String(liveItem.employee?._id) === String(rawEmployeeId) ||
          liveItem.employee?.employeeId === rawEmployeeId;

        if (isMatch && !existingIds.has(String(liveItem._id))) {
          leaves.unshift(liveItem);
        }
      });
    }

    res.status(200).json({
      success: true,
      leaves,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

