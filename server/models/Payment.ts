import mongoose, { Schema, model, Document, Types } from "mongoose";

export type PaymentMode = "cash" | "upi" | "card" | "bank" | "cheque";

export interface IPayment extends Document {
  invoiceId: Types.ObjectId;
  eventId?: Types.ObjectId;
  clientId?: Types.ObjectId;
  amount: number;
  mode: PaymentMode;
  ref?: string;
  date: Date;
  note?: string;
}

const paymentSchema = new Schema<IPayment>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    amount: { type: Number, required: true, min: 0 },
    mode: {
      type: String,
      enum: ["cash", "upi", "card", "bank", "cheque"],
      required: true,
    },
    ref: { type: String, trim: true },
    date: { type: Date, required: true, default: Date.now },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

paymentSchema.index({ invoiceId: 1, date: -1 });

export const Payment =
  (mongoose.models.Payment as any) || model<IPayment>("Payment", paymentSchema);
