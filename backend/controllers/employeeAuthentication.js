import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Employee } from "../models/employeeModel.js";

// Create Employee Account
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
    } = req.body;

    // Validate input
    if (
      !employeeId ||
      !fullName ||
      !email ||
      !password ||
      !phone ||
      !department ||
      !position ||
      !employmentDate
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Check if email or employee ID already exists in DB
    const existingEmail = await Employee.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email already exists in database.",
      });
    }

    const existingEmployeeId = await Employee.findOne({ employeeId });
    if (existingEmployeeId) {
      return res.status(409).json({
        success: false,
        message: "Employee ID already exists in database.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create real MongoDB employee record with default active status and assigned role
    const employee = await Employee.create({
      employeeId,
      fullName,
      email,
      password: hashedPassword,
      phone,
      department,
      position,
      employmentDate: new Date(employmentDate),
      role: role || "employee",
      status: "active",
      isActive: true,
    });

    const safeEmployee = employee.toObject ? employee.toObject() : employee;
    delete safeEmployee.password;

    res.status(201).json({
      success: true,
      message: "Employee account created successfully in database.",
      employee: safeEmployee,
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

    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_key_12345";

    // Query real employee document from MongoDB
    const employee = await Employee.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { employeeId: email.trim() }],
    });

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/employee ID or password.",
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
        message: "Your account has been deactivated. Please contact HR.",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, employee.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: employee._id,
        employeeId: employee.employeeId,
        role: employee.role || "employee",
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
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
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



