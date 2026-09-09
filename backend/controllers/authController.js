import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Admin } from "../models/Admin.js";
import { Employee } from "../models/employeeModel.js";
import { User } from "../models/userModel.js";
import { Attendance } from "../models/attendanceModel.js";
import { liveAttendanceStore, autoCloseUnfinishedShifts } from "./employeeAttendance.js";

const getJwtSecret = () => process.env.JWT_SECRET || "default_jwt_secret_key_12345";

/**
 * Helper to check and verify if a user has an active, incomplete shift in the database immediately upon login
 */
export const verifyActiveIncompleteShift = async (employee) => {
  if (!employee) {
    return {
      hasActiveShift: false,
      activeShift: null,
      todayRecord: null,
      attendanceState: null,
    };
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const todayStr = startOfToday.toISOString().split("T")[0];

  const empId = employee._id ? employee._id.toString() : (employee.id ? employee.id.toString() : null);
  const empCode = employee.employeeId || "";
  const email = employee.email || "";

  // 1. Auto-close any lingering shift started before today that was never clocked out
  try {
    await autoCloseUnfinishedShifts(empId || empCode, employee);
  } catch (acErr) {
    console.warn("Could not auto-close stale shifts in verifyActiveIncompleteShift:", acErr.message);
  }

  let activeShift = null;
  let todayRecord = null;

  try {
    const activeShiftConditions = [
      ...(empId && mongoose.Types.ObjectId.isValid(empId) ? [{ employee: empId }] : []),
      ...(empCode ? [{ employeeId: empCode }] : []),
      ...(email ? [{ "employee.email": email }] : []),
    ];

    if (activeShiftConditions.length > 0) {
      // Look strictly for today's incomplete active shift
      activeShift = await Attendance.findOne({
        $or: activeShiftConditions,
        $and: [
          {
            $or: [
              { date: todayStr },
              { clockIn: { $gte: startOfToday, $lte: endOfToday } },
            ],
          },
          {
            $or: [
              { clockIn: { $ne: null, $exists: true } },
              { clockInTime: { $ne: null, $exists: true } },
            ],
          },
          {
            $or: [
              { clockOut: null },
              { clockOut: { $exists: false } },
            ],
          },
          {
            $or: [
              { clockOutTime: null },
              { clockOutTime: { $exists: false } },
            ],
          },
          {
            shiftStatus: { $ne: "Auto-Closed" },
          },
        ],
      })
        .populate("employee", "fullName employeeId department position email avatar")
        .sort({ createdAt: -1 })
        .lean();

      // 2. Query today's attendance record (completed or in progress)
      todayRecord = await Attendance.findOne({
        $or: activeShiftConditions,
        $or: [
          { date: todayStr },
          { clockIn: { $gte: startOfToday, $lte: endOfToday } },
        ],
      })
        .populate("employee", "fullName employeeId department position email avatar")
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();
    }
  } catch (err) {
    console.warn("Error querying active shift in authController:", err.message);
  }

  // 3. Check and sync with liveAttendanceStore in memory (strictly for today)
  if (liveAttendanceStore) {
    const keysToCheck = [
      empId ? `${empId}_${todayStr}` : null,
      empCode ? `${empCode}_${todayStr}` : null,
    ].filter(Boolean);

    for (const key of keysToCheck) {
      const memRec = liveAttendanceStore.get(key);
      if (memRec && (!memRec.date || memRec.date === todayStr)) {
        if (!todayRecord) todayRecord = memRec;
        if (!activeShift && (memRec.clockIn || memRec.clockInTime) && (!memRec.clockOut && !memRec.clockOutTime) && memRec.shiftStatus !== "Auto-Closed") {
          activeShift = memRec;
        }
        break;
      }
    }

    if (activeShift && (activeShift.date === todayStr || !activeShift.date)) {
      if (empId) liveAttendanceStore.set(`${empId}_${todayStr}`, activeShift);
      if (empCode) liveAttendanceStore.set(`${empCode}_${todayStr}`, activeShift);
    }
  }

  if (activeShift && !todayRecord) {
    todayRecord = activeShift;
  }

  const hasActiveShift = Boolean(activeShift && (!activeShift.date || activeShift.date === todayStr));
  const primaryRecord = (todayRecord && (!todayRecord.date || todayRecord.date === todayStr)) ? todayRecord : (hasActiveShift ? activeShift : null);

  const hasClockedIn = Boolean(
    hasActiveShift ||
    (primaryRecord && (primaryRecord.clockIn || primaryRecord.clockInTime) && (!primaryRecord.date || primaryRecord.date === todayStr))
  );
  const hasClockedOut = Boolean(
    !hasActiveShift &&
    primaryRecord &&
    (primaryRecord.clockOut || primaryRecord.clockOutTime) &&
    (!primaryRecord.date || primaryRecord.date === todayStr)
  );
  const isClockedIn = Boolean(hasActiveShift || (hasClockedIn && !hasClockedOut));
  const isClockedOut = hasClockedOut;

  const attendanceState = {
    hasActiveShift,
    hasClockedIn,
    hasClockedOut,
    isClockedIn,
    isClockedOut,
    isActiveShift: isClockedIn,
    clockIn: isClockedIn || hasClockedOut ? (primaryRecord?.clockIn || primaryRecord?.clockInTime || null) : null,
    clockOut: hasClockedOut ? (primaryRecord?.clockOut || primaryRecord?.clockOutTime || null) : null,
    status: primaryRecord?.status || (hasClockedIn ? "On Time" : "Not Clocked In"),
    workHours: Number(primaryRecord?.workHours || 0),
    delayMinutes: Number(primaryRecord?.delayMinutes ?? primaryRecord?.lateMinutes ?? 0),
    lateMinutes: Number(primaryRecord?.lateMinutes ?? primaryRecord?.delayMinutes ?? 0),
    latePenalty: Number(primaryRecord?.latePenalty ?? 0),
    penaltyTier: primaryRecord?.penaltyTier || "",
    lateReason: primaryRecord?.lateReason || primaryRecord?.notes || "",
    date: primaryRecord?.date || todayStr,
    shiftId: primaryRecord?._id || null,
  };

  return {
    hasActiveShift,
    activeShift: hasActiveShift ? activeShift : null,
    todayRecord: primaryRecord || null,
    attendance: primaryRecord || null,
    attendanceState,
  };
};

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

    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    };

    // 6. Set HTTP Cookies (auth_token primary)
    res.cookie("auth_token", token, cookieOptions);
    res.cookie("token", token, cookieOptions);

    const safeAdmin = {
      _id: savedAdmin._id.toString(),
      id: savedAdmin._id.toString(),
      name: savedAdmin.full_name,
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
      token,
      message: "Admin account registered successfully.",
      user: safeAdmin,
      admin: safeAdmin,
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

    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    };

    // 4. Set HTTP-only Cookies
    res.cookie("auth_token", token, cookieOptions);
    res.cookie("token", token, cookieOptions);

    const safeAdmin = {
      _id: dbAdmin._id.toString(),
      id: dbAdmin._id.toString(),
      name: dbAdmin.full_name,
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
      token,
      message: "Admin login successful.",
      user: safeAdmin,
      admin: safeAdmin,
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

    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    };

    // 5. Set HTTP-only Cookie
    res.cookie("auth_token", token, cookieOptions);
    res.cookie("employeeToken", token, cookieOptions);
    res.cookie("token", token, cookieOptions);

    const safeEmployee = employee.toObject ? employee.toObject() : employee;
    delete safeEmployee.password;
    safeEmployee.id = safeEmployee._id ? safeEmployee._id.toString() : safeEmployee.id;
    safeEmployee.name = safeEmployee.fullName || safeEmployee.name || "";
    safeEmployee.avatar = safeEmployee.avatar || safeEmployee.profilePicture || safeEmployee.profile_image_url || "";

    // Verify if employee has an active, incomplete shift in the database immediately upon login
    const shiftVerification = await verifyActiveIncompleteShift(safeEmployee);

    return res.status(200).json({
      success: true,
      token,
      message: shiftVerification.hasActiveShift
        ? "Employee login successful. You have an active ongoing shift."
        : "Employee login successful.",
      user: safeEmployee,
      employee: safeEmployee,
      hasActiveShift: shiftVerification.hasActiveShift,
      activeShift: shiftVerification.activeShift,
      todayRecord: shiftVerification.todayRecord,
      attendance: shiftVerification.attendance,
      attendanceState: shiftVerification.attendanceState,
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
    const clearOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    };

    res.clearCookie("auth_token", clearOptions);
    res.clearCookie("token", clearOptions);
    res.clearCookie("employeeToken", clearOptions);
    res.clearCookie("adminToken", clearOptions);

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
 * Retrieves current database profile using verified JWT token from HTTP-only cookie
 */
export const getAuthMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token =
      req.cookies?.auth_token ||
      req.cookies?.token ||
      req.cookies?.employeeToken ||
      req.cookies?.adminToken ||
      bearerToken ||
      req.headers["x-admin-token"] ||
      req.headers["x-employee-token"];

    if (!token) {
      if (process.env.NODE_ENV !== "production") {
        try {
          const activeEmp =
            (await Employee.findOne({ status: "active" }).lean()) ||
            (await Employee.findOne().lean());
          if (activeEmp) {
            const empAvatar = activeEmp.avatar || activeEmp.profilePicture || "";
            const empObj = {
              _id: activeEmp._id.toString(),
              id: activeEmp._id.toString(),
              name: activeEmp.fullName,
              fullName: activeEmp.fullName,
              email: activeEmp.email,
              role: activeEmp.role || "employee",
              employeeId: activeEmp.employeeId,
              department: activeEmp.department,
              position: activeEmp.position,
              avatar: empAvatar,
              profilePicture: empAvatar,
            };
            return res.status(200).json({
              success: true,
              role: empObj.role,
              user: empObj,
              employee: empObj,
            });
          }
        } catch (fbErr) {
          console.warn("[getAuthMe] Fallback error:", fbErr.message);
        }
      }

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

    if (!decoded || (!decoded.id && !decoded._id)) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload.",
      });
    }

    const userId = decoded.id || decoded._id;

    if (decoded.role === "admin" || decoded.role === "super_admin") {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        const dbAdmin = await Admin.findById(userId).select("-password_hash").lean();
        if (dbAdmin) {
          const adminAvatar = dbAdmin.avatarUrl || dbAdmin.profile_image_url || dbAdmin.avatar || dbAdmin.profilePicture || "";
          const adminObj = {
            _id: dbAdmin._id.toString(),
            id: dbAdmin._id.toString(),
            name: dbAdmin.full_name,
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
          };
          return res.status(200).json({
            success: true,
            role: "admin",
            user: adminObj,
            admin: adminObj,
          });
        }
      }

      const fallbackAdmin = {
        _id: userId,
        id: userId,
        name: decoded.fullName || "Administrator",
        fullName: decoded.fullName || "Administrator",
        full_name: decoded.fullName || "Administrator",
        email: decoded.email || "",
        role: decoded.role || "admin",
        department: "Executive Management",
        position: "Administrator",
        avatar: "",
      };

      return res.status(200).json({
        success: true,
        role: "admin",
        user: fallbackAdmin,
        admin: fallbackAdmin,
      });
    } else {
      // Employee role
      let dbEmp = null;
      if (mongoose.Types.ObjectId.isValid(userId)) {
        dbEmp = await Employee.findById(userId).select("-password").lean();
      }
      if (!dbEmp && decoded.employeeId) {
        dbEmp = await Employee.findOne({ employeeId: decoded.employeeId }).select("-password").lean();
      }
      if (!dbEmp && decoded.email) {
        dbEmp = await Employee.findOne({ email: decoded.email.toLowerCase() }).select("-password").lean();
      }
      if (!dbEmp && mongoose.Types.ObjectId.isValid(userId)) {
        dbEmp = await User.findById(userId).select("-password").lean();
      }

      if (dbEmp) {
        const empAvatar = dbEmp.avatarUrl || dbEmp.profilePicture || dbEmp.avatar || dbEmp.profile_picture || dbEmp.profile_image_url || "";
        const safeEmp = {
          ...dbEmp,
          _id: dbEmp._id.toString(),
          id: dbEmp._id.toString(),
          name: dbEmp.fullName || dbEmp.full_name || dbEmp.name || "",
          fullName: dbEmp.fullName || dbEmp.full_name || "",
          avatar: empAvatar,
          avatarUrl: empAvatar,
          avatar_url: empAvatar,
          profilePicture: empAvatar,
          profile_picture: empAvatar,
          profile_image_url: empAvatar,
          role: dbEmp.role || "employee",
        };

        const shiftVerification = await verifyActiveIncompleteShift(safeEmp);

        return res.status(200).json({
          success: true,
          role: safeEmp.role || "employee",
          user: safeEmp,
          employee: safeEmp,
          hasActiveShift: shiftVerification.hasActiveShift,
          activeShift: shiftVerification.activeShift,
          todayRecord: shiftVerification.todayRecord,
          attendance: shiftVerification.attendance,
          attendanceState: shiftVerification.attendanceState,
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
