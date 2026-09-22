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
    const bearerToken =
      authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    const token =
      bearerToken ||
      req.cookies?.auth_token ||
      req.cookies?.token ||
      req.cookies?.adminToken ||
      req.cookies?.employeeToken ||
      req.headers["x-admin-token"] ||
      req.headers["x-employee-token"] ||
      req.headers["x-auth-token"] ||
      req.headers["x-access-token"];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. No authorization token provided.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (tokenErr) {
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

    if (mongoose.connection.readyState === 1) {
      try {
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
          activeUser = await Admin.findById(userId).select("-password_hash").lean();
          if (!activeUser) {
            activeUser = await Employee.findById(userId).select("-password").lean();
          }
          if (!activeUser) {
            activeUser = await User.findById(userId).select("-password").lean();
          }
        }

        if (!activeUser && decoded.email) {
          const email = decoded.email.toLowerCase().trim();
          activeUser = await Admin.findOne({ email }).select("-password_hash").lean();
          if (!activeUser) {
            activeUser = await Employee.findOne({ email }).select("-password").lean();
          }
          if (!activeUser) {
            activeUser = await User.findOne({ email }).select("-password").lean();
          }
        }

        if (!activeUser && decoded.employeeId) {
          activeUser = await Employee.findOne({ employeeId: decoded.employeeId })
            .select("-password")
            .lean();
        }
      } catch (dbErr) {
        console.warn("[AuthMiddleware] DB lookup warning:", dbErr.message);
      }
    }

    if (activeUser) {
      const isStatusInactive =
        (activeUser.status && activeUser.status.toLowerCase() !== "active") ||
        activeUser.isActive === false;

      if (isStatusInactive) {
        return res.status(401).json({
          success: false,
          message: "Forbidden: Account is inactive or suspended. Please contact your administrator.",
        });
      }
    }

    const role = (activeUser?.role || decoded.role || "employee").toLowerCase();
    const normalizedId = String(activeUser?._id || userId || decoded.employeeId || "anonymous");
    const normalizedEmpCode =
      activeUser?.employeeId || decoded.employeeId || (role === "admin" ? "ADMIN" : "");

    req.organizationId = null;
    req.companyId = null;
    req.tenantId = null;
    req.tenantQuery = (baseQuery = {}) => baseQuery;
    req.ensureTenant = () => true;

    req.user = {
      _id: normalizedId,
      id: normalizedId,
      email: activeUser?.email || decoded.email || "",
      fullName:
        activeUser?.fullName ||
        activeUser?.full_name ||
        activeUser?.name ||
        decoded.fullName ||
        decoded.name ||
        "",
      role,
      employeeId: normalizedEmpCode,
      department: activeUser?.department || decoded.department || "",
      position: activeUser?.position || decoded.position || "",
      status: activeUser?.status || "active",
      isActive: activeUser?.isActive !== false,
      userDoc: activeUser || null,
    };

    req.admin = {
      _id: req.user._id,
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      full_name: req.user.fullName,
    };

    req.employee = {
      _id: req.user._id,
      id: req.user.id,
      employeeId: req.user.employeeId,
      role: req.user.role,
      email: req.user.email,
      fullName: req.user.fullName,
      department: req.user.department,
    };

    next();
  } catch (error) {
    console.error("[AuthMiddleware] protect error:", error);
    return res.status(401).json({
      success: false,
      message: "Authentication error: " + error.message,
    });
  }
};

/**
 * Role Verification Middleware (authorize / requireRole)
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    const userRole = (req.user.role || "employee").toLowerCase();
    const allowedRoles = roles.map((r) => r.toLowerCase());

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. Role '${userRole}' is not authorized to access this resource.`,
      });
    }

    return next();
  };
};

export const requireRole = authorize;
export const requireAuth = protect;
export const requireAdmin = [protect, authorize("admin", "manager")];
export const requireManagerOrAdmin = [protect, authorize("admin", "manager")];
export const requireEmployee = [protect, authorize("employee", "manager", "admin")];

export const requireSuperAdmin = (req, res, next) => {
  return res.status(404).json({
    success: false,
    message: "Super Admin routes are not available in single-company mode.",
  });
};

export const superAdminAuth = requireSuperAdmin;

export default {
  protect,
  authorize,
  requireAuth,
  requireAdmin,
  requireManagerOrAdmin,
  requireEmployee,
  requireSuperAdmin,
  superAdminAuth,
};
