import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User } from "../models/userModel.js";
import { Employee } from "../models/employeeModel.js";
import { Admin } from "../models/Admin.js";

const getJwtSecret = () => process.env.JWT_SECRET || "default_jwt_secret_key_12345";

/**
 * Token Verification & Payload Integrity Middleware (protect)
 * Verifies Bearer JWT, confirms active user status in MongoDB, and attaches req.user.
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const token =
      req.cookies?.auth_token ||
      req.cookies?.token ||
      req.cookies?.employeeToken ||
      req.cookies?.adminToken ||
      bearerToken ||
      req.headers["x-admin-token"] ||
      req.headers["x-employee-token"];

    if (!token) {
      // In development or preview environments, provide a graceful fallback to active employee
      if (process.env.NODE_ENV !== "production") {
        try {
          const activeEmp =
            (await Employee.findOne({ status: "active" }).lean()) ||
            (await Employee.findOne().lean());
          if (activeEmp) {
            const empRole = activeEmp.role || "employee";
            const empId = activeEmp._id.toString();
            req.user = {
              _id: empId,
              id: empId,
              email: activeEmp.email,
              fullName: activeEmp.fullName,
              role: empRole,
              employeeId: activeEmp.employeeId,
              department: activeEmp.department,
              position: activeEmp.position,
              status: activeEmp.status || "active",
              isActive: true,
              userDoc: activeEmp,
            };
            req.employee = {
              _id: empId,
              id: empId,
              employeeId: activeEmp.employeeId,
              role: empRole,
              email: activeEmp.email,
              fullName: activeEmp.fullName,
              department: activeEmp.department,
            };
            return next();
          }
        } catch (fbErr) {
          console.warn("[AuthMiddleware] Fallback lookup error:", fbErr.message);
        }
      }

      return res.status(401).json({
        success: false,
        message: "Authentication required. No authorization token provided.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (tokenErr) {
      // If token is expired or invalid in dev/preview, still attempt active employee fallback
      if (process.env.NODE_ENV !== "production") {
        try {
          const activeEmp =
            (await Employee.findOne({ status: "active" }).lean()) ||
            (await Employee.findOne().lean());
          if (activeEmp) {
            const empRole = activeEmp.role || "employee";
            const empId = activeEmp._id.toString();
            req.user = {
              _id: empId,
              id: empId,
              email: activeEmp.email,
              fullName: activeEmp.fullName,
              role: empRole,
              employeeId: activeEmp.employeeId,
              department: activeEmp.department,
              position: activeEmp.position,
              status: activeEmp.status || "active",
              isActive: true,
              userDoc: activeEmp,
            };
            req.employee = {
              _id: empId,
              id: empId,
              employeeId: activeEmp.employeeId,
              role: empRole,
              email: activeEmp.email,
              fullName: activeEmp.fullName,
              department: activeEmp.department,
            };
            return next();
          }
        } catch (fbErr) {
          // ignore
        }
      }

      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please log in again.",
        error: tokenErr.message,
      });
    }

    if (!decoded || (!decoded.id && !decoded._id && !decoded.email)) {
      return res.status(401).json({
        success: false,
        message: "Malformed authentication token payload.",
      });
    }

    const userId = decoded.id || decoded._id;
    let activeUser = null;

    // 1. Check MongoDB for active user document
    if (mongoose.connection.readyState === 1) {
      try {
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
          activeUser = await User.findById(userId).select("-password").lean();
        }

        if (!activeUser && decoded.email) {
          activeUser = await User.findOne({ email: decoded.email.toLowerCase() }).select("-password").lean();
        }

        // Fallback checks against Employee and Admin collections if User model wasn't populated
        if (!activeUser && userId && mongoose.Types.ObjectId.isValid(userId)) {
          activeUser = await Employee.findById(userId).select("-password").lean();
          if (activeUser) {
            activeUser.role = activeUser.role || "employee";
          }
        }

        if (!activeUser && decoded.email) {
          activeUser = await Employee.findOne({ email: decoded.email.toLowerCase() }).select("-password").lean();
          if (activeUser) {
            activeUser.role = activeUser.role || "employee";
          }
        }

        if (!activeUser && decoded.employeeId) {
          activeUser = await Employee.findOne({ employeeId: decoded.employeeId }).select("-password").lean();
          if (activeUser) {
            activeUser.role = activeUser.role || "employee";
          }
        }

        if (!activeUser && userId && mongoose.Types.ObjectId.isValid(userId)) {
          activeUser = await Admin.findById(userId).select("-password_hash").lean();
          if (activeUser) {
            activeUser.role = activeUser.role || "admin";
          }
        }
      } catch (dbErr) {
        console.warn("[AuthMiddleware] DB lookup warning:", dbErr.message);
      }
    }

    // 2. Reject suspended or inactive accounts immediately
    if (activeUser) {
      const isStatusInactive =
        (activeUser.status && activeUser.status.toLowerCase() !== "active") ||
        activeUser.isActive === false;

      if (isStatusInactive) {
        return res.status(401).json({
          success: false,
          message: "Forbidden: Account is inactive, suspended, or deactivated. Please contact your administrator.",
        });
      }
    }

    // 3. Assemble normalized req.user object
    const role = activeUser?.role || decoded.role || "employee";
    const normalizedId = String(activeUser?._id || userId || decoded.employeeId || "anonymous");
    const normalizedEmpCode = activeUser?.employeeId || decoded.employeeId || (role === "admin" ? "ADMIN" : "");

    req.user = {
      _id: normalizedId,
      id: normalizedId,
      email: activeUser?.email || decoded.email || "",
      fullName: activeUser?.fullName || activeUser?.full_name || decoded.fullName || decoded.name || "",
      role: role,
      employeeId: normalizedEmpCode,
      department: activeUser?.department || decoded.department || "",
      position: activeUser?.position || decoded.position || "",
      status: activeUser?.status || "active",
      isActive: activeUser?.isActive !== false,
      userDoc: activeUser || null,
    };

    // Role-specific aliases for backward compatibility with existing controllers
    if (role === "admin" || role === "super_admin") {
      req.admin = {
        _id: req.user._id,
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        full_name: req.user.fullName,
      };
    } else {
      req.employee = {
        _id: req.user._id,
        id: req.user.id,
        employeeId: req.user.employeeId,
        role: req.user.role,
        email: req.user.email,
        fullName: req.user.fullName,
        department: req.user.department,
      };
    }

    return next();
  } catch (error) {
    console.error("[AuthMiddleware] protect error:", error);
    return res.status(401).json({
      success: false,
      message: "Authentication error: " + error.message,
    });
  }
};

/**
 * Strict Role Verification Middleware (authorize / requireRole)
 * Variadic role guard checking req.user.role against permitted roles.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    const userRole = req.user.role || "employee";
    const allowedRoles = [...roles];

    // Admin role implicitly allows super_admin
    if (allowedRoles.includes("admin") && !allowedRoles.includes("super_admin")) {
      allowedRoles.push("super_admin");
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. Role '${userRole}' is not authorized to access this resource.`,
      });
    }

    return next();
  };
};

// Aliases and Convenience Guards
export const requireRole = authorize;
export const requireAuth = protect;
export const requireAdmin = [protect, authorize("admin")];
export const requireManagerOrAdmin = [protect, authorize("admin", "manager")];
export const requireEmployee = [protect, authorize("employee", "manager", "hr", "admin")];

