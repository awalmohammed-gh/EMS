import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    employeeId: {
      type: String,
      default: "",
    },

    date: {
      type: String, 
      required: true,
    },

    clockIn: {
      type: Date,
      default: null,
    },

    clockInTime: {
      type: Date,
      default: null,
    },

    clockOut: {
      type: Date,
      default: null,
    },

    clockOutTime: {
      type: Date,
      default: null,
    },

    workHours: {
      type: Number,
      default: 0,
      min: 0,
      set: (v) => (v === null || v === undefined || isNaN(v) ? 0 : Number(Number(v).toFixed(2))),
    },

    status: {
      type: String,
      default: "Absent",
    },

    delayMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    lateMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    latePenalty: {
      type: Number,
      default: 0,
      min: 0,
    },

    penaltyTier: {
      type: String,
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    isExcused: {
      type: Boolean,
      default: false,
    },

    excuseReason: {
      type: String,
      trim: true,
      default: "",
    },

    excusedBy: {
      type: String,
      default: "",
    },

    excusedAt: {
      type: Date,
      default: null,
    },

    flaggedForReview: {
      type: Boolean,
      default: false,
    },

    flagReason: {
      type: String,
      trim: true,
      default: "",
    },

    flaggedBy: {
      type: String,
      default: "",
    },

    flaggedAt: {
      type: Date,
      default: null,
    },

    auditLog: {
      adminId: { type: String, default: "" },
      adminName: { type: String, default: "" },
      reason: { type: String, default: "" },
      timestamp: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for multi-user scaling, fast range queries, and unique check-ins
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ employee: 1, status: 1 });
attendanceSchema.index({ employee: 1, createdAt: -1 });

export const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);

