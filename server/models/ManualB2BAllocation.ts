import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IManualB2BAllocation extends Document {
  productId: Types.ObjectId;
  allocations: Array<{
    stockId: Types.ObjectId;
    quantityRemaining: number;
    supplierName?: string;
  }>;
  totalRemaining: number;
  createdAt: Date;
  updatedAt: Date;
}

const allocationSchema = new Schema<{
  stockId: Types.ObjectId;
  quantityRemaining: number;
  supplierName?: string;
}>(
  {
    stockId: { type: Schema.Types.ObjectId, ref: "B2BStock", required: true },
    quantityRemaining: { type: Number, required: true, min: 0 },
    supplierName: { type: String },
  },
  { _id: false },
);

const manualB2BAllocationSchema = new Schema<IManualB2BAllocation>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    allocations: {
      type: [allocationSchema],
      required: true,
      default: [],
    },
    totalRemaining: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

manualB2BAllocationSchema.pre("validate", function (next) {
  const self = this as IManualB2BAllocation;
  self.totalRemaining = (self.allocations || []).reduce(
    (sum, a) => sum + Number(a.quantityRemaining || 0),
    0,
  );
  next();
});

export const ManualB2BAllocation =
  (mongoose.models.ManualB2BAllocation as mongoose.Model<IManualB2BAllocation> | undefined) ||
  model<IManualB2BAllocation>("ManualB2BAllocation", manualB2BAllocationSchema);
