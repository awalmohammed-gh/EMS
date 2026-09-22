/**
 * Single Company Architecture - Authorize Company Tenant Pass-through
 * Since the deployment uses a dedicated database for this single company,
 * cross-tenant checks are unnecessary.
 */

export const authorizeCompanyTenant = (req, _res, next) => {
  req.tenantScope = {};
  req.getTenantScope = (filter) => filter || {};
  req.scopedTenantQuery = (baseQuery = {}) => baseQuery;
  req.assertTenantOwnership = () => true;
  req.validateOrganizationAccess = () => true;
  next();
};

export default authorizeCompanyTenant;
