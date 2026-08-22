import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      required: [true, "Password hash is required"],
    },
    role: {
      type: String,
      default: "admin",
      enum: ["admin", "super_admin"],
    },
    profile_image_url: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password_hash;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password_hash;
        return ret;
      },
    },
  }
);

// Virtual aliases for compatibility with frontend and other modules
adminSchema.virtual("fullName").get(function () {
  return this.full_name;
});

adminSchema.virtual("avatar").get(function () {
  return this.profile_image_url;
});

export const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
export default Admin;
