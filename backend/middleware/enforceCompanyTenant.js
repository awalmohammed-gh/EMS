/**
 * Enterprise Architecture - Enforce Company Middleware
 */

export const enforceCompanyTenant = (_req, _res, next) => {
  next();
};

export default enforceCompanyTenant;
