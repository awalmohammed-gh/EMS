/**
 * Single Company Architecture - Enforce Company Middleware
 * In a single company deployment, there are no multi-tenant isolation barriers
 * or cross-tenant query rewriting required.
 */

export const enforceCompanyTenant = (_req, _res, next) => {
  next();
};

export default enforceCompanyTenant;
