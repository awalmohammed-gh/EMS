import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Admin } from "../backend/models/Admin.js";

const seedSuperAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("❌ MONGODB_URI environment variable is required to run the seed script.");
      process.exit(1);
    }

    const baseUri = mongoUri.endsWith("/") ? mongoUri.slice(0, -1) : mongoUri;
    const connectionString = baseUri.includes("?") ? baseUri : `${baseUri}/employee-system`;

    console.log("Connecting to MongoDB...");
    await mongoose.connect(connectionString);
    console.log("✅ MongoDB Connected successfully.");

    const adminEmail = (process.env.ADMIN_EMAIL || "admin@eyenit.com").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_PSD || "admin123";
    const adminFullName = process.env.ADMIN_NAME || "System Administrator";

    console.log(`Checking for existing Admin account with email: ${adminEmail}`);
    const existingAdmin = await Admin.findOne({ email: adminEmail });

    const password_hash = await bcrypt.hash(adminPassword, 10);

    if (existingAdmin) {
      existingAdmin.full_name = adminFullName;
      existingAdmin.password_hash = password_hash;
      existingAdmin.role = "super_admin";
      await existingAdmin.save();
      console.log(`✅ Super Admin updated successfully: ${adminEmail}`);
    } else {
      const superAdmin = new Admin({
        full_name: adminFullName,
        email: adminEmail,
        password_hash,
        role: "super_admin",
        profile_image_url: "",
      });

      await superAdmin.save();
      console.log(`✅ Initial Super Admin created successfully: ${adminEmail}`);
    }

    console.log("Database seeding completed.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding Admin account:", error);
    process.exit(1);
  }
};

seedSuperAdmin();
