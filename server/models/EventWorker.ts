import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IEventWorker extends Document {
  eventId: Types.ObjectId;
  name: string;
  role: string;
  phone?: string;
  payRate: number;
  agreedAmount?: number;
  totalPaid: number;
  remainingAmount: number;
  createdAt: Date;
}

const eventWorkerSchema = new Schema<IEventWorker>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    payRate: {
      type: Number,
      required: true,
      min: 0,
    },
    agreedAmount: {
      type: Number,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Pre-save middleware to calculate remaining amount
eventWorkerSchema.pre("save", function (next) {
  const baseAmount = this.agreedAmount || this.payRate;
  this.remainingAmount = Math.max(0, baseAmount - this.totalPaid);
  next();
});

export const EventWorker =
  (mongoose.models.EventWorker as any) ||
  model<IEventWorker>("EventWorker", eventWorkerSchema);
