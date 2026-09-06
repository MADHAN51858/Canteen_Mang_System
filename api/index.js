import dotenv from "dotenv";
dotenv.config();

import { app } from "../server/app.js";
import connectDB from "../server/db/index.js";

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error("Database connection error in serverless handler:", err);
  }
  return app(req, res);
}
