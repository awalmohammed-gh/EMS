import { Employee } from "../models/employeeModel.js";
import { Payroll } from "../models/payrollModel.js";

export const generatePayroll = async (req, res) => {
  try {
    const {
      employee,
      payMonth,
      paymentDate,
      basicSalary,
      allowances,
      deductions,
      paymentMethod,
      remarks,
    } = req.body;

    // Validate required fields
    if (
      !employee ||
      !payMonth ||
      !paymentDate ||
      basicSalary === undefined ||
      !paymentMethod
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are required.",
      });
    }

    // Check if employee exists
    const employeeData = await Employee.findById(employee);

    if (!employeeData) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // Prevent duplicate payroll for the same month
    const existingPayroll = await Payroll.findOne({
      employee,
      payMonth,
    });

    if (existingPayroll) {
      return res.status(409).json({
        success: false,
        message: `Payroll for ${payMonth} has already been generated for this employee.`,
      });
    }

    // Calculate net salary
    const netSalary =
      Number(basicSalary) + Number(allowances || 0) - Number(deductions || 0);

    // Generate unique payslip number
    const payslipNumber = `PAY-${Date.now()}`;

    // Create payroll
    const payroll = await Payroll.create({
      employee,
      payslipNumber,
      payMonth,
      paymentDate,
      basicSalary: Number(basicSalary),
      allowances: Number(allowances || 0),
      deductions: Number(deductions || 0),
      netSalary,
      paymentMethod,
      remarks,
      status: "Paid",
    });

    // Populate employee details
    await payroll.populate(
      "employee",
      "employeeId fullName email department position",
    );

    res.status(201).json({
      success: true,
      message: "Payroll generated successfully.",
      payroll,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

//function to get all payslips
export const allPayslips = async (req, res) => {
  try {
    const payslips = await Payroll.find({})
      .populate("employee", "fullName employeeId department")
      .lean();

    if (payslips.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No payslips found",
      });
    }

    return res.status(200).json({
      success: true,
      list: payslips,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// each employee payslip
export const employeePayslips = async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const payslips = await Payroll.find({
      employee: employeeId,
    })
      .populate("employee", "employeeId fullName department position")
      .sort({ paymentDate: -1 })
      .lean();

    const formattedPayslips = payslips.map((payslip) => ({
      id: payslip.payslipNumber,
      employeeId: payslip.employee.employeeId,
      employeeName: payslip.employee.fullName,
      department: payslip.employee.department,
      position: payslip.employee.position,
      month: payslip.payMonth,
      basicSalary: payslip.basicSalary,
      allowances: payslip.allowances,
      deductions: payslip.deductions,
      netSalary: payslip.netSalary,
      status: payslip.status,
      paymentDate: payslip.paymentDate,
    }));

    return res.status(200).json({
      success: true,
      payslips: formattedPayslips,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};