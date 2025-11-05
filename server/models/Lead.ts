import mongoose, { Schema, model, Document } from "mongoose";

export type LeadStatus =
  | "new"
  | "rejected"
  | "callback"
  | "hot"
  | "cold"
  | "converted"
  | "success"
  | "pending"
  | "reject";

export interface ICallLog {
  outcome: "answered" | "missed" | "voicemail" | "connected";
  duration?: number; // seconds
  note?: string;
  at: Date;
}

export interface ILead extends Document {
  name: string;
  phone: string;
  email?: string;
  source?: string;
  status: LeadStatus;
  priority?: "hot" | "cold";
  notes?: string;
  callLogs: ICallLog[];
}

const callLogSchema = new Schema<ICallLog>({
  outcome: {
    type: String,
    enum: ["answered", "missed", "voicemail", "connected"],
    required: true,
  },
  duration: { type: Number, min: 0 },
  note: { type: String, trim: true },
  at: { type: Date, required: true, default: Date.now },
});

const leadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true },
    email: { type: String, trim: true },
    source: { type: String, trim: true },
    status: {
      type: String,
      enum: [
        "new",
        "rejected",
        "callback",
        "hot",
        "cold",
        "converted",
        "success",
        "pending",
        "reject",
      ],
      required: true,
      default: "new",
    },
    priority: {
      type: String,
      enum: ["hot", "cold"],
      default: "cold",
    },
    notes: { type: String, trim: true },
    callLogs: { type: [callLogSchema], default: [] },
  },
  { timestamps: true },
);

leadSchema.index({ status: 1, updatedAt: -1 });

export const Lead =
  (mongoose.models.Lead as any) || model<ILead>("Lead", leadSchema);
