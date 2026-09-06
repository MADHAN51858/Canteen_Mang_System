import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from "dotenv";
dotenv.config();


const app = express()

app.use(cors({
  origin: [
    process.env.CORS_ORIGIN,
   "http://localhost:5173",
    "https://canteen-mang-system.vercel.app",
    "http://localhost:3000"
  ].filter(Boolean),
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

// Dummy payment endpoint for cart
app.post("/create-order", async (req, res) => {
  const { amount } = req.body;
  // Return dummy order data
  const order = {
    id: "order_" + Math.random().toString(36).substr(2, 9),
    amount: amount * 100,
    currency: "INR",
    receipt: "receipt#" + Math.random(),
  };
  res.json(order);
});

//routes import
import userRouter from "./routes/user.routes.js"
import foodRouter from "./routes/food.routes.js"
import order from "./routes/order.routes.js"
import tableRouter from "./routes/table.routes.js"
import categoryRouter from "./routes/category.routes.js"

app.use("/users", userRouter)
app.use("/food", foodRouter)
app.use("/order", order)
app.use("/table", tableRouter)
app.use("/category", categoryRouter)

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

// Serve frontend dist build if present
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Fallback for client-side routing (Express 5 compatible)
app.use((req, res, next) => {
  if (
    req.path.startsWith("/users") ||
    req.path.startsWith("/food") ||
    req.path.startsWith("/order") ||
    req.path.startsWith("/table") ||
    req.path.startsWith("/create-order")
  ) {
    return next();
  }
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath); 
  }
  next();
});

// Global error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    statusCode,
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
  });
});

export { app }