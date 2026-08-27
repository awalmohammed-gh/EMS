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
      default: 20,
      min: 0,
    },
    lateTier3_amount: {
      type: Number,
      default: 35,
      min: 0,
    },
    lateTier4_amount: {
      type: Number,
      default: 50,
      min: 0,
    },
    lateTier5_amount: {
      type: Number,
      default: 75,
      min: 0,
    },
    lateTier6_amount: {
      type: Number,
      default: 100,
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
      absenceDeductionRate: 15,
      lateTier1_amount: 10,
      lateTier2_amount: 20,
      lateTier3_amount: 35,
      lateTier4_amount: 50,
      lateTier5_amount: 75,
      lateTier6_amount: 100,
    });
  }
  return doc;
};

export const CompanySettings =
  mongoose.models.CompanySettings ||
  mongoose.model("CompanySettings", companySettingsSchema);

export default CompanySettings;
