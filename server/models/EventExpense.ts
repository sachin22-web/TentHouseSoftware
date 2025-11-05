import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IEventExpense extends Document {
  eventId: Types.ObjectId;
  category: "travel" | "food" | "material" | "misc";
  amount: number;
  notes?: string;
  date: Date;
  billImage?: string;
  createdAt: Date;
}

const eventExpenseSchema = new Schema<IEventExpense>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    category: {
      type: String,
      enum: ["travel", "food", "material", "misc"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    billImage: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const EventExpense =
  (mongoose.models.EventExpense as any) ||
  model<IEventExpense>("EventExpense", eventExpenseSchema);
