import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import { Food } from "../models/food.model.js";

const createOrder = async (res, userDetails, orderNumber, allItems) => {
  if (!userDetails) {
    throw new ApiError(400, "User is required");
  }

  if (!orderNumber) {
    throw new ApiError(400, "Ordernumber is required");
  }

  const user = await User.findOne({ username: userDetails.toLowerCase() });
  if (!user) {
    throw new ApiError(400, "User is required");
  }
  const orderedItems = allItems.map((i) => i._id);

  let foodItems = [];
  for (let item of allItems) {
    const food = await Food.findById(item._id);
    if (food) {
      foodItems.push(food);
    }
  }

  const total = foodItems.reduce((sum, f) => sum + (f.price || 0), 0);

  const order = await Order.create({
    orderedBy: user.username,
    orderNumber,
    items: orderedItems,
    amount: total,
    status: "pending",
    razorpayOrderId: "razorpay_order_id_placeholder",
    razorpayPaymentId: "sdfgdgd",
    totalprice: total,
    paymentStatus: "pending",
  });

  if (!order) {
    throw new ApiError(400, "Failed to create order");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Succesfully created order"));
};

const getUserOrderList = asyncHandler(async (req, res) => {

  const { userDetails } = req.body;

  if (!userDetails) {
    throw new ApiError(400, "User is required");
  }

  const user = await User.findOne({ username: userDetails.toLowerCase() });

  if (!user) {
    throw new ApiError(400, "User is required");
  }

  const orders = await Order.find({ orderedBy: user.username });

  return res.status(200).json(new ApiResponse(200, orders, "Succesfull"));
});



const getOrderList = asyncHandler(async ( req,res) => {
  const orders = await Order.find();

  if (!orders) {
    throw new ApiError(400, "No orders till now");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "Succesfull Fetched orders"));
});

export { createOrder, getOrderList , getUserOrderList};