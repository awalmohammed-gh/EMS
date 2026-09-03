import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    company: {
      companyName: {
        type: String,
        default: "EYENIT Technologies",
      },
      logo: {
        type: String,
        default: "",
      },
      address: {
        type: String,
        default: "Accra, Ghana",
      },
      phone: {
        type: String,
        default: "",
      },
      email: {
        type: String,
        default: "",
      },
      website: {
        type: String,
        default: "",
      },
    },

    payroll: {
      currency: {
        type: String,
        default: "GHS",
      },
      currencySymbol: {
        type: String,
        default: "₵",
      },
      payrollFrequency: {
        type: String,
        enum: ["Weekly", "Biweekly", "Monthly"],
        default: "Monthly",
      },
      paymentDate: {
        type: Number,
        default: 25,
      },
      paymentMethods: {
        type: [String],
        default: ["Bank Transfer", "Mobile Money", "Cash"],
      },
    },

    leave: {
      annualLeaveDays: {
        type: Number,
        default: 15,
      },
      sickLeaveDays: {
        type: Number,
        default: 10,
      },
      casualLeaveDays: {
        type: Number,
        default: 5,
      },
      maternityLeaveDays: {
        type: Number,
        default: 90,
      },
      paternityLeaveDays: {
        type: Number,
        default: 14,
      },
      requireApproval: {
        type: Boolean,
        default: true,
      },
    },

    attendance: {
      workingDays: {
        type: [String],
        default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      },
      workStartTime: {
        type: String,
        default: "08:00",
      },
      workEndTime: {
        type: String,
        default: "19:00",
      },
      lateAfterMinutes: {
        type: Number,
        default: 15,
      },
      overtimeEnabled: {
        type: Boolean,
        default: true,
      },
    },

    security: {
      twoFactorAuthentication: {
        type: Boolean,
        default: false,
      },
      sessionTimeout: {
        type: Number,
        default: 30,
      },
      maxLoginAttempts: {
        type: Number,
        default: 5,
      },
      passwordExpiryDays: {
        type: Number,
        default: 90,
      },
    },
  },
  {
    timestamps: true,
  },
);

export const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);


