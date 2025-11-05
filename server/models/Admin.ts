import mongoose, { Schema, model, Document } from "mongoose";

export interface IAdmin extends Document {
  name: string;
  phone: string;
  passwordHash: string;
  role: "admin";
}

const adminSchema = new Schema<IAdmin>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
    },
  },
  {
    timestamps: true,
  },
);

export const Admin =
  (mongoose.models.Admin as any) || model<IAdmin>("Admin", adminSchema);
