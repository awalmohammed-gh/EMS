import mongoose from "mongoose";

const performanceReviewSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    employeeId: {
      type: String,
      default: "",
      trim: true,
    },
    quarter: {
      type: String,
      required: true,
      trim: true,
    }, // e.g. "Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026"
    year: {
      type: Number,
      required: true,
    },
    quarterNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    overallRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    }, // Rating out of 5.0 (e.g. 4.6)
    targetRating: {
      type: Number,
      default: 4.0,
      min: 1,
      max: 5,
    },
    productivityScore: {
      type: Number,
      default: 85,
      min: 0,
      max: 100,
    },
    qualityScore: {
      type: Number,
      default: 88,
      min: 0,
      max: 100,
    },
    teamworkScore: {
      type: Number,
      default: 90,
      min: 0,
      max: 100,
    },
    initiativeScore: {
      type: Number,
      default: 85,
      min: 0,
      max: 100,
    },
    attendanceScore: {
      type: Number,
      default: 92,
      min: 0,
      max: 100,
    },
    reviewer: {
      type: String,
      default: "Executive Management & HR",
      trim: true,
    },
    reviewDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Completed", "Pending", "Draft"],
      default: "Completed",
    },
    feedbackSummary: {
      type: String,
      default: "Consistently delivers quality deliverables and contributes positively to team milestones.",
      trim: true,
    },
    strengths: [
      {
        type: String,
        trim: true,
      },
    ],
    growthOpportunities: [
      {
        type: String,
        trim: true,
      },
    ],
    goalsCompleted: {
      type: Number,
      default: 4,
      min: 0,
    },
    totalGoals: {
      type: Number,
      default: 5,
      min: 1,
    },
    promotionEligible: {
      type: Boolean,
      default: false,
    },
    performanceTier: {
      type: String,
      default: "Exceeds Expectations",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per employee + quarter
performanceReviewSchema.index({ employee: 1, quarter: 1 }, { unique: true });

export const PerformanceReview =
  mongoose.models.PerformanceReview ||
  mongoose.model("PerformanceReview", performanceReviewSchema);

export default PerformanceReview;
