import "dotenv/config";
import bcrypt from "bcryptjs";
import { Admin } from "../models/Admin.js";
import { connectMongodb, closeMongodb } from "../config/mongodb.js";

const seedSuperAdmin = async () => {
  try {
    console.log("Connecting to MongoDB via consolidated lifecycle...");
    await connectMongodb();
    console.log("✅ MongoDB Connected successfully.");

    const superAdminsToSeed = [
      {
        email: "mohammed@gmail.com",
        password: "mohammed0244",
        name: "Mohammed (Super Administrator)",
      },
    ];

    if (process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.toLowerCase().trim() !== "mohammed@gmail.com") {
      superAdminsToSeed.push({
        email: process.env.ADMIN_EMAIL.toLowerCase().trim(),
        password: process.env.ADMIN_PASSWORD || process.env.ADMIN_PSD || "mohammed0244",
        name: process.env.ADMIN_NAME || "System Administrator",
      });
    }

    for (const target of superAdminsToSeed) {
      const adminEmail = target.email;
      const adminPassword = target.password;
      const adminFullName = target.name;

      console.log(`Checking for existing Admin account with email: ${adminEmail}`);
      const existingAdmin = await Admin.findOne({ email: adminEmail });

      const password_hash = await bcrypt.hash(adminPassword, 10);

      if (existingAdmin) {
        existingAdmin.full_name = adminFullName;
        existingAdmin.password_hash = password_hash;
        existingAdmin.role = "super_admin";
        existingAdmin.organizationId = null;
        existingAdmin.companyId = null;
        await existingAdmin.save();
        console.log(`✅ Super Admin updated successfully: ${adminEmail}`);
      } else {
        const superAdmin = new Admin({
          full_name: adminFullName,
          email: adminEmail,
          password_hash,
          role: "super_admin",
          organizationId: null,
          companyId: null,
          profile_image_url: "",
          department: "Platform Administration",
          position: "Platform Super Administrator",
        });

        await superAdmin.save();
        console.log(`✅ Initial Super Admin created successfully: ${adminEmail}`);
      }
    }

    console.log("Database seeding completed.");
    await closeMongodb();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding Admin account:", error);
    process.exit(1);
  }
};

seedSuperAdmin();
