import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Announcement title is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Announcement content is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["Company News", "Policy Update", "General", "Urgent", "Event", "Holiday"],
      default: "Company News",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    author: {
      type: String,
      default: "Management / HR",
    },
    authorRole: {
      type: String,
      default: "admin",
    },
    targetAudience: {
      type: String,
      enum: ["all", "employees", "department"],
      default: "all",
    },
    department: {
      type: String,
      default: "All",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast sorting with pinned announcements first
announcementSchema.index({ isPinned: -1, createdAt: -1 });

export const Announcement =
  mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema, "announcements");

export default Announcement;
