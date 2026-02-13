import { AuditLog, AuditLogAction } from "../models/audit-log.js";


export const saveAuditLog = async (action: AuditLogAction, details: string) => {
  await AuditLog.create({
    action,
    details,
    timestamp: new Date()
  });
};