import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
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

    // Check if email already exists
    const existingEmail = await Employee.findOne({ email });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email already exists.",
      });
    }

    // Check if employee ID already exists
    const existingEmployeeId = await Employee.findOne({ employeeId });

    if (existingEmployeeId) {
      return res.status(409).json({
        success: false,
        message: "Employee ID already exists.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create employee
    const employee = await Employee.create({
      employeeId,
      fullName,
      email,
      password: hashedPassword,
      phone,
      department,
      position,
      employmentDate,
      role: "employee",
    });

    res.status(201).json({
      success: true,
      message: "Employee account created successfully.",
      employee
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Employee Login
export const employeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const employee = await Employee.findOne({ email });

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!employee.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated.",
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
    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_key_12345";
    const token = jwt.sign(
      {
        id: employee._id,
        employeeId: employee.employeeId,
        role: employee.role,
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
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
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



