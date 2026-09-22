import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
  {
    platformName: {
      type: String,
      default: "WorkPulse Platform",
      trim: true,
    },
    supportEmail: {
      type: String,
      default: "support@workpulse.com",
      trim: true,
      lowercase: true,
    },
    allowRegistration: {
      type: Boolean,
      default: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    defaultTrialDays: {
      type: Number,
      default: 14,
      min: 1,
    },
    maxFreeEmployees: {
      type: Number,
      default: 25,
      min: 1,
    },
    platformAnnouncement: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

platformSettingsSchema.statics.getSingletonSettings = async function () {
  let settings = await this.findOne().exec();
  if (!settings) {
    settings = await this.create({
      platformName: "WorkPulse Platform",
      supportEmail: "support@workpulse.com",
      allowRegistration: true,
      maintenanceMode: false,
      defaultTrialDays: 14,
      maxFreeEmployees: 25,
      platformAnnouncement: "",
    });
  }
  return settings;
};

export const PlatformSettings =
  mongoose.models.PlatformSettings ||
  mongoose.model("PlatformSettings", platformSettingsSchema);

export default PlatformSettings;
