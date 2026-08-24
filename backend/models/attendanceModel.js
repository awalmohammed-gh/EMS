import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    date: {
      type: String, 
      required: true,
    },

    clockIn: {
      type: Date,
      default: null,
    },

    clockOut: {
      type: Date,
      default: null,
    },

    workHours: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["On Time", "Late", "Absent", "Present", "On Leave"],
      default: "Absent",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// Prevent more than one attendance record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);
