import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Employee } from "../models/employeeModel.js";
import { User } from "../models/userModel.js";
import { Admin } from "../models/Admin.js";

// Create Employee / Staff User Account with Role Assignment (Admin-Restricted)
export const createEmployeeAccount = async (req, res) => {
  try {
    const {
      employeeId,
      fullName,
      email,
      password,
      phone,
      department,
      position,
      employmentDate,
      role,
      baseSalary,
    } = req.body;

    const assignedRole = (role || "employee").toLowerCase().trim();
    const cleanEmail = (email || "").toLowerCase().trim();
    const name = (fullName || "").trim();
    const plainPassword = (password || "").trim();
    const id = (employeeId || `EMP00${Math.floor(Math.random() * 900) + 100}`).trim();
    const parsedBaseSalary =
      baseSalary !== undefined && baseSalary !== "" && !isNaN(Number(baseSalary))
        ? Math.max(0, Number(baseSalary))
        : 0;

    // Validate input
    if (
      !id ||
      !name ||
      !cleanEmail ||
      !plainPassword ||
      !phone ||
      !department ||
      !position
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required (Employee ID, Full Name, Email, Password, Phone, Department, Position).",
      });
    }

    if (plainPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    // Check if email or employee ID already exists in Employee DB
    const existingEmail = await Employee.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "An employee with this email address already exists in the system.",
      });
    }

    const existingEmployeeId = await Employee.findOne({ employeeId: id });
    if (existingEmployeeId) {
      return res.status(409).json({
        success: false,
        message: `Employee ID "${id}" is already assigned to another staff member.`,
      });
    }

    // Pass plainPassword to model; schema pre-save hook handles hashing safely without double-hashing
    const employee = await Employee.create({
      employeeId: id,
      fullName: name,
      email: cleanEmail,
      password: plainPassword,
      phone: phone.trim(),
      department: department.trim(),
      position: position.trim(),
      employmentDate: employmentDate ? new Date(employmentDate) : new Date(),
      baseSalary: parsedBaseSalary,
      role: assignedRole,
      status: "active",
      isActive: true,
    });

    // Also sync to User collection
    try {
      await User.findOneAndUpdate(
        { email: cleanEmail },
        {
          fullName: name,
          email: cleanEmail,
          password: plainPassword,
          role: assignedRole,
          status: "active",
          isActive: true,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (userSyncErr) {
      console.warn("User collection sync in createEmployeeAccount:", userSyncErr.message);
    }

    // If an administrator role is assigned, also ensure Admin account entry exists
    if (assignedRole === "admin") {
      const existingAdmin = await Admin.findOne({ email: cleanEmail });
      if (!existingAdmin) {
        const adminHash = await bcrypt.hash(plainPassword, 10);
        await Admin.create({
          full_name: name,
          email: cleanEmail,
          password_hash: adminHash,
          role: "admin",
        });
      }
    }

    const safeEmployee = employee.toObject ? employee.toObject() : employee;
    delete safeEmployee.password;

    res.status(201).json({
      success: true,
      message: `Account for ${name} (${assignedRole.toUpperCase()}) created successfully.`,
      employee: safeEmployee,
      credentials: {
        email: cleanEmail,
        employeeId: id,
        temporaryPassword: plainPassword,
        role: assignedRole,
        fullName: name,
      },
    });
  } catch (error) {
    console.error("Error creating employee account:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error creating employee.",
    });
  }
};

// Employee Login directly against MongoDB
export const employeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const cleanInput = email.trim();
    const cleanEmail = cleanInput.toLowerCase();
    const cleanPassword = password.trim();
    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_key_12345";

    // Query real employee document from MongoDB (explicitly selecting password)
    let employee = await Employee.findOne({
      $or: [{ email: cleanEmail }, { employeeId: cleanInput }],
    }).select("+password");

    // Fallback search in User collection
    if (!employee) {
      const user = await User.findOne({ email: cleanEmail }).select("+password");
      if (user) {
        employee = await Employee.findOne({ email: cleanEmail }).select("+password");
      }
    }

    if (!employee || !employee.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (employee.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact HR or Administrator.",
      });
    }

    if (employee.status === "inactive" || employee.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact HR or Administrator.",
      });
    }

    const isPasswordMatch = await bcrypt.compare(cleanPassword, employee.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: employee._id.toString(),
        employeeId: employee.employeeId,
        email: employee.email,
        role: employee.role || "employee",
        fullName: employee.fullName,
      },
      jwtSecret,
      {
        expiresIn: "7d",
      },
    );

    // Save cookie
    res.cookie("employeeToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const safeEmployee = employee.toObject ? employee.toObject() : employee;
    delete safeEmployee.password;

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      employee: safeEmployee,
    });
  } catch (error) {
    console.error("Employee login error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error during login.",
    });
  }
};

// Employee Logout
export const employeeLogout = async (req, res) => {
  try {
    res.clearCookie("employeeToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.status(200).json({
      success: true,
      message: "Employee logged out successfully.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};




