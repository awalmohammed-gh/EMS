import mongoose from "mongoose";

const latenessTierSchema = new mongoose.Schema(
  {
    tier: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      default: "",
    },
    minMinutes: {
      type: Number,
      required: true,
      default: 0,
    },
    maxMinutes: {
      type: Number,
      required: true,
      default: 9999,
    },
    fine: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const companySettingsSchema = new mongoose.Schema(
  {
    workStartTime: {
      type: String,
      default: "08:00",
      trim: true,
    },
    workEndTime: {
      type: String,
      default: "19:00",
      trim: true,
    },
    gracePeriodMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    absenceDeductionRate: {
      type: Number,
      default: 15,
      min: 0,
    },
    lateTier1_amount: {
      type: Number,
      default: 10,
      min: 0,
    },
    lateTier2_amount: {
      type: Number,
      default: 30,
      min: 0,
    },
    lateTier3_amount: {
      type: Number,
      default: 50,
      min: 0,
    },
    lateTier4_amount: {
      type: Number,
      default: 75,
      min: 0,
    },
    lateTier5_amount: {
      type: Number,
      default: 100,
      min: 0,
    },
    lateTier6_amount: {
      type: Number,
      default: 150,
      min: 0,
    },
    latenessTiers: {
      type: [latenessTierSchema],
      default: () => [
        { tier: 1, name: "Tier 1 (1–30 mins)", minMinutes: 1, maxMinutes: 30, fine: 10 },
        { tier: 2, name: "Tier 2 (31–60 mins)", minMinutes: 31, maxMinutes: 60, fine: 30 },
        { tier: 3, name: "Tier 3 (61–120 mins / 1–2 hrs)", minMinutes: 61, maxMinutes: 120, fine: 50 },
        { tier: 4, name: "Tier 4 (121–180 mins / 2–3 hrs)", minMinutes: 121, maxMinutes: 180, fine: 75 },
        { tier: 5, name: "Tier 5 (181–240 mins / 3–4 hrs)", minMinutes: 181, maxMinutes: 240, fine: 100 },
        { tier: 6, name: "Tier 6 (241+ mins / 4+ hrs)", minMinutes: 241, maxMinutes: 9999, fine: 150 },
      ],
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Helper method to retrieve or initialize singleton settings document
companySettingsSchema.statics.getSingletonSettings = async function () {
  let doc = await this.findOne().exec();
  if (!doc) {
    doc = await this.create({
      workStartTime: "08:00",
      workEndTime: "19:00",
      gracePeriodMinutes: 0,
      absenceDeductionRate: 15,
      lateTier1_amount: 10,
      lateTier2_amount: 30,
      lateTier3_amount: 50,
      lateTier4_amount: 75,
      lateTier5_amount: 100,
      lateTier6_amount: 150,
      latenessTiers: [
        { tier: 1, name: "Tier 1 (1–30 mins)", minMinutes: 1, maxMinutes: 30, fine: 10 },
        { tier: 2, name: "Tier 2 (31–60 mins)", minMinutes: 31, maxMinutes: 60, fine: 30 },
        { tier: 3, name: "Tier 3 (61–120 mins / 1–2 hrs)", minMinutes: 61, maxMinutes: 120, fine: 50 },
        { tier: 4, name: "Tier 4 (121–180 mins / 2–3 hrs)", minMinutes: 121, maxMinutes: 180, fine: 75 },
        { tier: 5, name: "Tier 5 (181–240 mins / 3–4 hrs)", minMinutes: 181, maxMinutes: 240, fine: 100 },
        { tier: 6, name: "Tier 6 (241+ mins / 4+ hrs)", minMinutes: 241, maxMinutes: 9999, fine: 150 },
      ],
    });
  }
  return doc;
};

export const CompanySettings =
  mongoose.models.CompanySettings ||
  mongoose.model("CompanySettings", companySettingsSchema);

export default CompanySettings;

