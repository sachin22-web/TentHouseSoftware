import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IIssueRegister extends Document {
  productId: Types.ObjectId;
  clientId: Types.ObjectId;
  qtyIssued: number;
  qtyReturned: number;
  issueDate: Date;
  returnDates: Date[];
}

const issueRegisterSchema = new Schema<IIssueRegister>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    qtyIssued: {
      type: Number,
      required: true,
      min: 0,
    },
    qtyReturned: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    returnDates: [
      {
        type: Date,
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const IssueRegister =
  (mongoose.models.IssueRegister as any) ||
  model<IIssueRegister>("IssueRegister", issueRegisterSchema);
