import { Employee } from "../models/employeeModel.js";
import mongoose from "mongoose";
import { validateOrganizationAccess } from "../utils/validateOrganizationAccess.js";
import { buildTenantScope } from "../utils/tenantScope.js";

// Helper for valid MongoDB ObjectId checking
const isValidObjectId = (id) =>
  id &&
  typeof id === "string" &&
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === String(id);

// Function to get all employees details directly from the database
export const employeeDetails = async (req, res) => {
  try {
    const orgId = req.user?.organizationId || req.user?.companyId || req.companyId || req.organizationId;
    let employees = [];
    const query = orgId
      ? { $or: [{ organizationId: orgId }, { companyId: orgId }] }
      : {};

    try {
      employees = await Employee.find(query).select("-password").sort({ createdAt: -1 }).lean();
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
      companyId: emp.companyId || emp.organizationId || null,
      organizationId: emp.organizationId || emp.companyId || null,
      profilePicture: emp.profilePicture || emp.profile_picture || emp.avatar || emp.profile_image_url || "",
      profile_picture: emp.profile_picture || emp.profilePicture || emp.avatar || emp.profile_image_url || "",
      avatar: emp.avatar || emp.profilePicture || emp.profile_image_url || "",
      profile_image_url: emp.profile_image_url || emp.avatar || emp.profilePicture || "",
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
    const orgId = req.user?.organizationId || req.user?.companyId || req.companyId || req.organizationId;
    let employees = [];
    const query = orgId
      ? { $or: [{ organizationId: orgId }, { companyId: orgId }] }
      : {};
    try {
      employees = await Employee.find(query)
        .select("_id employeeId fullName department position email phone baseSalary organizationId companyId")
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
    const orgId = req.user?.organizationId || req.user?.companyId || req.companyId || req.organizationId;
    let employee = null;
    const orgQuery = orgId
      ? { $or: [{ organizationId: orgId }, { companyId: orgId }] }
      : {};

    if (isValidObjectId(id)) {
      employee = await Employee.findOne({ _id: id, ...orgQuery }).select("-password").lean();
    } else {
      employee = await Employee.findOne({
        $or: [{ employeeId: id }, { email: id }],
        ...orgQuery,
      }).select("-password").lean();
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee record not found in this company workspace.",
      });
    }

    // Validate organization access to prevent cross-tenant data access
    validateOrganizationAccess(employee, req);

    res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    const statusCode = error.message === "Unauthorized" || error.statusCode === 403 ? 403 : (error.statusCode || 500);
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

// Get logged-in employee profile for /me endpoint
export const getCurrentLoggedInEmployee = async (req, res) => {
  try {
    const rawId = req.employee?.id || req.employee?._id || req.user?._id || req.user?.id;
    const orgId = req.companyId || req.organizationId || req.employee?.companyId || req.employee?.organizationId;
    let employee = null;

    const orgFilter = orgId
      ? { $or: [{ organizationId: orgId }, { companyId: orgId }] }
      : {};

    if (isValidObjectId(rawId)) {
      employee = await Employee.findOne({ _id: rawId, ...orgFilter }).select("-password").lean();
    } else if (rawId) {
      employee = await Employee.findOne({
        $or: [{ employeeId: req.employee?.employeeId || rawId }, { email: rawId }],
        ...orgFilter,
      }).select("-password").lean();
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found in authenticated company workspace.",
      });
    }

    validateOrganizationAccess(employee, req);

    res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    const statusCode = error.message === "Unauthorized" || error.statusCode === 403 ? 403 : (error.statusCode || 500);
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

// Update logged-in employee profile
export const updateCurrentEmployee = async (req, res) => {
  try {
    const rawId = req.employee?.id || req.employee?._id;
    const orgId = req.user?.organizationId || req.user?.companyId || req.companyId || req.organizationId;
    const orgFilter = orgId ? { $or: [{ organizationId: orgId }, { companyId: orgId }] } : {};
    const { fullName, phone, avatar, profilePicture, profile_picture, profile_image_url } = req.body;
    let filter = {};

    if (isValidObjectId(rawId)) {
      filter = { _id: rawId, ...orgFilter };
    } else if (rawId) {
      filter = {
        $or: [{ employeeId: req.employee?.employeeId || rawId }, { email: rawId }],
        ...orgFilter,
      };
    } else if (orgId) {
      const active = await Employee.findOne({ isActive: true, ...orgFilter });
      if (active) filter = { _id: active._id };
      else {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found.",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Access restricted: No company workspace identified for this request.",
      });
    }

    const updates = {};
    if (fullName) updates.fullName = fullName.trim();
    if (phone) updates.phone = phone.trim();
    const newAvatar = avatar || profilePicture || profile_picture || profile_image_url;
    if (newAvatar !== undefined) {
      updates.avatar = newAvatar;
      updates.profilePicture = newAvatar;
      updates.profile_picture = newAvatar;
      updates.profile_image_url = newAvatar;
    }

    const updated = await Employee.findOneAndUpdate(filter, { $set: updates }, { returnDocument: "after" })
      .select("-password")
      .lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Failed to find and update employee profile.",
      });
    }

    validateOrganizationAccess(updated, req);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      employee: updated,
    });
  } catch (error) {
    const statusCode = error.message === "Unauthorized" || error.statusCode === 403 ? 403 : (error.statusCode || 500);
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

