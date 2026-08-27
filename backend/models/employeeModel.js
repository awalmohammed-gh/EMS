import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const employeeSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    position: {
      type: String,
      required: true,
      trim: true,
    },

    employmentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    baseSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    avatar: {
      type: String,
      default: "",
    },

    profilePicture: {
      type: String,
      default: "",
    },

    profile_picture: {
      type: String,
      default: "",
    },

    profile_image_url: {
      type: String,
      default: "",
    },

    totalLeaveDays: {
      type: Number,
      default: 20,
      min: 0,
    },

    usedLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    leaveBalance: {
      type: Number,
      default: 20,
      min: 0,
    },

    role: {
      type: String,
      enum: ["admin", "employee", "manager", "hr", "staff"],
      default: "employee",
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Pre-save hook for password hashing (prevents double-hashing)
employeeSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  if (
    typeof this.password === "string" &&
    (this.password.startsWith("$2a$") || this.password.startsWith("$2b$") || this.password.startsWith("$2y$"))
  ) {
    return;
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password helper method
employeeSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const Employee = mongoose.models.Employee || mongoose.model("Employee", employeeSchema);

