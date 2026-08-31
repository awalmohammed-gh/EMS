import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Admin } from "../models/Admin.js";
import { Employee } from "../models/employeeModel.js";
import { User } from "../models/userModel.js";

const getJwtSecret = () => process.env.JWT_SECRET || "default_jwt_secret_key_12345";

/**
 * Helper to generate JWT token with consistent payload structure
 */
const generateAuthToken = (userPayload, expiresIn = "7d") => {
  return jwt.sign(userPayload, getJwtSecret(), { expiresIn });
};

/**
 * GET /api/auth/admin/exists
 * Checks if an administrator account already exists in the system
 */
export const checkAdminExists = async (req, res) => {
  try {
    const adminCount = await Admin.countDocuments();
    return res.status(200).json({
      success: true,
      exists: adminCount > 0,
      count: adminCount,
    });
  } catch (error) {
    console.error("Error checking admin existence:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking admin status.",
    });
  }
};

/**
 * POST /api/auth/admin/register
 * Admin Registration: creates a new administrator in the database
 * RESTRICTION: Only one admin account can be created. Subsequent self-registrations are disabled.
 */
export const adminRegister = async (req, res) => {
  try {
    // 0. Enforce Single-Admin Restriction Policy
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      return res.status(403).json({
        success: false,
        message: "Admin account already exists. Self-registration is disabled.",
      });
    }

    const { fullName, full_name, email, password, confirmPassword } = req.body;
    const name = (fullName || full_name || "").trim();
    const cleanEmail = (email || "").toLowerCase().trim();

    // 1. Validation
    if (!name || !cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Full Name, Email Address, and Password are required.",
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    // 2. Check for duplicate admin email
    const existingAdmin = await Admin.findOne({ email: cleanEmail });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "An Admin account with this email address already exists.",
      });
    }

    // 3. Hash password using bcrypt
    const password_hash = await bcrypt.hash(password, 10);

    // 4. Save new Admin directly to MongoDB database with role 'admin'
    const newAdmin = new Admin({
      full_name: name,
      email: cleanEmail,
      password_hash,
      role: "admin",
      profile_image_url: "",
    });

    const savedAdmin = await newAdmin.save();

    // 5. Generate real JWT session token
    const token = generateAuthToken({
      id: savedAdmin._id.toString(),
      email: savedAdmin.email,
      role: savedAdmin.role || "admin",
      fullName: savedAdmin.full_name,
    });

    // 6. Set HTTP Cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const safeAdmin = {
      _id: savedAdmin._id.toString(),
      id: savedAdmin._id.toString(),
      fullName: savedAdmin.full_name,
      full_name: savedAdmin.full_name,
      email: savedAdmin.email,
      role: savedAdmin.role || "admin",
      department: "Executive Management",
      position: "Administrator",
      avatar: savedAdmin.profile_image_url || "",
      profile_image_url: savedAdmin.profile_image_url || "",
      createdAt: savedAdmin.createdAt,
    };

    return res.status(201).json({
      success: true,
      message: "Admin account registered successfully.",
      token,
      admin: safeAdmin,
      user: safeAdmin,
    });
  } catch (error) {
    console.error("Admin registration error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to register admin account.",
    });
  }
};

/**
 * POST /api/auth/admin/login
 * Admin Login: verifies credentials against MongoDB database
 */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Query database for Admin user
    const dbAdmin = await Admin.findOne({ email: cleanEmail });

    if (!dbAdmin || !dbAdmin.password_hash) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin email or password credentials.",
      });
    }

    // 2. Compare password hash using bcrypt
    const isPasswordValid = await bcrypt.compare(password, dbAdmin.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin email or password credentials.",
      });
    }

    // 3. Generate real JWT session token
    const token = generateAuthToken({
      id: dbAdmin._id.toString(),
      email: dbAdmin.email,
      role: dbAdmin.role || "admin",
      fullName: dbAdmin.full_name,
    });

    // 4. Set HTTP Cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const safeAdmin = {
      _id: dbAdmin._id.toString(),
      id: dbAdmin._id.toString(),
      fullName: dbAdmin.full_name,
      full_name: dbAdmin.full_name,
      email: dbAdmin.email,
      role: dbAdmin.role || "admin",
      department: "Executive Management",
      position: dbAdmin.role === "super_admin" ? "Super Admin" : "Administrator",
      avatar: dbAdmin.profile_image_url || "",
      profile_image_url: dbAdmin.profile_image_url || "",
    };

    return res.status(200).json({
      success: true,
      message: "Admin login successful.",
      token,
      admin: safeAdmin,
      user: safeAdmin,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error during admin login.",
    });
  }
};

/**
 * POST /api/auth/employee/login
 * Employee Login: verifies credentials and active status against MongoDB database
 */
