import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IAuditLog extends Document {
  action: string;
  entity: string;
  entityId?: Types.ObjectId;
  userId?: Types.ObjectId;
  meta?: Record<string, any>;
  at: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, trim: true },
    entity: { type: String, required: true, trim: true },
    entityId: { type: Schema.Types.ObjectId },
    userId: { type: Schema.Types.ObjectId, ref: "Admin" },
    meta: { type: Schema.Types.Mixed },
    at: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

auditLogSchema.index({ entity: 1, entityId: 1, at: -1 });

export const AuditLog =
  (mongoose.models.AuditLog as any) ||
  model<IAuditLog>("AuditLog", auditLogSchema);
