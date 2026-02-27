import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from "dotenv";
dotenv.config();


const app = express()

app.use(cors({
  origin: [
    // process.env.CORS_ORIGIN,
    "https://canteen-mang-system-1.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000"
  ].filter(Boolean),
  methods: ["GET", "POST", "PUT", "DELETE"],
   allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
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

app.use("/users", userRouter)
app.use("/food", foodRouter)
app.use("/order", order)

export { app }