import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Admin } from "../models/Admin.js";
import { Employee } from "../models/employeeModel.js";
import { Payroll } from "../models/payrollModel.js";
import { Attendance } from "../models/attendanceModel.js";
import { Leave } from "../models/leaveModel.js";
import { Settings } from "../models/adminSettingsModel.js";
import { Notification } from "../models/notificationModel.js";

// Function for creating admin account (Admin-only restricted)
export const createAdminAccount = async (req, res) => {
  try {
    const { full_name, fullName, email, password, role, profile_image_url, profileImageUrl } =
      req.body;

    const name = (full_name || fullName || "").trim();
    const cleanEmail = (email || "").toLowerCase().trim();
    const plainPassword = password;
    const adminRole = role === "super_admin" ? "super_admin" : "admin";
    const profileImage = profile_image_url || profileImageUrl || "";

    // 1. Validate required fields
    if (!name || !cleanEmail || !plainPassword) {
      return res.status(400).json({
        success: false,
        message: "full_name, email, and password are required fields.",
      });
    }

    if (plainPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    // 2. Check if admin with this email already exists in DB
    const existingAdmin = await Admin.findOne({ email: cleanEmail });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "An admin with this email address already exists.",
      });
    }

    // 3. Hash password using bcrypt (10 rounds)
    const password_hash = await bcrypt.hash(plainPassword, 10);

    // 4. Save the new admin document
    const newAdmin = new Admin({
      full_name: name,
      email: cleanEmail,
      password_hash,
      role: adminRole,
      profile_image_url: profileImage,
    });

    const savedAdmin = await newAdmin.save();

    // 5. Return success response without exposing password hash
    return res.status(201).json({
      success: true,
      message: "Admin account created successfully.",
      admin: {
        _id: savedAdmin._id,
        id: savedAdmin._id,
        full_name: savedAdmin.full_name,
        fullName: savedAdmin.full_name,
        email: savedAdmin.email,
        role: savedAdmin.role,
        profile_image_url: savedAdmin.profile_image_url,
        createdAt: savedAdmin.createdAt,
        updatedAt: savedAdmin.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating admin account:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while creating admin account.",
    });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_key_12345";
    let authenticatedAdmin = null;

    // 1. Check MongoDB Admin collection
    const dbAdmin = await Admin.findOne({ email: cleanEmail });
    if (!dbAdmin || !dbAdmin.password_hash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password credentials.",
      });
    }

    const isMatch = await bcrypt.compare(password, dbAdmin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password credentials.",
      });
    }

    authenticatedAdmin = {
      id: String(dbAdmin._id),
      _id: String(dbAdmin._id),
      fullName: dbAdmin.full_name,
      full_name: dbAdmin.full_name,
      email: dbAdmin.email,
      role: dbAdmin.role || "admin",
      profile_image_url: dbAdmin.profile_image_url || "",
    };

    if (!authenticatedAdmin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password credentials.",
      });
    }

    const token = jwt.sign(
      {
        id: authenticatedAdmin.id,
        email: authenticatedAdmin.email,
        role: authenticatedAdmin.role,
        fullName: authenticatedAdmin.fullName,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      admin: authenticatedAdmin,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Function for admin to logout
export const adminLogout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Admin logged out successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};

// Function to get admin profile details
export const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin?.id || req.admin?._id;
    let adminData = null;

    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      try {
        const dbAdmin = await Admin.findById(adminId).lean();
        if (dbAdmin) {
          adminData = {
            id: String(dbAdmin._id),
            _id: String(dbAdmin._id),
            fullName: dbAdmin.full_name,
            full_name: dbAdmin.full_name,
            email: dbAdmin.email,
            role: dbAdmin.role || "admin",
            department: "Executive Management",
            position: dbAdmin.role === "super_admin" ? "Super Admin" : "Principal Administrator",
            avatar: dbAdmin.profile_image_url || "",
            profile_image_url: dbAdmin.profile_image_url || "",
          };
        }
      } catch (err) {
        console.warn("DB lookup in getAdminProfile:", err.message);
      }
    }

    if (!adminData) {
      const adminEmail = process.env.ADMIN_EMAIL || req.admin?.email || "admin@eyenit.com";
      const adminName = process.env.ADMIN_NAME || req.admin?.fullName || "System Administrator";
      const adminRole = req.admin?.role || "admin";

      adminData = {
        id: adminId || "admin_001",
        fullName: adminName,
        full_name: adminName,
        email: adminEmail,
        role: adminRole,
        department: "Executive Management",
        position: adminRole === "super_admin" ? "Super Admin" : "Principal System Administrator",
        avatar: "",
        profile_image_url: "",
      };
    }

    return res.status(200).json({
      success: true,
      admin: adminData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Function to update admin profile details
export const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin?.id || req.admin?._id;
    const { fullName, full_name, email, phone, avatar, profile_image_url, position, department } = req.body;

    const nameToUpdate = (fullName || full_name || "").trim();
    const emailToUpdate = (email || "").toLowerCase().trim();

    let dbAdmin = null;
    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      dbAdmin = await Admin.findById(adminId);
    }

    if (!dbAdmin) {
      // Fallback: look up by current email or get the primary admin
      if (req.admin?.email) {
        dbAdmin = await Admin.findOne({ email: req.admin.email.toLowerCase().trim() });
      }
      if (!dbAdmin) {
        dbAdmin = await Admin.findOne();
      }
    }

    if (dbAdmin) {
      if (nameToUpdate) dbAdmin.full_name = nameToUpdate;
      if (emailToUpdate) dbAdmin.email = emailToUpdate;
      if (phone !== undefined) dbAdmin.phone = phone;
      if (avatar || profile_image_url) {
        dbAdmin.profile_image_url = avatar || profile_image_url;
        dbAdmin.avatar = avatar || profile_image_url;
      }
      if (position) dbAdmin.position = position;
      if (department) dbAdmin.department = department;

      const savedAdmin = await dbAdmin.save();

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        admin: {
          id: String(savedAdmin._id),
          _id: String(savedAdmin._id),
          fullName: savedAdmin.full_name,
          full_name: savedAdmin.full_name,
          email: savedAdmin.email,
          phone: savedAdmin.phone || "",
          role: savedAdmin.role || "admin",
          department: savedAdmin.department || "Executive Management",
          position: savedAdmin.position || (savedAdmin.role === "super_admin" ? "Super Admin" : "Principal Administrator"),
          avatar: savedAdmin.profile_image_url || "",
          profile_image_url: savedAdmin.profile_image_url || "",
        },
      });
    }

    // In case no Admin doc existed yet, return the requested payload
    return res.status(200).json({
      success: true,
      message: "Profile saved successfully.",
      admin: {
        id: adminId || "admin_001",
        fullName: nameToUpdate || "Administrator",
        full_name: nameToUpdate || "Administrator",
        email: emailToUpdate || "admin@eyenit.com",
        phone: phone || "",
        role: req.admin?.role || "admin",
        avatar: avatar || profile_image_url || "",
      },
    });
  } catch (error) {
    console.error("Error in updateAdminProfile:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile.",
    });
  }
};

