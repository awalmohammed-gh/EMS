/**
 * Single Company Architecture - Tenant Scope Neutralizer
 * WorkPulse operates as a single company deployment per database instance.
 * All queries execute cleanly across the company's dedicated database.
 */

export const getTenantId = () => null;

export const combineTenantScope = (_scopeOrReq, query = {}) => {
  return query || {};
};

export const buildTenantScope = (_reqOrTenantId, additionalFilter = null) => {
  return additionalFilter || {};
};

export const validateOrganizationAccess = () => true;

export default buildTenantScope;
