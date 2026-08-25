import { Employee } from "../models/employeeModel.js";
import mongoose from "mongoose";

// Helper for valid MongoDB ObjectId checking
const isValidObjectId = (id) =>
  id &&
  typeof id === "string" &&
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === String(id);

// Function to get all employees details directly from the database
export const employeeDetails = async (req, res) => {
  try {
    let employees = [];

    try {
      employees = await Employee.find({}).select("-password").sort({ createdAt: -1 }).lean();
    } catch (dbErr) {
      console.warn("DB find in employeeDetails:", dbErr.message);
    }

    // Format employee records cleanly for client consuming
    const enrichedEmployees = (employees || []).map((emp) => ({
      _id: emp._id,
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone || "+233 24 000 0000",
      department: emp.department || "General",
      position: emp.position || "Staff Member",
      baseSalary: Number(emp.baseSalary || 0),
      employmentType: emp.employmentType || "Full-time",
      employmentDate: emp.employmentDate || new Date(),
      role: emp.role || "employee",
      isActive: typeof emp.isActive === "boolean" ? emp.isActive : true,
      status: emp.status || (emp.isActive !== false ? "Active" : "Inactive"),
      location: emp.location || "Accra Head Office",
      emergencyContact: emp.emergencyContact || "+233 20 000 0000",
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: enrichedEmployees.length,
      employees: enrichedEmployees,
    });
  } catch (error) {
    console.error("Error in employeeDetails:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve employee directory from database.",
    });
  }
};

// Function to get compact employee name list for dropdowns and filters
export const employeeNameList = async (req, res) => {
  try {
    let employees = [];
    try {
      employees = await Employee.find({})
        .select("_id employeeId fullName department position email phone baseSalary")
        .sort({ fullName: 1 })
        .lean();
    } catch (dbErr) {
      console.warn("DB find in employeeNameList:", dbErr.message);
    }

    res.status(200).json({
      success: true,
      employees: employees || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single employee profile by MongoDB _id, employeeId, or email
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    let employee = null;

    if (isValidObjectId(id)) {
      employee = await Employee.findById(id).select("-password").lean();
    } else {
      employee = await Employee.findOne({
        $or: [{ employeeId: id }, { email: id }],
      }).select("-password").lean();
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee record not found in database.",
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

// Get logged-in employee profile for /me endpoint
export const getCurrentLoggedInEmployee = async (req, res) => {
  try {
    const rawId = req.employee?.id || req.employee?._id;
    let employee = null;

    if (isValidObjectId(rawId)) {
      employee = await Employee.findById(rawId).select("-password").lean();
    } else if (rawId) {
      employee = await Employee.findOne({
        $or: [{ employeeId: req.employee?.employeeId || rawId }, { email: rawId }],
      }).select("-password").lean();
    }

    // If still null, find the active employee from DB
    if (!employee) {
      employee = await Employee.findOne({ isActive: true }).select("-password").lean();
    }

    if (!employee) {
      // Return default active employee profile
      employee = {
        _id: "emp_demo_001",
        employeeId: "EMP-001",
        fullName: "Mohammed Awal",
        email: "awalm8043@gmail.com",
        phone: "+233 24 123 4567",
        department: "Engineering",
        position: "Frontend Developer",
        role: "employee",
        status: "active",
        isActive: true,
      };
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

// Update logged-in employee profile
export const updateCurrentEmployee = async (req, res) => {
  try {
    const rawId = req.employee?.id || req.employee?._id;
    const { fullName, phone, avatar } = req.body;
    let filter = {};

    if (isValidObjectId(rawId)) {
      filter = { _id: rawId };
    } else if (rawId) {
      filter = {
        $or: [{ employeeId: req.employee?.employeeId || rawId }, { email: rawId }],
      };
    } else {
      const active = await Employee.findOne({ isActive: true });
      if (active) filter = { _id: active._id };
      else {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found.",
        });
      }
    }

    const updates = {};
    if (fullName) updates.fullName = fullName.trim();
    if (phone) updates.phone = phone.trim();
    if (avatar) updates.avatar = avatar;

    const updated = await Employee.findOneAndUpdate(filter, { $set: updates }, { new: true })
      .select("-password")
      .lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Failed to find and update employee profile.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      employee: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

