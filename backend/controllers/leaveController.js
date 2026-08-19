import { Leave } from "../models/leaveModel.js";

// Employee submits leave request
export const applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date.",
      });
    }

    // Calculate total leave days
    const days =
      Math.ceil(
        (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24),
      ) + 1;

    const leave = await Leave.create({
      employee: req.employee.id,
      leaveType,
      startDate,
      endDate,
      totalDays: days,
      reason,
      status: "Pending",
    });

    res.status(201).json({
      success: true,
      message: "Leave request submitted successfully.",
      leave,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//get all the leaves

export const getAllLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({})
      .populate("employee", "fullName department position employeeId")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      totalLeaves: leaves.length,
      leaves,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



//employee status for admin to check reject or approved
export const updateLeaveStatus = async (req, res) => {
  try {

    const { id } = req.params;
    const { status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either Approved or Rejected.",
      });
    }

    const leave = await Leave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found.",
      });
    }

    leave.status = status;

    await leave.save();

    res.json({
      success: true,
      message: "Leave status updated successfully",
      leave
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success:false,
      message:error.message
    });
  }
};

export const getEmployeeLeave = async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const leaves = await Leave.find({
      employee: employeeId,
    })
      .populate("employee", "fullName employeeId department position")
      .sort({ createdAt: -1 })
      .lean();

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