// Function to change admin password
export const changeAdminPassword = async (req, res) => {
  try {
    const adminId = req.admin?.id || req.admin?._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long.",
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match.",
      });
    }

    let dbAdmin = null;
    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      dbAdmin = await Admin.findById(adminId);
    }
    if (!dbAdmin && req.admin?.email) {
      dbAdmin = await Admin.findOne({ email: req.admin.email.toLowerCase().trim() });
    }
    if (!dbAdmin) {
      dbAdmin = await Admin.findOne();
    }

    if (!dbAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found.",
      });
    }

    // Verify current password
    if (dbAdmin.password_hash) {
      const isMatch = await bcrypt.compare(currentPassword, dbAdmin.password_hash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Incorrect current password.",
        });
      }
    }

    // Hash and update new password
    dbAdmin.password_hash = await bcrypt.hash(newPassword, 10);
    await dbAdmin.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Error in changeAdminPassword:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update password.",
    });
  }
};

// Function to update general admin / system settings
export const updateAdminSettings = async (req, res) => {
  try {
    const { company, payroll, attendance, leave, security, employee } = req.body;
    const updatePayload = {};

    if (company) updatePayload.company = company;
    if (payroll) updatePayload.payroll = payroll;
    if (attendance) updatePayload.attendance = attendance;
    if (leave) updatePayload.leave = leave;
    if (security) updatePayload.security = security;
    if (employee) updatePayload.employee = employee;

    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: updatePayload },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully.",
      settings,
    });
  } catch (error) {
    console.error("Error in updateAdminSettings:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update settings.",
    });
  }
};

