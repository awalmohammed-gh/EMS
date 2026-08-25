import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    payslipNumber: {
      type: String,
      required: true,
      unique: true,
    },

    payMonth: {
      type: String,
      required: true,
    },

    paymentDate: {
      type: Date,
      required: true,
    },

    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    baseSalary: {
      type: Number,
      min: 0,
    },

    absentDaysDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    latenessDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAttendanceDeductions: {
      type: Number,
      default: 0,
      min: 0,
    },

    originalAbsenceDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    originalLatenessDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    penaltyOverride: {
      isWaived: { type: Boolean, default: false },
      waivedAbsenceDeduction: { type: Number, default: 0 },
      waivedLatenessDeduction: { type: Number, default: 0 },
      totalWaived: { type: Number, default: 0 },
      reason: { type: String, default: "" },
      waivedBy: { type: String, default: "" },
      waivedAt: { type: Date },
    },

    allowances: {
      type: Number,
      default: 0,
      min: 0,
    },

    deductions: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },

    earnings: {
      type: [
        {
          description: { type: String, required: true },
          amount: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },

    netSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    netPay: {
      type: Number,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["Bank Transfer", "Mobile Money", "Cash"],
      required: true,
    },

    status: {
      type: String,
      enum: ["Paid", "Pending"],
      default: "Paid",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate payroll for the same employee and month
payrollSchema.index({ employee: 1, payMonth: 1 }, { unique: true });

export const Payroll = mongoose.models.Payroll || mongoose.model("Payroll", payrollSchema);
