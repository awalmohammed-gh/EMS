import jwt from "jsonwebtoken";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_key_12345";

function assert(description, condition) {
  if (condition) {
    console.log(`✅ [PASS] ${description}`);
  } else {
    console.error(`❌ [FAIL] ${description}`);
    process.exitCode = 1;
  }
}

async function runSuperAdminSecurityTests() {
  console.log("=======================================================");
  console.log("🔒 TESTING SUPER ADMIN AUTHENTICATION & ROUTE AUDIT");
  console.log("=======================================================");

  const endpoints = [
    "/api/super-admin/me",
    "/api/super-admin/stats",
    "/api/super-admin/dashboard",
    "/api/super-admin/tenants-overview",
    "/api/super-admin/companies",
    "/api/super-admin/tenants",
    "/api/super-admin/organizations",
    "/api/super-admin/settings",
  ];

  // 1. Direct unauthenticated requests to all endpoints
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep}`, {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      assert(
        `Unauthenticated access to ${ep} returns 401 UNAUTHORIZED`,
        res.status === 401 && (data.code === "UNAUTHORIZED" || data.success === false)
      );
    } catch (e) {
      assert(`Fetch failed for ${ep}: ${e.message}`, false);
    }
  }

  // 2. Direct requests with non-admin tokens (role: employee, manager, admin)
  const nonAdminRoles = ["employee", "manager", "admin", "hr", "user"];
  for (const r of nonAdminRoles) {
    const forgedToken = jwt.sign(
      { id: "fake_id_123", role: r, email: `${r}@company.test`, companyId: "comp_123" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const res = await fetch(`${BASE_URL}/api/super-admin/companies`, {
      headers: {
        Authorization: `Bearer ${forgedToken}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    assert(
      `Role '${r}' accessing /api/super-admin/companies is rejected (403 FORBIDDEN_SUPERADMIN_ONLY)`,
      res.status === 403 && data.code === "FORBIDDEN_SUPERADMIN_ONLY"
    );
  }

  // 3. Direct requests with invalid / tampered tokens
  try {
    const res = await fetch(`${BASE_URL}/api/super-admin/companies`, {
      headers: {
        Authorization: "Bearer invalid.jwt.token.string",
        "Content-Type": "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    assert(
      "Invalid JWT token returns 401 INVALID_TOKEN",
      res.status === 401 && data.code === "INVALID_TOKEN"
    );
  } catch (e) {
    assert(`Invalid token test failed: ${e.message}`, false);
  }

  // 4. Direct requests with valid superAdmin token
  const superAdminToken = jwt.sign(
    { id: "sa_valid_id", role: "superAdmin", email: "superadmin.audit@platform.test" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  try {
    const res = await fetch(`${BASE_URL}/api/super-admin/companies`, {
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    assert(
      "Valid superAdmin token allows access to /api/super-admin/companies (200 OK)",
      res.status === 200 && data.success === true
    );
  } catch (e) {
    assert(`superAdmin valid request failed: ${e.message}`, false);
  }

  // 6. Test: Safe administrative provisioning endpoint lockout
  try {
    const res = await fetch(`${BASE_URL}/api/super-admin/provision-first-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "malicious_intruder@platform.com",
        password: "StrongPassword123!",
        fullName: "Attacker",
      }),
    });
    const data = await res.json().catch(() => ({}));
    assert(
      "Public attempt to provision another Super Admin is blocked (403 SUPER_ADMIN_ALREADY_PROVISIONED)",
      res.status === 403 && data.code === "SUPER_ADMIN_ALREADY_PROVISIONED"
    );
  } catch (e) {
    assert(`Provisioning lockout test failed: ${e.message}`, false);
  }

  // 7. Test: Tenant admin registration requires authentication (401 without token)
  try {
    const res = await fetch(`${BASE_URL}/api/admin/create-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Unauthenticated Attempt",
        email: "escalation@tenant.com",
        password: "TenantAdminPassword123!",
        role: "superAdmin",
        isSuperAdmin: true,
      }),
    });
    assert(
      "Unauthenticated attempt to hit admin/create-account is blocked (401 Unauthorized)",
      res.status === 401
    );
  } catch (e) {
    assert(`Tenant registration auth test failed: ${e.message}`, false);
  }

  // 8. Test: Authenticated tenant admin cannot escalate or provision a Super Admin
  try {
    const adminToken = jwt.sign(
      { id: "admin_user_id", role: "admin", companyId: "654321654321654321654321" },
      JWT_SECRET
    );
    const res = await fetch(`${BASE_URL}/api/admin/create-account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: "Privilege Escalation Attempt",
        email: "escalation@tenant.com",
        password: "TenantAdminPassword123!",
        role: "superAdmin",
        isSuperAdmin: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    assert(
      "Attempt to provision Super Admin via authenticated admin/create-account is blocked (403 FORBIDDEN_SUPERADMIN_PROVISIONING)",
      res.status === 403 && data.code === "FORBIDDEN_SUPERADMIN_PROVISIONING"
    );
  } catch (e) {
    assert(`Tenant escalation test failed: ${e.message}`, false);
  }

  console.log("=======================================================");
  if (process.exitCode === 1) {
    console.error("❌ Super Admin security test suite failed.");
  } else {
    console.log("🛡️ All Super Admin security & audit tests passed successfully!");
  }
  console.log("=======================================================");
}

runSuperAdminSecurityTests();
