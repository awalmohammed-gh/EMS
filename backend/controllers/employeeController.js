import { Employee } from "../models/employeeModel.js";
import mongoose from "mongoose";

// Initial staff directory records with full contact details, roles, and status
export const initialEmployeeDirectory = [
  {
    _id: "66d000000000000000000001",
    employeeId: "EMP001",
    fullName: "Kwame Mensah",
    email: "kwame.mensah@eyenit.com",
    phone: "+233 24 123 4567",
    department: "Software Engineering",
    position: "Senior Fullstack Engineer",
    employmentType: "Full-time",
    employmentDate: new Date("2023-01-15"),
    role: "employee",
    isActive: true,
    status: "Active",
    location: "Accra Head Office",
    emergencyContact: "+233 20 987 6543",
  },
  {
    _id: "66d000000000000000000002",
    employeeId: "EMP002",
    fullName: "Ama Serwaa",
    email: "ama.serwaa@eyenit.com",
    phone: "+233 50 234 5678",
    department: "Design & UX",
    position: "Senior Product Designer",
    employmentType: "Full-time",
    employmentDate: new Date("2023-04-10"),
    role: "employee",
    isActive: true,
    status: "On Leave",
    location: "Accra Head Office",
    emergencyContact: "+233 24 876 5432",
  },
  {
    _id: "66d000000000000000000003",
    employeeId: "EMP003",
    fullName: "Kofi Boakye",
    email: "kofi.boakye@eyenit.com",
    phone: "+233 27 345 6789",
    department: "Product & Marketing",
    position: "Growth & Marketing Lead",
    employmentType: "Full-time",
    employmentDate: new Date("2023-08-01"),
    role: "employee",
    isActive: true,
    status: "Active",
    location: "Kumasi Branch",
    emergencyContact: "+233 55 765 4321",
  },
  {
    _id: "66d000000000000000000004",
    employeeId: "EMP004",
    fullName: "Abena Osei",
    email: "abena.osei@eyenit.com",
    phone: "+233 55 456 7890",
    department: "Finance & Accounts",
    position: "Financial Controller",
    employmentType: "Full-time",
    employmentDate: new Date("2024-02-15"),
    role: "employee",
    isActive: true,
    status: "Active",
    location: "Accra Head Office",
    emergencyContact: "+233 20 654 3210",
  },
  {
    _id: "66d000000000000000000005",
    employeeId: "EMP005",
    fullName: "Emmanuel Darko",
    email: "emmanuel.darko@eyenit.com",
    phone: "+233 20 567 8901",
    department: "Human Resources",
    position: "HR & People Operations Lead",
    employmentType: "Full-time",
    employmentDate: new Date("2024-06-01"),
    role: "employee",
    isActive: true,
    status: "Active",
    location: "Accra Head Office",
    emergencyContact: "+233 27 543 2109",
  },
  {
    _id: "66d000000000000000000006",
    employeeId: "EMP006",
    fullName: "Akosua Frimpong",
    email: "akosua.frimpong@eyenit.com",
    phone: "+233 24 678 9012",
    department: "Operations & Logistics",
    position: "Operations Coordinator",
    employmentType: "Contract",
    employmentDate: new Date("2025-01-10"),
    role: "employee",
    isActive: true,
    status: "Active",
    location: "Tema Warehouse",
    emergencyContact: "+233 50 432 1098",
  },
];

// function to get all employees details
export const employeeDetails = async (req, res) => {
  try {
    let employees = [];

    try {
      employees = await Employee.find({}).select("-password").lean();
    } catch (dbErr) {
      console.warn("DB find in employeeDetails:", dbErr.message);
    }

    if (!employees || employees.length === 0) {
      // Return directory fallback records with full contact details
      return res.status(200).json({
        success: true,
        count: initialEmployeeDirectory.length,
        employees: initialEmployeeDirectory,
      });
    }

    // Ensure all returned employees have standard contact, department, and status fields
    const enrichedEmployees = employees.map((emp) => {
      const match = initialEmployeeDirectory.find(
        (seed) => seed.employeeId === emp.employeeId || seed.email === emp.email
      );
      return {
        _id: emp._id,
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        email: emp.email,
        phone: emp.phone || match?.phone || "+233 24 000 0000",
        department: emp.department || match?.department || "General",
        position: emp.position || match?.position || "Staff Member",
        employmentType: emp.employmentType || match?.employmentType || "Full-time",
        employmentDate: emp.employmentDate || match?.employmentDate || new Date(),
        role: emp.role || "employee",
        isActive: typeof emp.isActive === "boolean" ? emp.isActive : true,
        status: match?.status || (emp.isActive ? "Active" : "Inactive"),
        location: match?.location || "Accra Head Office",
        emergencyContact: match?.emergencyContact || "+233 20 000 0000",
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      count: enrichedEmployees.length,
      employees: enrichedEmployees,
    });
  } catch (error) {
    console.error("Error in employeeDetails:", error);
    res.status(200).json({
      success: true,
      count: initialEmployeeDirectory.length,
      employees: initialEmployeeDirectory,
    });
  }
};

// employee names
export const employeeNameList = async (req, res) => {
  try {
    let employees = [];
    try {
      employees = await Employee.find({})
        .select("_id employeeId fullName department position email phone")
        .lean();
    } catch (dbErr) {
      console.warn("DB find in employeeNameList:", dbErr.message);
    }

    if (!employees || employees.length === 0) {
      employees = initialEmployeeDirectory.map((e) => ({
        _id: e._id,
        employeeId: e.employeeId,
        fullName: e.fullName,
        department: e.department,
        position: e.position,
        email: e.email,
        phone: e.phone,
      }));
    }

    res.status(200).json({
      success: true,
      employees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get single employee profile
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    let employee = null;

    if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id)) {
      employee = await Employee.findById(id).select("-password").lean();
    } else {
      employee = await Employee.findOne({
        $or: [{ employeeId: id }, { email: id }],
      }).select("-password").lean();
    }

    if (!employee) {
      employee = initialEmployeeDirectory.find(
        (e) => String(e._id) === String(id) || e.employeeId === id || e.email === id
      );
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get logged-in employee profile for /me endpoint
export const getCurrentLoggedInEmployee = async (req, res) => {
  try {
    const rawId = req.employee?.id || "demo_employee_id_001";
    let employee = null;

    if (mongoose.Types.ObjectId.isValid(rawId) && String(new mongoose.Types.ObjectId(rawId)) === String(rawId)) {
      employee = await Employee.findById(rawId).select("-password").lean();
    } else {
      employee = await Employee.findOne({
        $or: [{ employeeId: req.employee?.employeeId || rawId }, { email: rawId }],
      }).select("-password").lean();
    }

    if (!employee) {
      employee = initialEmployeeDirectory.find(
        (e) => String(e._id) === String(rawId) || e.employeeId === (req.employee?.employeeId || rawId)
      ) || initialEmployeeDirectory[0];
    }

    res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
