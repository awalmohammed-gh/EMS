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
import { AuditLog } from "../models/AuditLog.js";
import { User } from "../models/userModel.js";
import { livePayrollStore } from "./payrollController.js";
import { liveLeaveStore } from "./leaveController.js";
import { CompanySettings } from "../models/CompanySettings.js";

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
    const { identifier, email, password, rememberMe, rememberDevice } = req.body;
    const inputIdentifier = (identifier || email || "").trim();

    if (!inputIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide your email address or company identifier and password.",
      });
    }

    const cleanIdentifier = inputIdentifier.toLowerCase();
    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_key_12345";

    // 1. First look up the user by personal email (in User or Admin collections)
    let user = await User.findOne({ email: cleanIdentifier });
    let dbAdmin = null;

    if (!user) {
      dbAdmin = await Admin.findOne({ email: cleanIdentifier });
    }

    // 2. Fallback: If no match is found, look up the organization by the identifier and find the associated primary manager/admin
    if (!user && !dbAdmin) {
      const matchingCompany = await CompanySettings.findOne({
        $or: [
          { companyEmail: cleanIdentifier },
          { contactEmail: cleanIdentifier },
          { email: cleanIdentifier },
          { slug: cleanIdentifier },
          { companyName: new RegExp(`^${cleanIdentifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        ],
      });

      if (matchingCompany) {
        if (matchingCompany._id) {
          user = await User.findOne({
            organizationId: matchingCompany._id,
            role: { $in: ["admin", "manager", "super_admin"] },
          });
        }
        if (!user) {
          user = await User.findOne({
            role: { $in: ["admin", "manager", "super_admin"] },
          });
        }
        if (!user) {
          dbAdmin = await Admin.findOne({
            role: { $in: ["admin", "super_admin"] },
          });
        }
      }
    }

    // 3. If still not matched, check Employee collection to intercept staff attempting management login
    if (!user && !dbAdmin) {
      const emp = await Employee.findOne({
        $or: [{ email: cleanIdentifier }, { employeeId: inputIdentifier }],
      });
      if (emp && emp.password) {
        const isEmpMatch = await bcrypt.compare(password, emp.password);
        if (isEmpMatch) {
          return res.status(403).json({
            success: false,
            message: "Access restricted. Only Managers and Administrators may log in through this portal.",
          });
        }
      }

      return res.status(401).json({
        success: false,
        message: "Invalid credentials. No administrator account found matching this identifier.",
      });
    }

    // Unify matched target account
    const targetAccount = user || {
      _id: dbAdmin._id,
      id: dbAdmin._id.toString(),
      fullName: dbAdmin.full_name || dbAdmin.fullName || "Administrator",
      full_name: dbAdmin.full_name || dbAdmin.fullName || "Administrator",
      email: dbAdmin.email,
      role: dbAdmin.role || "admin",
      password: dbAdmin.password_hash,
      department: dbAdmin.department || "Executive Management",
      position: dbAdmin.position || (dbAdmin.role === "super_admin" ? "Super Admin" : "Administrator"),
      avatar: dbAdmin.avatar || dbAdmin.profile_image_url || "",
      profile_image_url: dbAdmin.avatar || dbAdmin.profile_image_url || "",
      organizationId: dbAdmin.organizationId,
    };

    // Strict role verification: only admin or manager allowed
    if (targetAccount.role !== "admin" && targetAccount.role !== "manager" && targetAccount.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access restricted. Only Managers and Administrators may log in through this portal.",
      });
    }

    // Password verification
    const accountPassword = targetAccount.password || targetAccount.password_hash;
    const isMatch = await bcrypt.compare(password, accountPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials. Please verify your password.",
      });
    }

    const token = jwt.sign(
      {
        id: (targetAccount._id || targetAccount.id).toString(),
        userId: (targetAccount._id || targetAccount.id).toString(),
        email: targetAccount.email,
        role: targetAccount.role,
        fullName: targetAccount.fullName || targetAccount.full_name,
        organizationId: targetAccount.organizationId,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production";
    const remember = Boolean(rememberMe || rememberDevice);
    const cookieOptions = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax",
      maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
      path: "/",
    };

    res.cookie("auth_token", token, cookieOptions);
    res.cookie("token", token, cookieOptions);

    const safeAdmin = {
      _id: (targetAccount._id || targetAccount.id).toString(),
      id: (targetAccount._id || targetAccount.id).toString(),
      name: targetAccount.fullName || targetAccount.full_name,
      fullName: targetAccount.fullName || targetAccount.full_name,
      full_name: targetAccount.fullName || targetAccount.full_name,
      email: targetAccount.email,
      role: targetAccount.role || "admin",
      department: targetAccount.department || "Executive Management",
      position: targetAccount.position || (targetAccount.role === "manager" ? "Manager" : targetAccount.role === "super_admin" ? "Super Admin" : "Administrator"),
      avatar: targetAccount.avatar || targetAccount.profile_image_url || "",
      profile_image_url: targetAccount.avatar || targetAccount.profile_image_url || "",
      organizationId: targetAccount.organizationId,
    };

    return res.status(200).json({
      success: true,
      token,
      message: "Management login successful.",
      user: safeAdmin,
      admin: safeAdmin,
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
    const clearOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    };

    res.clearCookie("auth_token", clearOptions);
    res.clearCookie("token", clearOptions);

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
      { returnDocument: "after", upsert: true }
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

    const validStatuses = ["active", "inactive", "suspended", "on leave", "on-leave", "terminated"];
    if (!status || !validStatuses.includes(status.toLowerCase().trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Status must be one of: 'active', 'on leave', 'inactive', 'suspended', 'terminated'.",
      });
    }

    const cleanStatus = status.toLowerCase().trim();
    const isActive = cleanStatus === "active" || cleanStatus === "on leave" || cleanStatus === "on-leave";

    let employee = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      employee = await Employee.findByIdAndUpdate(
        id,
        { $set: { status: cleanStatus, isActive } },
        { returnDocument: "after" }
      ).select("-password");
    } else {
      employee = await Employee.findOneAndUpdate(
        { $or: [{ employeeId: id }, { email: id }] },
        { $set: { status: cleanStatus, isActive } },
        { returnDocument: "after" }
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

// Admin action: delete employee permanently from database with robust cascading purge
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Employee ID parameter is required.",
      });
    }

    // 1. Locate target employee first to get full identifiers
    let targetEmployee = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      targetEmployee = await Employee.findById(id).lean();
    }
    if (!targetEmployee) {
      targetEmployee = await Employee.findOne({
        $or: [{ employeeId: id }, { email: id }],
      }).lean();
    }

    let empObjectId = targetEmployee?._id || (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null);
    const empCode = targetEmployee?.employeeId || (typeof id === "string" ? id : "");
    const empEmail = targetEmployee?.email || (typeof id === "string" && id.includes("@") ? id : "");
    const empName = targetEmployee?.fullName || empCode || "Employee";

    // If empObjectId wasn't found from Employee, try to resolve it from Attendance or in-memory stores
    if (!empObjectId && empCode) {
      try {
        const attDoc = await Attendance.findOne({ employeeId: empCode }).select("employee").lean();
        if (attDoc?.employee && mongoose.Types.ObjectId.isValid(attDoc.employee)) {
          empObjectId = new mongoose.Types.ObjectId(attDoc.employee);
        }
      } catch {
        // continue
      }
    }
    if (!empObjectId && empCode && Array.isArray(liveLeaveStore)) {
      const match = liveLeaveStore.find((l) => l?.employee?.employeeId === empCode && l?.employee?._id);
      if (match?.employee?._id && mongoose.Types.ObjectId.isValid(match.employee._id)) {
        empObjectId = new mongoose.Types.ObjectId(match.employee._id);
      }
    }
    if (!empObjectId && empCode && Array.isArray(livePayrollStore)) {
      const match = livePayrollStore.find((p) => p?.employee?.employeeId === empCode && p?.employee?._id);
      if (match?.employee?._id && mongoose.Types.ObjectId.isValid(match.employee._id)) {
        empObjectId = new mongoose.Types.ObjectId(match.employee._id);
      }
    }

    // 2. Execute cascading purges across all associated collections sequentially
    // Attendance records purge:
    // Attendance schema has `employee` (ObjectId) and `employeeId` (String).
    // NEVER query `employee` with a non-ObjectId string.
    const attendanceOrClauses = [];
    if (empObjectId && mongoose.Types.ObjectId.isValid(empObjectId)) {
      attendanceOrClauses.push({ employee: new mongoose.Types.ObjectId(empObjectId) });
    }
    if (empCode) {
      attendanceOrClauses.push({ employeeId: String(empCode) });
    }
    if (id && String(id) !== String(empCode)) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        attendanceOrClauses.push({ employee: new mongoose.Types.ObjectId(id) });
      } else {
        attendanceOrClauses.push({ employeeId: String(id) });
      }
    }
    const attendanceFilter = attendanceOrClauses.length > 1
      ? { $or: attendanceOrClauses }
      : (attendanceOrClauses[0] || null);

    const attendanceDeleteResult = attendanceFilter
      ? await Attendance.deleteMany(attendanceFilter).catch((err) => {
          console.warn("[Cascading Delete] Attendance purge warning:", err.message);
          return { deletedCount: 0 };
        })
      : { deletedCount: 0 };

    // Payroll / Payslips records purge:
    // Payroll schema only has `employee` (ObjectId). Only query with valid ObjectId.
    const payrollOrClauses = [];
    if (empObjectId && mongoose.Types.ObjectId.isValid(empObjectId)) {
      payrollOrClauses.push({ employee: new mongoose.Types.ObjectId(empObjectId) });
    }
    if (id && mongoose.Types.ObjectId.isValid(id) && (!empObjectId || String(id) !== String(empObjectId))) {
      payrollOrClauses.push({ employee: new mongoose.Types.ObjectId(id) });
    }
    const payrollFilter = payrollOrClauses.length > 1
      ? { $or: payrollOrClauses }
      : (payrollOrClauses[0] || null);

    const payrollDeleteResult = payrollFilter
      ? await Payroll.deleteMany(payrollFilter).catch((err) => {
          console.warn("[Cascading Delete] Payroll purge warning:", err.message);
          return { deletedCount: 0 };
        })
      : { deletedCount: 0 };

    // Also prune from in-memory livePayrollStore
    try {
      if (Array.isArray(livePayrollStore)) {
        for (let i = livePayrollStore.length - 1; i >= 0; i--) {
          const p = livePayrollStore[i];
          const matchObjectId = empObjectId && (String(p?.employee?._id || p?.employee) === String(empObjectId));
          const matchCode = empCode && (p?.employeeId === empCode || p?.employee?.employeeId === empCode || String(p?.employee) === empCode);
          const matchId = id && (p?.employeeId === String(id) || String(p?.employee) === String(id));
          if (matchObjectId || matchCode || matchId) {
            livePayrollStore.splice(i, 1);
          }
        }
      }
    } catch {
      // safe fallback
    }

    // Leave Requests records purge:
    // Leave schema only has `employee` (ObjectId). Only query with valid ObjectId.
    const leaveOrClauses = [];
    if (empObjectId && mongoose.Types.ObjectId.isValid(empObjectId)) {
      leaveOrClauses.push({ employee: new mongoose.Types.ObjectId(empObjectId) });
    }
    if (id && mongoose.Types.ObjectId.isValid(id) && (!empObjectId || String(id) !== String(empObjectId))) {
      leaveOrClauses.push({ employee: new mongoose.Types.ObjectId(id) });
    }
    const leaveFilter = leaveOrClauses.length > 1
      ? { $or: leaveOrClauses }
      : (leaveOrClauses[0] || null);

    const leaveDeleteResult = leaveFilter
      ? await Leave.deleteMany(leaveFilter).catch((err) => {
          console.warn("[Cascading Delete] Leave purge warning:", err.message);
          return { deletedCount: 0 };
        })
      : { deletedCount: 0 };

    // Also prune from in-memory liveLeaveStore
    try {
      if (Array.isArray(liveLeaveStore)) {
        for (let i = liveLeaveStore.length - 1; i >= 0; i--) {
          const l = liveLeaveStore[i];
          const matchObjectId = empObjectId && (String(l?.employee?._id || l?.employee) === String(empObjectId));
          const matchCode = empCode && (l?.employeeId === empCode || l?.employee?.employeeId === empCode || String(l?.employee) === empCode);
          const matchId = id && (l?.employeeId === String(id) || String(l?.employee) === String(id));
          if (matchObjectId || matchCode || matchId) {
            liveLeaveStore.splice(i, 1);
          }
        }
      }
    } catch {
      // safe fallback
    }

    // Notifications purge (recipients, metadata, or references)
    const notifOrClauses = [];
    if (empObjectId && mongoose.Types.ObjectId.isValid(empObjectId)) {
      notifOrClauses.push({ recipient_id: String(empObjectId) });
      notifOrClauses.push({ recipient: new mongoose.Types.ObjectId(empObjectId) });
      notifOrClauses.push({ "metadata.employee_id": String(empObjectId) });
    }
    if (empCode) {
      notifOrClauses.push({ recipient_id: String(empCode) });
      notifOrClauses.push({ "metadata.employeeId": String(empCode) });
    }
    if (id && String(id) !== String(empCode) && (!empObjectId || String(id) !== String(empObjectId))) {
      notifOrClauses.push({ recipient_id: String(id) });
      notifOrClauses.push({ "metadata.employeeId": String(id) });
    }
    const notifFilter = notifOrClauses.length > 1 ? { $or: notifOrClauses } : (notifOrClauses[0] || null);
    const notificationDeleteResult = notifFilter
      ? await Notification.deleteMany(notifFilter).catch((err) => {
          console.warn("[Cascading Delete] Notification purge warning:", err.message);
          return { deletedCount: 0 };
        })
      : { deletedCount: 0 };

    // Primary Employee Document deletion
    let employeeDeletedCount = 0;
    if (empObjectId) {
      const delDoc = await Employee.findByIdAndDelete(empObjectId).catch(() => null);
      if (delDoc) employeeDeletedCount++;
    }
    const empExtraDel = await Employee.deleteMany({
      $or: [
        ...(empObjectId ? [{ _id: empObjectId }] : []),
        ...(empCode ? [{ employeeId: empCode }] : []),
        { employeeId: String(id) },
      ],
    }).catch(() => ({ deletedCount: 0 }));
    employeeDeletedCount += (empExtraDel?.deletedCount || 0);

    // User Model deletion (auth credentials if linked)
    if (User) {
      await User.deleteMany({
        $or: [
          ...(empObjectId ? [{ _id: empObjectId }] : []),
          ...(empEmail ? [{ email: empEmail }] : []),
          { email: String(id) },
        ],
      }).catch(() => {});
    }

    // 3. Record Audit Log entry
    try {
      const adminPerformer = req.admin || req.user || {};
      await AuditLog.create({
        action: "DELETE_EMPLOYEE",
        category: "Employees",
        performedBy: {
          id: String(adminPerformer.id || adminPerformer._id || "admin"),
          name: adminPerformer.fullName || adminPerformer.full_name || "Administrator",
          email: adminPerformer.email || "admin@system.local",
          role: adminPerformer.role || "admin",
        },
        target: `${empName} (${empCode || empObjectId || id})`,
        summary: `Permanently deleted employee ${empName}. Purged ${attendanceDeleteResult?.deletedCount || 0} attendance records, ${payrollDeleteResult?.deletedCount || 0} payslips, ${leaveDeleteResult?.deletedCount || 0} leave requests, and ${notificationDeleteResult?.deletedCount || 0} notifications.`,
        metadata: {
          employeeId: empCode || id,
          employeeObjectId: empObjectId ? String(empObjectId) : String(id),
          purgedCounts: {
            attendance: attendanceDeleteResult?.deletedCount || 0,
            payroll: payrollDeleteResult?.deletedCount || 0,
            leave: leaveDeleteResult?.deletedCount || 0,
            notifications: notificationDeleteResult?.deletedCount || 0,
          },
        },
      });
    } catch (auditErr) {
      console.warn("[Cascading Delete] Audit log creation warning:", auditErr.message);
    }

    return res.status(200).json({
      success: true,
      message: employeeDeletedCount > 0 || targetEmployee
        ? `Employee "${empName}" and all associated records have been permanently purged from the database.`
        : "Employee record already removed or not found.",
      employeeId: empCode || id,
      deletedId: empObjectId || id,
      purgedSummary: {
        employee: employeeDeletedCount > 0 ? 1 : 0,
        attendance: attendanceDeleteResult?.deletedCount || 0,
        payroll: payrollDeleteResult?.deletedCount || 0,
        leave: leaveDeleteResult?.deletedCount || 0,
        notifications: notificationDeleteResult?.deletedCount || 0,
      },
    });
  } catch (error) {
    console.error("Error in cascading deleteEmployee:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while deleting employee.",
    });
  }
};


// Admin action: bulk update employees (department, status, etc.)
export const bulkUpdateEmployees = async (req, res) => {
  try {
    const { employeeIds, updates } = req.body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "An array of employeeIds is required.",
      });
    }

    if (!updates || typeof updates !== "object" || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Updates object with valid fields (e.g. department, status) is required.",
      });
    }

    const setFields = {};
    if (updates.department) {
      setFields.department = String(updates.department).trim();
    }
    if (updates.status) {
      const cleanStatus = String(updates.status).toLowerCase().trim();
      setFields.status = cleanStatus;
      setFields.isActive = cleanStatus === "active" || cleanStatus === "on leave" || cleanStatus === "on-leave";
    }

    // Build filter supporting ObjectIds or employeeId strings
    const idFilters = employeeIds.map((id) => {
      if (mongoose.Types.ObjectId.isValid(id)) {
        return { _id: id };
      }
      return { employeeId: id };
    });

    const result = await Employee.updateMany(
      { $or: idFilters },
      { $set: setFields }
    );

    return res.status(200).json({
      success: true,
      message: `Successfully updated ${result.modifiedCount || 0} employee record(s).`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      updates: setFields,
    });
  } catch (error) {
    console.error("Error in bulkUpdateEmployees:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to bulk update employees.",
    });
  }
};

// Admin action: bulk delete employees with cascading cleanup
export const bulkDeleteEmployees = async (req, res) => {
  try {
    const { employeeIds } = req.body;
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "An array of employeeIds is required for bulk deletion.",
      });
    }

    let deletedCount = 0;
    const errors = [];

    for (const id of employeeIds) {
      try {
        let targetEmployee = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
          targetEmployee = await Employee.findById(id).lean();
        }
        if (!targetEmployee) {
          targetEmployee = await Employee.findOne({
            $or: [{ employeeId: id }, { email: id }],
          }).lean();
        }

        const empObjectId = targetEmployee?._id || (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null);
        const empCode = targetEmployee?.employeeId || (typeof id === "string" ? id : "");
        const empEmail = targetEmployee?.email || (typeof id === "string" && id.includes("@") ? id : "");

        // Purge Attendance
        const attClauses = [];
        if (empObjectId && mongoose.Types.ObjectId.isValid(empObjectId)) {
          attClauses.push({ employee: new mongoose.Types.ObjectId(empObjectId) });
        }
        if (empCode) {
          attClauses.push({ employeeId: String(empCode) });
        }
        if (id && String(id) !== String(empCode)) {
          if (mongoose.Types.ObjectId.isValid(id)) {
            attClauses.push({ employee: new mongoose.Types.ObjectId(id) });
          } else {
            attClauses.push({ employeeId: String(id) });
          }
        }
        if (attClauses.length > 0) {
          await Attendance.deleteMany({ $or: attClauses }).catch(() => {});
        }

        // Purge Payroll
        const payClauses = [];
        if (empObjectId && mongoose.Types.ObjectId.isValid(empObjectId)) {
          payClauses.push({ employee: new mongoose.Types.ObjectId(empObjectId) });
        }
        if (id && mongoose.Types.ObjectId.isValid(id) && (!empObjectId || String(id) !== String(empObjectId))) {
          payClauses.push({ employee: new mongoose.Types.ObjectId(id) });
        }
        if (payClauses.length > 0) {
          await Payroll.deleteMany({ $or: payClauses }).catch(() => {});
        }

        // Purge Leave
        const leaveClauses = [];
        if (empObjectId && mongoose.Types.ObjectId.isValid(empObjectId)) {
          leaveClauses.push({ employee: new mongoose.Types.ObjectId(empObjectId) });
        }
        if (id && mongoose.Types.ObjectId.isValid(id) && (!empObjectId || String(id) !== String(empObjectId))) {
          leaveClauses.push({ employee: new mongoose.Types.ObjectId(id) });
        }
        if (leaveClauses.length > 0) {
          await Leave.deleteMany({ $or: leaveClauses }).catch(() => {});
        }

        // Purge memory stores
        if (Array.isArray(livePayrollStore)) {
          for (let i = livePayrollStore.length - 1; i >= 0; i--) {
            const p = livePayrollStore[i];
            if (p?.employeeId === empCode || String(p?.employee?._id || p?.employee) === String(empObjectId)) {
              livePayrollStore.splice(i, 1);
            }
          }
        }
        if (Array.isArray(liveLeaveStore)) {
          for (let i = liveLeaveStore.length - 1; i >= 0; i--) {
            const l = liveLeaveStore[i];
            if (l?.employee?.employeeId === empCode || String(l?.employee?._id || l?.employee) === String(empObjectId)) {
              liveLeaveStore.splice(i, 1);
            }
          }
        }

        // Purge Employee
        if (empObjectId) {
          await Employee.findByIdAndDelete(empObjectId).catch(() => {});
        }
        await Employee.deleteMany({
          $or: [
            ...(empObjectId ? [{ _id: empObjectId }] : []),
            ...(empCode ? [{ employeeId: empCode }] : []),
            { employeeId: String(id) },
          ],
        }).catch(() => {});

        // Purge User auth credentials if linked
        if (User) {
          await User.deleteMany({
            $or: [
              ...(empObjectId ? [{ _id: empObjectId }] : []),
              ...(empEmail ? [{ email: empEmail }] : []),
              { email: String(id) },
            ],
          }).catch(() => {});
        }

        deletedCount++;
      } catch (err) {
        errors.push({ id, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedCount} employee(s).`,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in bulkDeleteEmployees:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to bulk delete employees.",
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



