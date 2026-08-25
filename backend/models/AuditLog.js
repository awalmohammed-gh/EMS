import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["Penalties & Deductions", "Admin Settings", "Payroll", "Attendance", "Leave", "Employees", "Security"],
      default: "Penalties & Deductions",
      index: true,
    },
    performedBy: {
      id: { type: String, default: "" },
      name: { type: String, default: "Administrator" },
      email: { type: String, default: "admin@system.local" },
      role: { type: String, default: "admin" },
    },
    target: {
      type: String,
      default: "Global Settings",
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    changes: [
      {
        field: { type: String, required: true },
        label: { type: String, required: true },
        oldValue: { type: mongoose.Schema.Types.Mixed },
        newValue: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "127.0.0.1",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