export const employeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email / Employee ID and password are required.",
      });
    }

    const cleanInput = email.trim();
    const cleanEmail = cleanInput.toLowerCase();
    const cleanPassword = password.trim();

    // 1. Query database for Employee by email or employeeId
    let employee = await Employee.findOne({
      $or: [{ email: cleanEmail }, { employeeId: cleanInput }],
    }).select("+password");

    // Fallback check User collection if needed
    if (!employee) {
      const user = await User.findOne({ email: cleanEmail }).select("+password");
      if (user) {
        employee = await Employee.findOne({ email: cleanEmail }).select("+password");
        if (!employee) {
          employee = user;
        }
      }
    }

    if (!employee || !employee.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 2. Check account status
    if (employee.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your employee account has been suspended. Please contact Administrator.",
      });
    }

    if (employee.status === "inactive" || employee.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your employee account is inactive. Please contact Administrator.",
      });
    }

    // 3. Verify password hash using bcrypt
    const isPasswordValid = await bcrypt.compare(cleanPassword, employee.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 4. Generate real JWT session token
    const token = generateAuthToken({
      id: employee._id.toString(),
      employeeId: employee.employeeId,
      email: employee.email,
      role: employee.role || "employee",
      fullName: employee.fullName,
    });

    // 5. Set HTTP Cookie
    res.cookie("employeeToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const safeEmployee = employee.toObject ? employee.toObject() : employee;
    delete safeEmployee.password;

    return res.status(200).json({
      success: true,
      message: "Employee login successful.",
      token,
      employee: safeEmployee,
      user: safeEmployee,
    });
  } catch (error) {
    console.error("Employee login error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error during employee login.",
    });
  }
};

/**
 * POST /api/auth/admin/logout or POST /api/auth/employee/logout or POST /api/auth/logout
 */
export const authLogout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    res.clearCookie("employeeToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Logout error.",
    });
  }
};

/**
 * GET /api/auth/me
 * Retrieves current database profile using verified JWT token
 */
export const getAuthMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token =
      req.cookies?.token ||
      req.cookies?.employeeToken ||
      bearerToken ||
      req.headers["x-admin-token"] ||
      req.headers["x-employee-token"];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No active session token found.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session token.",
      });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload.",
      });
    }

    if (decoded.role === "admin" || decoded.role === "super_admin") {
      if (mongoose.Types.ObjectId.isValid(decoded.id)) {
        const dbAdmin = await Admin.findById(decoded.id).select("-password_hash").lean();
        if (dbAdmin) {
          const adminAvatar = dbAdmin.avatarUrl || dbAdmin.profile_image_url || dbAdmin.avatar || dbAdmin.profilePicture || "";
          return res.status(200).json({
            success: true,
            role: "admin",
            user: {
              _id: dbAdmin._id.toString(),
              id: dbAdmin._id.toString(),
              fullName: dbAdmin.full_name,
              full_name: dbAdmin.full_name,
              email: dbAdmin.email,
              role: dbAdmin.role || "admin",
              department: "Executive Management",
              position: dbAdmin.role === "super_admin" ? "Super Admin" : "Administrator",
              avatar: adminAvatar,
              avatarUrl: adminAvatar,
              avatar_url: adminAvatar,
              profilePicture: adminAvatar,
              profile_picture: adminAvatar,
              profile_image_url: adminAvatar,
            },
          });
        }
      }

      return res.status(200).json({
        success: true,
        role: "admin",
        user: {
          _id: decoded.id,
          id: decoded.id,
          fullName: decoded.fullName || "Administrator",
          full_name: decoded.fullName || "Administrator",
          email: decoded.email || "",
          role: decoded.role || "admin",
          department: "Executive Management",
          position: "Administrator",
        },
      });
    } else {
      // Employee role
      let dbEmp = null;
      if (mongoose.Types.ObjectId.isValid(decoded.id)) {
        dbEmp = await Employee.findById(decoded.id).select("-password").lean();
      } else if (decoded.employeeId) {
        dbEmp = await Employee.findOne({ employeeId: decoded.employeeId }).select("-password").lean();
      }

      if (dbEmp) {
        const empAvatar = dbEmp.avatarUrl || dbEmp.profilePicture || dbEmp.avatar || dbEmp.profile_picture || dbEmp.profile_image_url || "";
        const safeEmp = {
          ...dbEmp,
          avatar: empAvatar,
          avatarUrl: empAvatar,
          avatar_url: empAvatar,
          profilePicture: empAvatar,
          profile_picture: empAvatar,
          profile_image_url: empAvatar,
        };
        return res.status(200).json({
          success: true,
          role: "employee",
          user: safeEmp,
          employee: safeEmp,
        });
      }

      return res.status(404).json({
        success: false,
        message: "Employee record not found in database.",
      });
    }
  } catch (error) {
    console.error("getAuthMe error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error resolving auth session.",
    });
  }
};
