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
