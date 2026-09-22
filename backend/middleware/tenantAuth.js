/**
 * Single Company Architecture - Tenant Auth Middleware
 * In single company deployment, all users belong to the single deployed company instance.
 * No multi-tenant workspace isolation or cross-tenant query rewriting required.
 */

export const tenantAuth = (req, _res, next) => {
  req.organizationId = null;
  req.companyId = null;
  req.tenantId = null;
  req.tenantScope = {};
  req.getTenantScope = (filter = {}) => filter;
  req.validateOrganizationAccess = () => true;
  req.assertTenantOwnership = () => true;
  next();
};

export default tenantAuth;
