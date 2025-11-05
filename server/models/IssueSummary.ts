import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IIssueSummary extends Document {
  clientId: Types.ObjectId;
  productId: Types.ObjectId;
  issued: number;
  returned: number;
  remaining: number;
  updatedAt: Date;
}

const issueSummarySchema = new Schema<IIssueSummary>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    issued: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    returned: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    remaining: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Unique compound index for clientId + productId
issueSummarySchema.index({ clientId: 1, productId: 1 }, { unique: true });

// Index for client-based queries
issueSummarySchema.index({ clientId: 1 });

export const IssueSummary =
  (mongoose.models.IssueSummary as any) ||
  model<IIssueSummary>("IssueSummary", issueSummarySchema);
