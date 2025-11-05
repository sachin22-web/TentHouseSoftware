import mongoose, { Schema, model, Document } from "mongoose";

export interface IClient extends Document {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  eventName?: string;
}

const toTitleCase = (input: string) =>
  input
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");

const clientSchema = new Schema<IClient>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      trim: true,
      sparse: true,
    },
    address: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
      sparse: true,
    },
    eventName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

clientSchema.pre("validate", function (next) {
  if (this.name) this.name = toTitleCase(this.name);
  next();
});

clientSchema.pre("findOneAndUpdate", function (next) {
  const update: any = this.getUpdate() || {};
  const set = update.$set || update;
  if (set && typeof set.name === "string") {
    set.name = toTitleCase(set.name);
    if (update.$set) update.$set = set;
    else this.setUpdate(set);
  }
  next();
});

export const Client =
  (mongoose.models.Client as any) || model<IClient>("Client", clientSchema);
