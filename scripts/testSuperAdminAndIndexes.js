import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

import { Employee } from "../backend/models/employeeModel.js";
import { Attendance } from "../backend/models/attendanceModel.js";
import { Payroll } from "../backend/models/payrollModel.js";
import { Organization } from "../backend/models/Organization.js";
import { connectMongodb } from "../backend/config/mongodb.js";

async function runTests() {
  console.log("=================================================");
  console.log("TEST SUITE: Super Admin Route & Compound Indexes");
  console.log("=================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Verify Mongoose Model Indexes
  console.log("\n--- [PART 1] Verifying Compound Indexes { companyId: 1, _id: 1 } ---");

  function hasCompoundIndex(schema, field1, field2) {
    const indexes = schema.indexes();
    return indexes.some(([fields]) => fields[field1] === 1 && fields[field2] === 1);
  }

  assert(
    hasCompoundIndex(Employee.schema, "companyId", "_id"),
    "Employee collection has compound index on { companyId: 1, _id: 1 }"
  );

  assert(
    hasCompoundIndex(Attendance.schema, "companyId", "_id"),
    "Attendance collection has compound index on { companyId: 1, _id: 1 }"
  );

  assert(
    hasCompoundIndex(Payroll.schema, "companyId", "_id"),
    "Payroll collection has compound index on { companyId: 1, _id: 1 }"
  );

  // 2. Start server or test with native fetch
  console.log("\n--- [PART 2] Verifying Route /api/super-admin/companies Security & Filtering ---");
  
  await connectMongodb();

  const express = (await import("express")).default;
  const mod = await import("../backend/routes/superAdminRoutes.js");
  const superAdminRouter = mod.default || mod.superAdminRouter;

  const { tenantMiddleware } = await import("../backend/middleware/tenantMiddleware.js");
  const { authorizeCompanyTenant } = await import("../backend/middleware/authorizeCompanyTenant.js");

  const app = express();
  app.use(express.json());

  // Mount routes exactly as in server.js:
  // Super admin routes bypass company-tenant middleware
  app.use("/api/super-admin", superAdminRouter);
  app.use("/api", tenantMiddleware);
  app.use("/api", authorizeCompanyTenant);

  // Start listener on random free port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Seed sample organizations to test platform-wide retrieval
    await Organization.findOneAndUpdate(
      { slug: "test-org-alpha" },
      {
        companyName: "Alpha Corp",
        slug: "test-org-alpha",
        companyEmail: "contact@alpha.com",
        status: "active",
        subscriptionPlan: "enterprise",
      },
      { upsert: true, new: true }
    );

    await Organization.findOneAndUpdate(
      { slug: "test-org-beta" },
      {
        companyName: "Beta LLC",
        slug: "test-org-beta",
        companyEmail: "contact@beta.com",
        status: "active",
        subscriptionPlan: "growth",
      },
      { upsert: true, new: true }
    );

    const jwtSecret = process.env.JWT_SECRET || "eyenit_jwt_secret_dev_key_change_in_production";

    // Create test tokens
    const superAdminToken = jwt.sign(
      { id: new mongoose.Types.ObjectId(), email: "super@workpulse.com", role: "superadmin" },
      jwtSecret,
      { expiresIn: "1h" }
    );

    const superAdminTokenUnderscore = jwt.sign(
      { id: new mongoose.Types.ObjectId(), email: "super2@workpulse.com", role: "super_admin" },
      jwtSecret,
      { expiresIn: "1h" }
    );

    const companyAdminToken = jwt.sign(
      {
        id: new mongoose.Types.ObjectId(),
        email: "admin@alpha.com",
        role: "admin",
        companyId: new mongoose.Types.ObjectId().toString(),
      },
      jwtSecret,
      { expiresIn: "1h" }
    );

    const employeeToken = jwt.sign(
      {
        id: new mongoose.Types.ObjectId(),
        email: "worker@alpha.com",
        role: "employee",
        companyId: new mongoose.Types.ObjectId().toString(),
      },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // Test A: Unauthenticated request should be 401
    const resUnauth = await fetch(`${baseUrl}/api/super-admin/companies`);
    assert(
      resUnauth.status === 401,
      `Unauthenticated GET /api/super-admin/companies is rejected with 401 (got ${resUnauth.status})`
    );

    // Test B: Employee request should be 403
    const resEmployee = await fetch(`${baseUrl}/api/super-admin/companies`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(
      resEmployee.status === 403,
      `Employee with role: 'employee' is rejected with 403 (got ${resEmployee.status})`
    );

    // Test C: Company admin request should be 403
    const resAdmin = await fetch(`${baseUrl}/api/super-admin/companies`, {
      headers: { Authorization: `Bearer ${companyAdminToken}` },
    });
    assert(
      resAdmin.status === 403,
      `Company Admin with role: 'admin' is rejected with 403 (got ${resAdmin.status})`
    );

    // Test D: Super Admin with role: 'superadmin' should be 200
    const resSuper = await fetch(`${baseUrl}/api/super-admin/companies`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const bodySuper = await resSuper.json();
    assert(
      resSuper.status === 200,
      `Superadmin with role: 'superadmin' is authorized with 200 OK (got ${resSuper.status})`
    );

    // Test E: Super Admin with role: 'super_admin' should also be 200
    const resSuperUnderscore = await fetch(`${baseUrl}/api/super-admin/companies`, {
      headers: { Authorization: `Bearer ${superAdminTokenUnderscore}` },
    });
    assert(
      resSuperUnderscore.status === 200,
      `Superadmin with role: 'super_admin' is authorized with 200 OK (got ${resSuperUnderscore.status})`
    );

    // Test F: Validate that no companyId-based data filtering is applied
    assert(
      bodySuper.success === true,
      "Response contains success: true"
    );
    assert(
      bodySuper.companyIdFilteringApplied === false,
      "Response explicitly validates companyIdFilteringApplied: false"
    );
    assert(
      bodySuper.platformWide === true,
      "Response confirms platformWide: true execution"
    );

    const companyNames = (bodySuper.companies || []).map((c) => c.companyName);
    const includesAlpha = companyNames.includes("Alpha Corp");
    const includesBeta = companyNames.includes("Beta LLC");
    assert(
      includesAlpha && includesBeta,
      `Platform-wide operations return companies across different workspaces (${companyNames.join(", ")})`
    );
  } finally {
    try {
      await Organization.deleteMany({ slug: { $in: ["test-org-alpha", "test-org-beta"] } }, { skipTenant: true });
    } catch (e) {
      // Ignored
    }
    server.close();
  }

  console.log("\n=================================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
