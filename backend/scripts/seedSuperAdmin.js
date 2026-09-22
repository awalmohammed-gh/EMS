import "dotenv/config";
import bcrypt from "bcryptjs";
import { Admin } from "../models/Admin.js";
import { User } from "../models/userModel.js";
import { connectMongodb, closeMongodb } from "../config/mongodb.js";

/**
 * Administrative Seed Script
 * Safely provisions the primary Platform Super Administrator account.
 * This script runs strictly outside the standard public registration flow.
 *
 * Usage:
 *   node backend/scripts/seedSuperAdmin.js
 *   SUPER_ADMIN_EMAIL=custom@domain.com SUPER_ADMIN_PASSWORD=secret node backend/scripts/seedSuperAdmin.js
 */
export const seedSuperAdmin = async () => {
  try {
    console.log("=======================================================");
    console.log("🛡️  PROVISIONING PLATFORM SUPER ADMINISTRATOR");
    console.log("=======================================================");

    await connectMongodb();
    console.log("✅ MongoDB connected successfully.");

    const email = (
      process.env.SUPER_ADMIN_EMAIL ||
      process.env.ADMIN_EMAIL ||
      "mohammed@gmail.com"
    )
      .toLowerCase()
      .trim();

    const rawPassword =
      process.env.SUPER_ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD ||
      "mohammed0244";

    const fullName =
      process.env.SUPER_ADMIN_NAME ||
      process.env.ADMIN_NAME ||
      "Mohammed (Platform Super Administrator)";

    if (rawPassword.length < 8) {
      console.warn("⚠️ Warning: Recommended password length for Super Admin is at least 8 characters.");
    }

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // 1. Provision / Update Admin collection
    let adminRecord = await Admin.findOne({ email });
    if (adminRecord) {
      adminRecord.full_name = fullName;
      adminRecord.password_hash = passwordHash;
      adminRecord.role = "superAdmin";
      adminRecord.isSuperAdmin = true;
      adminRecord.companyId = null;
      adminRecord.organizationId = null;
      adminRecord.department = "Platform Administration";
      adminRecord.position = "Platform Super Administrator";
      await adminRecord.save();
      console.log(`✅ [Admin] Existing account upgraded to Super Admin: ${email}`);
    } else {
      adminRecord = await Admin.create({
        full_name: fullName,
        email,
        password_hash: passwordHash,
        role: "superAdmin",
        isSuperAdmin: true,
        companyId: null,
        organizationId: null,
        department: "Platform Administration",
        position: "Platform Super Administrator",
      });
      console.log(`✅ [Admin] New Super Admin created: ${email}`);
    }

    // 2. Provision / Update User collection for unified platform lookups
    let userRecord = await User.findOne({ email });
    if (userRecord) {
      userRecord.fullName = fullName;
      userRecord.name = fullName;
      userRecord.password = passwordHash;
      userRecord.role = "superAdmin";
      userRecord.isSuperAdmin = true;
      userRecord.companyId = null;
      userRecord.organizationId = null;
      userRecord.status = "active";
      userRecord.isActive = true;
      await userRecord.save();
      console.log(`✅ [User] Existing account updated with Super Admin credentials: ${email}`);
    } else {
      userRecord = await User.create({
        fullName,
        name: fullName,
        email,
        password: passwordHash,
        role: "superAdmin",
        isSuperAdmin: true,
        companyId: null,
        organizationId: null,
        status: "active",
        isActive: true,
      });
      console.log(`✅ [User] New Super Admin created in User collection: ${email}`);
    }

    console.log("-------------------------------------------------------");
    console.log("🔒 Platform Super Admin provisioned securely:");
    console.log(`   - Email: ${email}`);
    console.log(`   - Role: ${adminRecord.role}`);
    console.log(`   - isSuperAdmin: ${adminRecord.isSuperAdmin}`);
    console.log("   - Company / Tenant Association: None (Platform-wide scope)");
    console.log("   - Public Self-Registration: Strictly Disabled");
    console.log("=======================================================");

    await closeMongodb();
    return { success: true, email, role: "superAdmin" };
  } catch (error) {
    console.error("❌ Failed to provision Super Admin account:", error);
    try {
      await closeMongodb();
    } catch (_) {}
    process.exitCode = 1;
    throw error;
  }
};

// Auto-run if executed directly from CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSuperAdmin()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
