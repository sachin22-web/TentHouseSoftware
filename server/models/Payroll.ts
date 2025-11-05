import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IPayroll extends Document {
  month: string; // YYYY-MM format
  workerId: Types.ObjectId;
  daysFull: number;
  daysHalf: number;
  advances?: number;
  totalPay: number;
  notes?: string;
}

const payrollSchema = new Schema<IPayroll>(
  {
    month: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },
    workerId: {
      type: Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    daysFull: {
      type: Number,
      required: true,
      min: 0,
    },
    daysHalf: {
      type: Number,
      required: true,
      min: 0,
    },
    advances: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalPay: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to ensure one payroll record per worker per month
payrollSchema.index({ workerId: 1, month: 1 }, { unique: true });

export const Payroll =
  (mongoose.models.Payroll as any) || model<IPayroll>("Payroll", payrollSchema);
