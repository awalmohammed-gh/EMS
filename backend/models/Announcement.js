import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    priority: {
      type: String,
      enum: ["normal", "urgent", "important", "low", "medium", "high"],
      default: "normal",
    },
    category: {
      type: String,
      default: "General",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    author: {
      type: String,
      default: "Admin",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

announcementSchema.index({ isPinned: -1, createdAt: -1 });

export const Announcement =
  mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema, "announcements");

export default Announcement;
