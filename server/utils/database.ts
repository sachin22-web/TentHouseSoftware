import mongoose from "mongoose";

const pick = (v?: string) => (typeof v === "string" ? v : "");
const RAW_MONGO_URI =
  pick(process.env.MONGO_URI) || pick(process.env.MONGODB_URI);
const MONGO_URI = RAW_MONGO_URI.trim().replace(/^['"]|['"]$/g, "");

export const connectDatabase = async (): Promise<void> => {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not set");
    }

    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error disconnecting from database:", error);
  }
};
