import mongoose from "mongoose";

const companySettingsSchema = new mongoose.Schema(
  {
    workStartTime: {
      type: String,
      default: "08:00",
      trim: true,
    },
    absenceDeductionRate: {
      type: Number,
      default: 10,
      min: 0,
    },
    lateTier1_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateTier2_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateTier3_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateTier4_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateTier5_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateTier6_amount: {
      type: Number,
      default: 0,
      min: 0,
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
      absenceDeductionRate: 10,
      lateTier1_amount: 0,
      lateTier2_amount: 0,
      lateTier3_amount: 0,
      lateTier4_amount: 0,
      lateTier5_amount: 0,
      lateTier6_amount: 0,
    });
  }
  return doc;
};

export const CompanySettings =
  mongoose.models.CompanySettings ||
  mongoose.model("CompanySettings", companySettingsSchema);

export default CompanySettings;
