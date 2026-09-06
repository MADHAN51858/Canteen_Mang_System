import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    const rawUrl = process.env.MONGODB_URL || "";
    if (!rawUrl) {
      const msg = "MONGODB_URL is not defined in environment variables. Please configure it in Vercel Project Settings.";
      console.error(msg);
      throw new Error(msg);
    }

    let connectionString;
    if (rawUrl.includes("?")) {
      const [base, query] = rawUrl.split("?");
      const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
      connectionString = `${cleanBase}/${DB_NAME}?${query}`;
    } else {
      const cleanBase = rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
      connectionString = `${cleanBase}/${DB_NAME}`;
    }

    const connectionInstance = await mongoose.connect(connectionString);
    console.log(`MongoDB Connected: ${connectionInstance.connection.host}`);
    return connectionInstance;
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
};

export default connectDB;
