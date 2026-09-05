import mongoose from "mongoose";

import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const rawUrl = process.env.MONGODB_URL || "";
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

    console.log(`MongoDB Connected: 
            ${connectionInstance.connection.host}`);
  } catch (error){
    console.log("MongoDb Connection Error", error.message);
    process.exit(1);
  }
};

export default connectDB;
