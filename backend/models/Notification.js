import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    // Supporting recipient_id for legacy/flexible compatibility
    recipient_id: {
      type: String,
      index: true,
    },
    recipient_role: {
      type: String,
      enum: ["admin", "employee"],
      default: "employee",
      index: true,
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
      default: "announcement",
    },
    category: {
      type: String,
      default: "announcement",
    },
    priority: {
      type: String,
      default: "normal",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    is_read: {
      type: Boolean,
      default: false,
      index: true,
    },
    announcementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Announcement",
    },
    action_url: {
      type: String,
      default: "",
    },
    action_label: {
      type: String,
      default: "View Details",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient_id: 1, is_read: 1, created_at: -1 });

export const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema, "notifications");

export default Notification;
