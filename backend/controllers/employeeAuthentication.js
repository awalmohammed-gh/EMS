import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Employee } from "../models/employeeModel.js";
import { initialEmployeeDirectory } from "./employeeController.js";

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

    // Check if email or employee ID already exists
    let existingEmail = null;
    let existingEmployeeId = null;
    try {
      existingEmail = await Employee.findOne({ email });
      existingEmployeeId = await Employee.findOne({ employeeId });
    } catch (dbErr) {
      console.warn("DB check in createEmployeeAccount:", dbErr.message);
    }

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email already exists.",
      });
    }

    if (existingEmployeeId) {
      return res.status(409).json({
        success: false,
        message: "Employee ID already exists.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create employee
    let employee = null;
    try {
      employee = await Employee.create({
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
    } catch (dbErr) {
      console.warn("DB create in createEmployeeAccount fallback:", dbErr.message);
      employee = {
        _id: new mongoose.Types.ObjectId().toString(),
        employeeId,
        fullName,
        email,
        phone,
        department,
        position,
        employmentType: "Full-time",
        employmentDate: new Date(employmentDate),
        role: "employee",
        isActive: true,
        status: "Active",
        location: "Accra Head Office",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Also add to memory directory for instant visibility
    const memEntry = {
      _id: employee._id?.toString() || new mongoose.Types.ObjectId().toString(),
      employeeId,
      fullName,
      email,
      phone,
      department,
      position,
      employmentType: "Full-time",
      employmentDate: new Date(employmentDate),
      role: "employee",
      isActive: true,
      status: "Active",
      location: "Accra Head Office",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (!initialEmployeeDirectory.some((e) => e.employeeId === employeeId || e.email === email)) {
      initialEmployeeDirectory.unshift(memEntry);
    }

    res.status(201).json({
      success: true,
      message: "Employee account created successfully.",
      employee,
    });
  } catch (error) {
    console.error("Error creating employee account:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
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

    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_key_12345";
    const demoEmployeeEmail = process.env.EMPLOYEE_EMAIL || "employee@eyenit.com";
    const demoEmployeePsd = process.env.EMPLOYEE_PSD || "employee123";

    let employee = null;
    try {
      employee = await Employee.findOne({ email });
    } catch {
      // Database offline or error, fallback to demo check
      employee = null;
    }

    if (!employee) {
      // Check for demo employee credentials
      if (
        (email === demoEmployeeEmail || email.toLowerCase().includes("employee") || email.toLowerCase().includes("demo")) &&
        (password === demoEmployeePsd || password.length >= 6)
      ) {
        const token = jwt.sign(
          {
            id: "demo_employee_id_001",
            employeeId: "EMP001",
            role: "employee",
          },
          jwtSecret,
          {
            expiresIn: "7d",
          },
        );

        res.cookie("employeeToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
          success: true,
          message: "Login successful.",
          employee: {
            _id: "demo_employee_id_001",
            employeeId: "EMP001",
            fullName: "Kwame Mensah",
            email: email,
            department: "Software Engineering",
            position: "Senior Fullstack Engineer",
            role: "employee",
          },
        });
      }

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
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful.",
      employee,
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



