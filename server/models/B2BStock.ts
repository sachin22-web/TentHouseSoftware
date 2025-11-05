import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IB2BPurchaseLog {
  _id?: Types.ObjectId;
  quantity: number;
  price: number;
  supplierName: string;
  createdAt: Date;
}

export interface IB2BStock extends Document {
  itemName: string;
  normalizedItemName: string;
  supplierName: string;
  quantityAvailable: number;
  unitPrice: number;
  productId?: Types.ObjectId;
  purchaseLogs: IB2BPurchaseLog[];
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseLogSchema = new Schema<IB2BPurchaseLog>(
  {
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    supplierName: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true },
);

const b2bStockSchema = new Schema<IB2BStock>(
  {
    itemName: { type: String, required: true, trim: true },
    normalizedItemName: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    supplierName: { type: String, required: true, trim: true },
    quantityAvailable: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    purchaseLogs: { type: [purchaseLogSchema], default: [] },
    lastUsedAt: { type: Date },
  },
  { timestamps: true },
);

b2bStockSchema.pre("validate", function (next) {
  if (this.itemName) {
    this.normalizedItemName = this.itemName.trim().toLowerCase();
  }
  next();
});

export const B2BStock =
  (mongoose.models.B2BStock as mongoose.Model<IB2BStock> | undefined) ||
  mongoose.model<IB2BStock>("B2BStock", b2bStockSchema);
