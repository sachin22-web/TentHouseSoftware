import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IWorkerPayment extends Document {
  eventId: Types.ObjectId;
  workerId: Types.ObjectId;
  amount: number;
  paymentMode: "cash" | "bank_transfer" | "upi" | "cheque" | "online";
  paymentDate: Date;
  notes?: string;
  referenceNumber?: string;
  createdAt: Date;
}

const workerPaymentSchema = new Schema<IWorkerPayment>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    workerId: {
      type: Schema.Types.ObjectId,
      ref: "EventWorker",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMode: {
      type: String,
      enum: ["cash", "bank_transfer", "upi", "cheque", "online"],
      required: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const WorkerPayment =
  (mongoose.models.WorkerPayment as any) ||
  model<IWorkerPayment>("WorkerPayment", workerPaymentSchema);
