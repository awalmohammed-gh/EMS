import mongoose from "mongoose";
import { AuditLog } from "../models/AuditLog.js";

// In-memory fallback ring buffer for audit logs (holds up to 200 recent events)
export const inMemoryAuditLogs = [];

const MAX_IN_MEMORY_LOGS = 200;

/**
 * Logs a critical user action into MongoDB AuditLog collection and in-memory buffer.
 *
 * @param {Object} params
 * @param {Object} [params.req] - Express request object for IP, user-agent, and actor resolution
 * @param {string} params.action - Machine-readable action code (e.g. 'CREATE_EMPLOYEE', 'PAYROLL_FINALIZED')
 * @param {string} [params.category='Admin Settings'] - Audit category
 * @param {string} [params.target='Global'] - Entity target name/identifier
 * @param {string} [params.targetModel=''] - Model name (e.g. 'Employee', 'Payroll')
 * @param {string} params.summary - Human-readable narrative description of the event
 * @param {string} [params.details=''] - Additional contextual details
 * @param {Array} [params.changes=[]] - Array of { field, label, oldValue, newValue }
 * @param {Object} [params.metadata={}] - Structured metadata
 * @param {Object} [params.performedBy] - Explicit actor override if req not provided
 * @param {string} [params.organizationId] - Tenant organization ID
 */
export const logAuditAction = async ({
  req = null,
  action,
  category = "Admin Settings",
  target = "Global",
  targetModel = "",
  summary,
  details = "",
  changes = [],
  metadata = {},
  performedBy = null,
  organizationId = null,
}) => {
  if (!action || !summary) {
    console.warn("[AuditLogger] Missing required action or summary parameters.");
    return null;
  }

  // 1. Resolve Actor
  let actor = performedBy;
  if (!actor && req) {
    const user = req.admin || req.user || req.employee;
    actor = {
      id: String(user?._id || user?.id || user?.employeeId || "system_admin"),
      name: user?.fullName || user?.full_name || user?.name || "Administrator",
      email: user?.email || "admin@system.local",
      role: user?.role || (req.admin ? "admin" : "employee"),
    };
  }

  if (!actor) {
    actor = {
      id: "system",
      name: "System Administrator",
      email: "system@internal.local",
      role: "admin",
    };
  }

  // 2. Resolve Tenant
  const resolvedOrgId =
    organizationId ||
    req?.organizationId ||
    req?.admin?.organizationId ||
    req?.user?.organizationId ||
    null;

  // 3. Resolve Network Information
  const ipAddress =
    req?.ip ||
    req?.headers?.["x-forwarded-for"] ||
    req?.connection?.remoteAddress ||
    "127.0.0.1";

  const userAgent = req?.headers?.["user-agent"] || "";

  // 4. Construct Audit Record
  const logEntry = {
    _id: "audit_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    action: action.trim().toUpperCase(),
    category,
    organizationId: resolvedOrgId,
    performedBy: actor,
    target,
    targetModel,
    summary: summary.trim(),
    details: details ? details.trim() : summary.trim(),
    changes: Array.isArray(changes) ? changes : [],
    metadata: metadata || {},
    ipAddress,
    userAgent,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 5. Store in In-Memory ring buffer
  inMemoryAuditLogs.unshift(logEntry);
  if (inMemoryAuditLogs.length > MAX_IN_MEMORY_LOGS) {
    inMemoryAuditLogs.pop();
  }

  // 6. Persist to MongoDB AuditLog collection
  try {
    const createdDoc = await AuditLog.create({
      action: logEntry.action,
      category: logEntry.category,
      organizationId: resolvedOrgId && mongoose.Types.ObjectId.isValid(resolvedOrgId) ? resolvedOrgId : null,
      performedBy: logEntry.performedBy,
      target: logEntry.target,
      targetModel: logEntry.targetModel,
      summary: logEntry.summary,
      details: logEntry.details,
      changes: logEntry.changes,
      metadata: logEntry.metadata,
      ipAddress: logEntry.ipAddress,
      userAgent: logEntry.userAgent,
    });
    return createdDoc;
  } catch (dbErr) {
    console.warn("[AuditLogger] MongoDB save notice (relying on in-memory log):", dbErr.message);
    return logEntry;
  }
};

export default logAuditAction;
