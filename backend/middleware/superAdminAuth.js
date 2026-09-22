import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Admin } from "../models/Admin.js";
import { User } from "../models/userModel.js";
import { tenantStorage } from "./tenantMiddleware.js";

const getJwtSecret = () => process.env.JWT_SECRET || "default_jwt_secret_key_12345";

/**
 * Helper to test if a role string or document represents a platform Super Administrator.
 * Matches "superAdmin", "super_admin", "superadmin" (case-insensitive & separator-agnostic)
 * or explicit isSuperAdmin boolean flag.
 */
export const isSuperAdminRole = (role, doc = null) => {
  if (doc && (doc.isSuperAdmin === true || doc.isSuperAdmin === "true")) return true;
  if (!role || typeof role !== "string") return false;
  const cleaned = role.trim();
  const normalized = cleaned.replace(/[-_]/g, "").toLowerCase();
  return (
    cleaned === "superAdmin" ||
    cleaned === "super_admin" ||
    cleaned === "superadmin" ||
    normalized === "superadmin"
  );
};

/**
 * superAdminAuth Middleware
 *
 * Requirements:
 * 1. Verifies the incoming JWT token from Bearer authorization header or cookies.
 *    Returns 401 Unauthorized if token is missing, invalid, or expired.
 * 2. Checks the user's role to be `superAdmin` explicitly.
 *    Non-admin users (employees, managers, tenant admins) and users without explicit
 *    superAdmin role are strictly forbidden (403 Forbidden with FORBIDDEN_SUPERADMIN_ONLY).
 * 3. Enforces platform-level scope by ensuring no tenant company association (companyId / organizationId)
 *    and sets isSuperAdmin: true in tenantStorage context.
 */
export const superAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : null;

    const token =
      req.headers["x-super-admin-token"] ||
      bearerToken ||
      req.cookies?.superAdminToken ||
      req.cookies?.auth_token ||
      req.cookies?.token ||
      req.cookies?.admin_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. No authorization token provided.",
        code: "UNAUTHORIZED",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token. Please log in again.",
        error: err.message,
        code: "INVALID_TOKEN",
      });
    }

    if (!decoded || (!decoded.id && !decoded._id && !decoded.email)) {
      return res.status(401).json({
        success: false,
        message: "Malformed authentication token payload.",
        code: "MALFORMED_TOKEN",
      });
    }

    // 1. Explicit Role Check on JWT payload
    const tokenRole = decoded.role || "";
    const isSuperAdminPayload = decoded.isSuperAdmin === true || isSuperAdminRole(tokenRole);
    if (!isSuperAdminPayload) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: Access denied. This resource is strictly reserved for users with a 'superAdmin' role flag. Company administrators and employees cannot access platform management endpoints.",
        code: "FORBIDDEN_SUPERADMIN_ONLY",
      });
    }

    const userId = decoded.id || decoded._id;
    let dbUser = null;

    // 2. Database verification when connected to MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
          dbUser = await Admin.findById(userId).select("-password_hash -password").lean();
        }
        if (!dbUser && decoded.email) {
          dbUser = await Admin.findOne({ email: decoded.email.toLowerCase().trim() })
            .select("-password_hash -password")
            .lean();
        }
        if (!dbUser && userId && mongoose.Types.ObjectId.isValid(userId)) {
          dbUser = await User.findById(userId).select("-password").lean();
        }
        if (!dbUser && decoded.email) {
          dbUser = await User.findOne({ email: decoded.email.toLowerCase().trim() })
            .select("-password")
            .lean();
        }
      } catch (dbErr) {
        console.warn("[superAdminAuth] DB lookup warning:", dbErr.message);
      }
    }

    // 3. If account was found in DB, check active status, role, and tenant isolation
    if (dbUser) {
      const isInactive =
        (dbUser.status && dbUser.status.toLowerCase() !== "active") ||
        dbUser.isActive === false;

      if (isInactive) {
        return res.status(401).json({
          success: false,
          message:
            "Forbidden: Account is inactive or suspended. Please contact platform support.",
          code: "ACCOUNT_INACTIVE",
        });
      }

      // Explicit DB role and isSuperAdmin flag verification
      const dbRole = dbUser.role || "";
      const isSuperAdminDoc = dbUser.isSuperAdmin === true || isSuperAdminRole(dbRole, dbUser);
      if (!isSuperAdminDoc) {
        return res.status(403).json({
          success: false,
          message:
            "Forbidden: Access denied. Database record does not possess 'superAdmin' privileges.",
          code: "FORBIDDEN_SUPERADMIN_ONLY",
        });
      }

      // Platform Super Admin must NOT be bound to a tenant company
      if (dbUser.companyId || dbUser.organizationId) {
        return res.status(403).json({
          success: false,
          message:
            "Access Denied: Platform Super Admin cannot be associated with a tenant company.",
          code: "FORBIDDEN_SUPERADMIN_ONLY",
        });
      }
    }

    // 4. Assemble normalized req.user with explicit superAdmin role
    const normalizedId = String(dbUser?._id || userId || "superadmin");
    const adminEmail = dbUser?.email || decoded.email || "superadmin@workpulse.com";
    const adminName =
      dbUser?.fullName ||
      dbUser?.full_name ||
      dbUser?.name ||
      decoded.fullName ||
      decoded.name ||
      "Platform Super Administrator";

    req.user = {
      _id: normalizedId,
      id: normalizedId,
      email: adminEmail,
      fullName: adminName,
      name: adminName,
      role: "superAdmin",
      companyId: null,
      organizationId: null,
      tenantId: null,
      isSuperAdmin: true,
      userDoc: dbUser || null,
    };

    req.admin = { ...req.user };
    req.companyId = null;
    req.organizationId = null;
    req.tenantId = null;
    req.companyObjectId = null;
    req.organizationObjectId = null;
    req.isSuperAdmin = true;

    // Platform-wide tenant context execution
    return tenantStorage.run(
      {
        companyId: null,
        organizationId: null,
        tenantId: null,
        isSuperAdmin: true,
      },
      () => next()
    );
  } catch (error) {
    console.error("[superAdminAuth] Middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during Super Admin authentication.",
      code: "INTERNAL_AUTH_ERROR",
    });
  }
};

export default superAdminAuth;
