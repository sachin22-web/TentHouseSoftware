import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IIssueTxn extends Document {
  clientId: Types.ObjectId;
  productId: Types.ObjectId;
  qty: number;
  type: "issue" | "return";
  ref: string; // Can be 'Invoice' or a string note
  at: Date;
}

const issueTxnSchema = new Schema<IIssueTxn>(
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
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
    type: {
      type: String,
      enum: ["issue", "return"],
      required: true,
    },
    ref: {
      type: String,
      required: true,
      trim: true,
    },
    at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Index for client + product queries
issueTxnSchema.index({ clientId: 1, productId: 1 });

// Index for time-based queries (latest first)
issueTxnSchema.index({ at: -1 });

// Index for type-based queries
issueTxnSchema.index({ type: 1 });

export const IssueTxn =
  (mongoose.models.IssueTxn as any) ||
  model<IIssueTxn>("IssueTxn", issueTxnSchema);