// Admin action: update employee account status (active, inactive, suspended)
export const updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["active", "inactive", "suspended"];
    if (!status || !validStatuses.includes(status.toLowerCase().trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Status must be one of: 'active', 'inactive', 'suspended'.",
      });
    }

    const cleanStatus = status.toLowerCase().trim();
    const isActive = cleanStatus === "active";

    let employee = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      employee = await Employee.findByIdAndUpdate(
        id,
        { $set: { status: cleanStatus, isActive } },
        { new: true }
      ).select("-password");
    } else {
      employee = await Employee.findOneAndUpdate(
        { $or: [{ employeeId: id }, { email: id }] },
        { $set: { status: cleanStatus, isActive } },
        { new: true }
      ).select("-password");
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee record not found in database.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Employee account status successfully updated to '${cleanStatus}'.`,
      employee,
    });
  } catch (error) {
    console.error("Error updating employee status:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while updating employee status.",
    });
  }
};

// Admin action: delete employee permanently from database
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Employee ID parameter is required.",
      });
    }

    let deletedEmployee = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      deletedEmployee = await Employee.findByIdAndDelete(id).select("-password");
    } else {
      deletedEmployee = await Employee.findOneAndDelete({
        $or: [{ employeeId: id }, { email: id }],
      }).select("-password");
    }

    if (!deletedEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee record not found or already deleted from database.",
      });
    }

    // Cascade clean up all associated records for this employee
    try {
      const empObjectId = deletedEmployee._id;
      const empCode = deletedEmployee.employeeId;

      await Promise.all([
        Attendance.deleteMany({ employee: empObjectId }).catch(() => {}),
        Leave.deleteMany({ employee: empObjectId }).catch(() => {}),
        Payroll.deleteMany({ employee: empObjectId }).catch(() => {}),
        Notification.deleteMany({
          $or: [
            { recipient_id: String(empObjectId) },
            { recipient_id: empCode },
            { recipient: empObjectId },
            { "metadata.employeeId": empCode },
            { "metadata.employee_id": String(empObjectId) },
          ],
        }).catch(() => {}),
      ]);
    } catch (cascadeErr) {
      console.warn("Cascade deletion warning for employee:", cascadeErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Employee "${deletedEmployee.fullName || deletedEmployee.employeeId}" has been permanently removed from the database.`,
      employeeId: deletedEmployee.employeeId || id,
      deletedId: deletedEmployee._id,
    });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while deleting employee.",
    });
  }
};


// Live Backend Aggregation Endpoint: GET /api/admin/dashboard-stats
export const getDashboardStats = async (req, res) => {
  try {
    let totalPayroll = 0;
    let totalPayrollDisbursed = 0;
    let pendingDisbursements = 0;
    let employeesPaidCount = 0;
    let totalEmployees = 0;

    try {
      totalEmployees = await Employee.countDocuments({
        $or: [{ status: "active" }, { status: { $exists: false }, isActive: { $ne: false } }],
      });
    } catch (err) {
      console.warn("DB employee count error in getDashboardStats:", err.message);
    }

    try {
      const payrollRecords = await Payroll.find({}).lean();
      if (payrollRecords && payrollRecords.length > 0) {
        payrollRecords.forEach((p) => {
          const net = Number(p.netPay !== undefined ? p.netPay : (p.netSalary !== undefined ? p.netSalary : (p.basicSalary || 0)));
          const status = (p.status || "").toLowerCase().trim();

          totalPayroll += net;
          if (status === "paid") {
            totalPayrollDisbursed += net;
            employeesPaidCount += 1;
          } else if (status === "pending" || status === "draft" || status === "unpaid") {
            pendingDisbursements += net;
          }
        });
      }
    } catch (dbErr) {
      console.warn("DB payroll aggregation in getDashboardStats:", dbErr.message);
    }

    return res.status(200).json({
      success: true,
      totalPayroll: parseFloat(totalPayroll.toFixed(2)),
      totalPayrollDisbursed: parseFloat(totalPayrollDisbursed.toFixed(2)),
      monthlyPayrollTotal: parseFloat(totalPayrollDisbursed.toFixed(2)),
      pendingDisbursements: parseFloat(pendingDisbursements.toFixed(2)),
      employeesPaidCount,
      totalEmployeesPaid: employeesPaidCount,
      totalEmployees,
    });
  } catch (error) {
    console.error("Error in getDashboardStats:", error);
    return res.status(500).json({
      success: false,
      totalPayroll: 0,
      totalPayrollDisbursed: 0,
      monthlyPayrollTotal: 0,
      pendingDisbursements: 0,
      employeesPaidCount: 0,
      totalEmployeesPaid: 0,
      message: error.message || "Failed to fetch dashboard stats.",
    });
  }
};

import { getAdminPayrollSummary as payrollAdminSummary } from "./payrollAdminController.js";

// Live Backend Aggregation Endpoint: GET /api/admin/payroll/summary
export const getAdminPayrollSummary = async (req, res) => {
  return payrollAdminSummary(req, res);
};



