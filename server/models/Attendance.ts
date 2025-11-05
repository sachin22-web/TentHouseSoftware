import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IAttendance extends Document {
  workerId: Types.ObjectId;
  date: Date;
  shift: "full" | "half" | "absent";
  eventId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    workerId: {
      type: Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    shift: {
      type: String,
      enum: ["full", "half", "absent"],
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
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

// Compound index to ensure one attendance record per worker per date
attendanceSchema.index({ workerId: 1, date: 1 }, { unique: true });
// Index for event-based queries
attendanceSchema.index({ eventId: 1, date: 1 });
// Index for date range queries
attendanceSchema.index({ date: 1 });

export const Attendance =
  (mongoose.models.Attendance as any) ||
  model<IAttendance>("Attendance", attendanceSchema);
