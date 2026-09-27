/**
 * Enterprise Architecture - Tenant Auth Middleware
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
