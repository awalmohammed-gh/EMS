import { superAdminAuth } from "./superAdminAuth.js";

/**
 * verifySuperAdmin middleware
 * Dedicated to Platform Super Administrators.
 * Strictly verifies user has role: 'superAdmin' (or 'super_admin' / 'superadmin').
 * Company managers, administrators, and employees are rejected.
 * Completely disables companyId-based data filtering for platform-wide operations.
 */
export const verifySuperAdmin = superAdminAuth;

export { superAdminAuth };
export default superAdminAuth;

