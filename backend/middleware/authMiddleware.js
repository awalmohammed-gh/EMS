import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Admin } from "../models/Admin.js";
import { Employee } from "../models/employeeModel.js";
import { User } from "../models/userModel.js";

const getJwtSecret = () => process.env.JWT_SECRET || "default_jwt_secret_key_12345";

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token =
      req.cookies?.token ||
      req.cookies?.employeeToken ||
      bearerToken ||
      req.headers["x-admin-token"] ||
      req.headers["x-employee-token"];

    if (token) {
      try {
        const decoded = jwt.verify(token, getJwtSecret());
        if (decoded && decoded.id) {
          req.user = {
            id: String(decoded.id),
            _id: String(decoded.id),
            role: decoded.role || (decoded.role === "admin" || decoded.role === "super_admin" ? "admin" : "employee"),
            email: decoded.email || "",
            fullName: decoded.fullName || "",
            employeeId: decoded.employeeId || "",
          };

          if (req.user.role === "admin" || req.user.role === "super_admin") {
            req.admin = req.user;
          } else {
            req.employee = req.user;
          }
          return next();
        }
      } catch (tokenErr) {
        console.warn("JWT verification in requireAuth failed:", tokenErr.message);
      }
    }

    // Fallback headers if token is missing
    const headerAdminId = req.headers["x-admin-id"];
    const headerEmpId = req.headers["x-employee-id"] || req.query?.employeeId;
    const headerRole = req.headers["x-role"] || req.query?.role;

    if (headerRole === "admin" || headerAdminId) {
      req.user = {
        id: headerAdminId || "admin_001",
        _id: headerAdminId || "admin_001",
        role: "admin",
      };
      req.admin = req.user;
      return next();
    }

    if (headerEmpId) {
      req.user = {
        id: headerEmpId,
        _id: headerEmpId,
        role: "employee",
        employeeId: headerEmpId,
      };
      req.employee = req.user;
      return next();
    }

    return res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Authentication error: " + error.message,
    });
  }
};
