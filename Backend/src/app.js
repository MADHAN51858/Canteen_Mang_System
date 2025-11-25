import express from "express"
import Razorpay from "razorpay"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from "dotenv";
dotenv.config();

const app = express()

app.use(cors({
    origin: "http://localhost:5173" || "http://localhost:5174" || process.env.CORS_ORIGIN , 
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

const razorpay =new Razorpay({
    key_id: process.env.RZP_KEY_ID,
    key_secret: process.env.RZP_KEY_SECRET,
})
app.post("/create-order", async (req, res) => {
  const { amount } = req.body;

  const options = {
    amount: amount * 100,//this will add 2 extra zeros to the amount as razorpay accepts amount in paisa
    currency: "INR",
    receipt: "receipt#" + Math.random(),
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    res.status(500).json(err);
  }
});
//routes import
import userRouter from "./routes/user.routes.js"
import foodRouter from "./routes/food.routes.js"
import order from "./routes/order.routes.js"

app.use("/users", userRouter)
app.use("/food", foodRouter)
app.use("/order", order)

export { app }