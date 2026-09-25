import { Employee } from "../models/employeeModel.js";
import mongoose from "mongoose";
import { validateOrganizationAccess } from "../utils/validateOrganizationAccess.js";
import { buildTenantScope } from "../utils/tenantScope.js";
import { logAuditAction } from "../utils/auditLogger.js";

// Helper for valid MongoDB ObjectId checking
const isValidObjectId = (id) =>
  id &&
  typeof id === "string" &&
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === String(id);

// Function to get all employees details directly from the database (Single-Tenant Global Access)
export const employeeDetails = async (req, res) => {
  try {
    let employees = [];

    try {
      employees = await Employee.find({
        role: { $nin: ["admin", "superadmin", "super_admin", "manager"] },
      })
        .select("-password")
        .sort({ createdAt: -1 })
        .lean();
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

    try {
      await logAuditAction({
        req,
        action: "UPDATE_PROFILE",
        category: "Employees",
        target: `${updated.fullName || updated.email} (${updated.employeeId || "Staff"})`,
        targetModel: "Employee",
        summary: `Updated profile information for employee ${updated.fullName || updated.email}.`,
        details: `Employee ID: ${updated.employeeId || "N/A"}, Phone: ${updated.phone || "N/A"}.`,
      });
    } catch (auditErr) {
      console.warn("[EmployeeProfile] Audit log warning:", auditErr.message);
    }

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

// Export complete employee database to CSV for HR reporting purposes
export const exportEmployeesCSV = async (req, res) => {
  try {
    const { status, department } = req.query;
    const filter = {};

    if (status && status !== "all") {
      if (status === "active") {
        filter.$or = [{ status: "active" }, { status: { $exists: false }, isActive: { $ne: false } }];
      } else {
        filter.status = status;
      }
    }

    if (department && department !== "all") {
      filter.department = department;
    }

    const employees = await Employee.find(filter)
      .select("-password")
      .sort({ department: 1, fullName: 1 })
      .lean();

    const headers = [
      "Employee ID",
      "Full Name",
      "Email Address",
      "Phone Number",
      "Department",
      "Position / Job Title",
      "Employment Type",
      "Employment Status",
      "Date Joined",
      "Basic Salary (GHS)",
      "Work Location",
      "System Role",
      "Emergency Contact Name",
      "Emergency Contact Phone",
      "Record Created Date",
    ];

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = (employees || []).map((emp) => {
      const statusStr =
        emp.status || (emp.isActive !== false ? "Active" : "Inactive");
      const joinedStr = emp.employmentDate
        ? new Date(emp.employmentDate).toISOString().split("T")[0]
        : emp.joiningDate
        ? new Date(emp.joiningDate).toISOString().split("T")[0]
        : emp.createdAt
        ? new Date(emp.createdAt).toISOString().split("T")[0]
        : "N/A";
      const createdStr = emp.createdAt
        ? new Date(emp.createdAt).toISOString().split("T")[0]
        : "N/A";
      const salaryVal =
        emp.baseSalary !== undefined
          ? emp.baseSalary
          : emp.salary !== undefined
          ? emp.salary
          : emp.basicSalary !== undefined
          ? emp.basicSalary
          : 0;

      return [
        escapeCSV(emp.employeeId || "N/A"),
        escapeCSV(emp.fullName || ""),
        escapeCSV(emp.email || ""),
        escapeCSV(emp.phone || "N/A"),
        escapeCSV(emp.department || "General"),
        escapeCSV(emp.position || "Staff Member"),
        escapeCSV(emp.employmentType || "Full-time"),
        escapeCSV(statusStr),
        escapeCSV(joinedStr),
        escapeCSV(Number(salaryVal).toFixed(2)),
        escapeCSV(emp.location || "Accra Head Office"),
        escapeCSV(emp.role || "employee"),
        escapeCSV(emp.emergencyContact || emp.emergencyName || "N/A"),
        escapeCSV(emp.emergencyPhone || emp.emergencyContactPhone || "N/A"),
        escapeCSV(createdStr),
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `workpulse_hr_employee_report_${dateStr}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("exportEmployeesCSV error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to export employee database to CSV.",
    });
  }
};

