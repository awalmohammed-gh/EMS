import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Admin } from "../models/Admin.js";
import { Employee } from "../models/employeeModel.js";

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
    try {
      const dbAdmin = await Admin.findOne({ email: cleanEmail });
      if (dbAdmin && dbAdmin.password_hash) {
        const isMatch = await bcrypt.compare(password, dbAdmin.password_hash);
        if (isMatch) {
          authenticatedAdmin = {
            id: String(dbAdmin._id),
            _id: String(dbAdmin._id),
            fullName: dbAdmin.full_name,
            full_name: dbAdmin.full_name,
            email: dbAdmin.email,
            role: dbAdmin.role || "admin",
            profile_image_url: dbAdmin.profile_image_url || "",
          };
        }
      }
    } catch (dbErr) {
      console.warn("DB check during admin login:", dbErr.message);
    }

    // 2. Check process.env fallback credentials if DB admin not found or matched
    if (!authenticatedAdmin) {
      const adminEmail = (process.env.ADMIN_EMAIL || "admin@eyenit.com").toLowerCase().trim();
      const adminPsd = process.env.ADMIN_PSD || process.env.ADMIN_PASSWORD || "admin123";
      const adminName = process.env.ADMIN_NAME || "System Administrator";

      if (cleanEmail === adminEmail && password === adminPsd) {
        authenticatedAdmin = {
          id: "admin_001",
          _id: "admin_001",
          fullName: adminName,
          full_name: adminName,
          email: adminEmail,
          role: "super_admin",
          profile_image_url: "",
        };
      }
    }

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


