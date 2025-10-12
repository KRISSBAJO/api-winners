// src/config/db.ts
import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/dominion_connect";

    // ❌ Don't force credentials unless provided
    const options: mongoose.ConnectOptions = {};

    // ✅ Only apply auth if credentials exist
    if (process.env.MONGO_USER && process.env.MONGO_PASS) {
      options.authSource = "admin";
      options.user = process.env.MONGO_USER;
      options.pass = process.env.MONGO_PASS;
    }

    const conn = await mongoose.connect(uri, options);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};
