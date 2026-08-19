import { Employee } from "../models/employeeModel.js";

//function to get all employees details
export const employeeDetails = async (req, res) => {
  try {
    const employees = await Employee.find({}).select("-password");

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No employees found.",
      });
    }

    res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

//employee names
export const employeeNameList = async (req, res) => {
  try {
    const employees = await Employee.find({})
      .select("_id employeeId  fullName")
      .lean();

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