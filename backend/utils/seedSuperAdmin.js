import bcrypt from "bcryptjs";
import { Admin } from "../models/Admin.js";
import { User } from "../models/userModel.js";

/**
 * Ensures Platform Super Administrator exists.
 * Seeds mohammed@gmail.com with password mohammed0244,
 * and also checks any configured SUPER_ADMIN_EMAIL.
 */
export const ensureSuperAdmin = async () => {
  try {
    const superAdmins = [
      {
        email: "mohammed@gmail.com",
        password: "mohammed0244",
        fullName: "Mohammed (Super Administrator)",
      },
    ];

    if (process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_EMAIL.toLowerCase().trim() !== "mohammed@gmail.com") {
      superAdmins.push({
        email: process.env.SUPER_ADMIN_EMAIL.toLowerCase().trim(),
        password: process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@2026",
        fullName: process.env.SUPER_ADMIN_NAME || "Platform Super Administrator",
      });
    }

    let primarySuperAdmin = null;

    for (const sa of superAdmins) {
      const email = sa.email.toLowerCase().trim();
      const password_hash = await bcrypt.hash(sa.password, 10);
      const fullName = sa.fullName;

      // 1. Ensure in Admin collection
      let existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        existingAdmin.full_name = fullName;
        existingAdmin.role = "admin";
        existingAdmin.isSuperAdmin = false;
        existingAdmin.organizationId = null;
        existingAdmin.companyId = null;
        existingAdmin.password_hash = password_hash;
        await existingAdmin.save();
      } else {
        existingAdmin = await Admin.create({
          full_name: fullName,
          email,
          password_hash,
          role: "admin",
          isSuperAdmin: false,
          organizationId: null,
          companyId: null,
          department: "Administration",
          position: "System Administrator",
        });
      }

      // 2. Ensure in User collection as well for unified lookup
      let existingUser = await User.findOne({ email });
      if (existingUser) {
        existingUser.fullName = fullName;
        existingUser.name = fullName;
        existingUser.role = "admin";
        existingUser.isSuperAdmin = false;
        existingUser.organizationId = null;
        existingUser.companyId = null;
        existingUser.password = password_hash;
        existingUser.status = "active";
        existingUser.isActive = true;
        await existingUser.save();
      } else {
        await User.create({
          fullName,
          name: fullName,
          email,
          password: password_hash,
          role: "admin",
          isSuperAdmin: false,
          organizationId: null,
          companyId: null,
          status: "active",
          isActive: true,
        });
      }

      if (!primarySuperAdmin) {
        primarySuperAdmin = existingAdmin;
      }
      console.log(`[Admin] System Admin account active: ${email}`);
    }

    return primarySuperAdmin;
  } catch (error) {
    console.error("[SuperAdmin] ensureSuperAdmin error:", error.message);
    return null;
  }
};

export default ensureSuperAdmin;
