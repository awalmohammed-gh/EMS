import { Settings } from "../models/adminSettingsModel.js";

// Get all settings
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();

    // Create default settings document if none exists
    if (!settings) {
      settings = await Settings.create({});
    }

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update company settings
export const updateCompanySettings = async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: { company: req.body } },
      { new: true, upsert: true },
    );

    res.status(200).json({
      success: true,
      message: "Company settings updated successfully.",
      company: settings.company,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update employee settings
export const updateEmployeeSettings = async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: { employee: req.body } },
      { new: true, upsert: true },
    );

    res.status(200).json({
      success: true,
      message: "Employee settings updated successfully.",
      employee: settings.employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update payroll settings
export const updatePayrollSettings = async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: { payroll: req.body } },
      { new: true, upsert: true },
    );

    res.status(200).json({
      success: true,
      message: "Payroll settings updated successfully.",
      payroll: settings.payroll,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update leave settings
export const updateLeaveSettings = async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: { leave: req.body } },
      { new: true, upsert: true },
    );

    res.status(200).json({
      success: true,
      message: "Leave settings updated successfully.",
      leave: settings.leave,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update attendance settings
export const updateAttendanceSettings = async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: { attendance: req.body } },
      { new: true, upsert: true },
    );

    res.status(200).json({
      success: true,
      message: "Attendance settings updated successfully.",
      attendance: settings.attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update security settings
export const updateSecuritySettings = async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: { security: req.body } },
      { new: true, upsert: true },
    );

    res.status(200).json({
      success: true,
      message: "Security settings updated successfully.",
      security: settings.security,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
