import { Schema, model, Types } from "mongoose";

export type AuditLogAction = "CREATE" | "UPDATE" | "DELETE" | "MOVE";

const auditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ["CREATE", "UPDATE", "DELETE", "MOVE"],
      index: true
    },
    details: {
      type: String,
      required: true,
      trim: true
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
      index: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    }
  },
  {
    versionKey: false
  }
);

auditLogSchema.index({ timestamp: -1, _id: -1 });
auditLogSchema.index({ workspaceId: 1, timestamp: -1 });
auditLogSchema.index({ performedBy: 1, timestamp: -1 });

export const AuditLog = model("AuditLog", auditLogSchema);
