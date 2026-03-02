import { AuditLog, AuditLogAction } from "../models/audit-log.js";

export const saveAuditLog = async (
  action: AuditLogAction,
  details: string,
  performedById?: string,
  workspaceId?: string
) => {
  await AuditLog.create({
    action,
    details,
    performedBy: performedById || null,
    workspaceId: workspaceId || null,
    timestamp: new Date()
  });
};