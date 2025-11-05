import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

async function connect() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    const pick = (v) => (typeof v === "string" ? v : "");
    const raw = pick(process.env.MONGO_URI) || pick(process.env.MONGODB_URI);
    const uri = raw.trim().replace(/^['"]|['"]$/g, "");
    const hasUri = uri.length > 0;
    console.log("URI:", hasUri ? "SET" : "NOT SET");

    if (!hasUri) {
      console.warn("⚠️  Skipping MongoDB connection: MONGO_URI is not set");
      return;
    }

    await mongoose.connect(uri, {
      dbName: "mannat",
      serverSelectionTimeoutMS: 8000,
    });
    console.log("✅ MongoDB OK");
  } catch (e) {
    console.error("❌ MongoDB FAIL:", e.name, e.code, e.message);
    console.warn("⚠️  Server will continue without database connection");
  }
}

export default connect;
