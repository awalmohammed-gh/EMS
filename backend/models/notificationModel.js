import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient_id: {
      type: String,
      required: true,
      index: true,
    },
    recipient_role: {
      type: String,
      enum: ["admin", "employee"],
      required: true,
      index: true,
    },
    sender_id: {
      type: String,
      default: "system",
    },
    sender_role: {
      type: String,
      enum: ["admin", "employee", "system"],
      default: "system",
    },
    sender_name: {
      type: String,
      default: "System",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "leave_request",
        "leave_approved",
        "leave_rejected",
        "payroll_published",
        "payroll_updated",
        "profile_updated",
        "attendance_alert",
        "announcement",
        "system_update",
        "custom",
      ],
      default: "system_update",
    },
    category: {
      type: String,
      enum: ["leave", "payroll", "profile", "attendance", "announcement", "system"],
      default: "system",
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low", "info"],
      default: "medium",
    },
    action_url: {
      type: String,
      default: "",
    },
    action_label: {
      type: String,
      default: "View Details",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    is_read: {
      type: Boolean,
      default: false,
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful index for querying notifications by role and recipient
notificationSchema.index({ recipient_role: 1, recipient_id: 1, created_at: -1 });

export const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema, "notifications");
