import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IStockLedger extends Document {
  productId: Types.ObjectId;
  qtyChange: number;
  reason: "invoice" | "return" | "manual";
  refType: "Invoice" | "Return";
  refId: Types.ObjectId;
  at: Date;
}

const stockLedgerSchema = new Schema<IStockLedger>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    qtyChange: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      enum: ["invoice", "return", "manual"],
      required: true,
    },
    refType: {
      type: String,
      enum: ["Invoice", "Return"],
      required: true,
    },
    refId: {
      type: Schema.Types.ObjectId,
      required: true,
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

export const StockLedger =
  (mongoose.models.StockLedger as any) ||
  model<IStockLedger>("StockLedger", stockLedgerSchema);
