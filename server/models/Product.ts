import mongoose, { Schema, model, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  sku?: string;
  category: string;
  unitType: string;
  buyPrice: number;
  sellPrice: number;
  stockQty: number;
  imageUrl?: string;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    unitType: {
      type: String,
      enum: [
        "pcs",
        "no",
        "nos",
        "unit",
        "units",
        "pair",
        "set",
        "meter",
        "sqft",
        "sqyd",
        "sqmt",
        "kg",
        "g",
        "litre",
        "ml",
        "box",
        "roll",
        "bundle",
      ],
      required: true,
    },
    buyPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    stockQty: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Product =
  (mongoose.models.Product as any) || model<IProduct>("Product", productSchema);
