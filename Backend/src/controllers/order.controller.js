import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import { Food } from "../models/food.model.js";

// Replaces previous Jimp implementation. Uses only canvas + JsBarcode.
import fs from "fs";
import os from "os";
import path from "path";
import { createCanvas, loadImage } from "canvas";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


/**
 * Qrcode:
 * - groups items and builds compact lines like "rice x3 — ₹300"
 * - generates barcode (CODE128) using jsbarcode + canvas
 * - composes final receipt on a canvas, writes temp PNG
 * - uploads temp PNG using uploadOnCloudinary(path)
 * - generates QR (data URI) pointing to uploaded image URL
 * - saves order.receiptImageurl and order.qrcode
 */
const Qrcode = async (res, order, items) => {
  try {

    // 1) Group items by id/name and compute qty and unit price
    const grouped = {}; // key -> { name, unitPrice, qty }
    // If items array contains separate entries for each unit, we aggregate them here.
    for (const it of items || []) {
      // Accept both Mongoose doc or plain object
      const id = String(it._id ?? it.id ?? it.name ?? Math.random());
      const name = String(it.itemname ?? it.name ?? "Item");
      const unitPrice = Number(it.price ?? 0);
      const qty = Number(it.qty ?? 1);

      if (!grouped[id]) grouped[id] = { name, unitPrice, qty: 0 };
      grouped[id].qty += qty;
    }

    // 2) Build text lines for receipt
    const lines = [];
    lines.push(`Order Number: ${order.orderNumber}`);
    lines.push(`Ordered By: ${order.orderedBy ?? "-"}`);
    lines.push("");
    lines.push("Items:");

    let computedTotal = 0;
    for (const key of Object.keys(grouped)) {
      const e = grouped[key];
      const lineTotal = e.unitPrice * e.qty;
      computedTotal += lineTotal;
      // Compact format: "rice x3 — ₹300"
      lines.push(`${e.name} x${e.qty} — ₹${lineTotal}`);
    }
    lines.push("");
    lines.push(`Total: ₹${computedTotal}`);

    // Optionally keep order.totalprice in sync (uncomment if desired)
    // order.totalprice = computedTotal;

    // 3) Generate barcode buffer using jsbarcode + canvas
    const barcodeWidth = 520;
    const barcodeHeight = 120;
    const barcodeCanvas = createCanvas(barcodeWidth, barcodeHeight);
    JsBarcode(barcodeCanvas, String(order.orderNumber), {
      format: "CODE128",
      displayValue: true,
      height: 60,
      margin: 8,
      fontSize: 16,
    });
    const barcodeBuffer = barcodeCanvas.toBuffer("image/png");

    // 4) Measure text layout and create final canvas
    const padding = 20;
    const contentWidth = 720; // final width in px
    const headerFontSize = 36;
    const bodyFontSize = 18;
    const lineHeight = Math.round(bodyFontSize * 1.6);

    // Prepare a temporary measure canvas to wrap text
    const measureCanvas = createCanvas(1, 1);
    const mctx = measureCanvas.getContext("2d");
    mctx.font = `${bodyFontSize}px Sans`;
    const maxTextWidth = contentWidth - padding * 2;

    const wrappedLines = [];
    for (const raw of lines) {
      const words = String(raw).split(" ");
      let cur = "";
      for (const w of words) {
        const trial = cur ? (cur + " " + w) : w;
        const wPx = mctx.measureText(trial).width;
        if (wPx > maxTextWidth && cur) {
          wrappedLines.push(cur);
          cur = w;
        } else {
          cur = trial;
        }
      }
      if (cur) wrappedLines.push(cur);
      // if line is empty, preserve an empty line (represented by empty string)
      if (raw === "") wrappedLines.push("");
    }

    const textBlockHeight = wrappedLines.length * lineHeight + 10;
    const finalHeight = padding + headerFontSize + 12 + textBlockHeight + 16 + barcodeHeight + padding;

    // final canvas
    const finalCanvas = createCanvas(contentWidth, finalHeight);
    const ctx = finalCanvas.getContext("2d");

    // 5) Draw white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, contentWidth, finalHeight);

    // 6) Draw header
    ctx.fillStyle = "#000000";
    ctx.font = `${headerFontSize}px Sans`;
    ctx.fillText("Canteen Receipt", padding, padding + headerFontSize);

    // 7) Draw wrapped text lines
    ctx.font = `${bodyFontSize}px Sans`;
    let y = padding + headerFontSize + 12;
    for (const l of wrappedLines) {
      ctx.fillText(l, padding, y + bodyFontSize);
      y += lineHeight;
    }

    // 8) Draw barcode (centered)
    const barcodeImg = await loadImage(barcodeBuffer);
    const barcodeX = Math.round((contentWidth - barcodeImg.width) / 2);
    const barcodeY = y + 12;
    ctx.drawImage(barcodeImg, barcodeX, barcodeY);

    // 9) Save canvas WITH barcode to temp file
    const tmpDir = os.tmpdir();
    await fs.promises.mkdir(tmpDir, { recursive: true }).catch(() => {});
    const tmpFileWithBarcode = path.join(tmpDir, `receipt_barcode_${String(order._id)}_${Date.now()}.png`);
    const outBufferWithBarcode = finalCanvas.toBuffer("image/png");
    await fs.promises.writeFile(tmpFileWithBarcode, outBufferWithBarcode);

    // 10) Create canvas WITHOUT barcode (same content, but stop before barcode)
    const finalHeightNoBarcode = padding + headerFontSize + 12 + textBlockHeight + padding;
    const finalCanvasNoBarcode = createCanvas(contentWidth, finalHeightNoBarcode);
    const ctxNoBarcode = finalCanvasNoBarcode.getContext("2d");
    
    // Draw white background
    ctxNoBarcode.fillStyle = "#ffffff";
    ctxNoBarcode.fillRect(0, 0, contentWidth, finalHeightNoBarcode);
    
    // Draw header
    ctxNoBarcode.fillStyle = "#000000";
    ctxNoBarcode.font = `${headerFontSize}px Sans`;
    ctxNoBarcode.fillText("Canteen Receipt", padding, padding + headerFontSize);
    
    // Draw wrapped text lines
    ctxNoBarcode.font = `${bodyFontSize}px Sans`;
    let yNoBarcode = padding + headerFontSize + 12;
    for (const l of wrappedLines) {
      ctxNoBarcode.fillText(l, padding, yNoBarcode + bodyFontSize);
      yNoBarcode += lineHeight;
    }
    
    // Save canvas WITHOUT barcode
    const tmpFileNoBarcode = path.join(tmpDir, `receipt_nobarcode_${String(order._id)}_${Date.now()}.png`);
    const outBufferNoBarcode = finalCanvasNoBarcode.toBuffer("image/png");
    await fs.promises.writeFile(tmpFileNoBarcode, outBufferNoBarcode);

    // 11) Upload both to Cloudinary
    const uploadResultWithBarcode = await uploadOnCloudinary(tmpFileWithBarcode);
    if (!uploadResultWithBarcode) throw new Error("uploadOnCloudinary (with barcode) returned null");
    
    const uploadResultNoBarcode = await uploadOnCloudinary(tmpFileNoBarcode);
    if (!uploadResultNoBarcode) throw new Error("uploadOnCloudinary (no barcode) returned null");

    // 12) Generate QR encoding the Cloudinary image URL (with barcode)
    const imageUrl = uploadResultWithBarcode.secure_url;
    const imageUrlNoBarcode = uploadResultNoBarcode.secure_url;
    const qrBuffer = await QRCode.toBuffer(imageUrl, { errorCorrectionLevel: "H", width: 360 });
    const qrDataUri = `data:image/png;base64,${qrBuffer.toString("base64")}`;

    // 13) Save to order and persist
    order.qrcode = qrDataUri;
    order.receiptImageUrl = imageUrl; // with barcode (for students)
    order.receiptImageUrlNoBarcode = imageUrlNoBarcode; // without barcode (for admins)
    await order.save();

    return true;
  } catch (err) {
    try { if (res && !res.headersSent) res.status(500).send("QR generation failed"); } catch (e) {}
    throw err;
  }
};

const createOrder = async (res, userDetails, orderNumber, allItems, pre) => {
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
    pre,
    qrcode: "",
    receiptImageUrl: "",
    receiptImageUrlNoBarcode: "",
    scanCount: 0,
  });

  if (!order) {
    throw new ApiError(400, "Failed to create order");
  }

  await Qrcode(res, order, foodItems);

  return res        
    .status(200)
    .json(new ApiResponse(200, order, "Succesfully created order"));
};

const getUserOrderList = asyncHandler(async (req, res) => {
  // Get current logged-in user
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Fetch orders for the current user
  const orders = await Order.find({ orderedBy: user.username })
    .populate("items", "itemname price image category")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, orders, "Successfully fetched user orders"));
});

const getOrderList = asyncHandler(async (req, res) => {
  const orders = await Order.find();

  if (!orders) {
    throw new ApiError(400, "No orders till now");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "Succesfull Fetched orders"));
});

const markPreparing = asyncHandler(async (req, res) => {
  const { orderNumber } = req.body;

  if (!orderNumber) {
    throw new ApiError(400, "orderNumber is required");
  }

  const admin = await User.findById(req.user._id);
  if (!admin) {
    throw new ApiError(404, "User not found");
  }
  if (admin.role !== "admin") {
    throw new ApiError(403, "Only admins can accept orders");
  }

  const normalized = String(orderNumber).trim().toLowerCase();
  const updated = await Order.findOneAndUpdate(
    { orderNumber: normalized },
    { status: "preparing" },
    { new: true }
  );

  if (!updated) {
    throw new ApiError(404, `Order ${orderNumber} not found`);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Order marked as preparing"));
});

const markCompleteByBarcode = asyncHandler(async (req, res) => {
  const { barcode } = req.body;

  console.log("markCompleteByBarcode called with barcode:", barcode);

  if (!barcode) {
    throw new ApiError(400, "Barcode is required");
  }

  // Get admin user
  const admin = await User.findById(req.user._id);
  if (!admin) {
    throw new ApiError(404, "User not found");
  }

  if (admin.role !== "admin") {
    throw new ApiError(403, "Only admins can mark orders as completed");
  }

  // Normalize barcode for case-insensitive matching
  const normalizedBarcode = String(barcode).trim().toLowerCase();
  console.log("Normalized barcode:", normalizedBarcode);

  try {
    // Atomically mark as completed if not already completed to avoid double credit
    const updatedOrder = await Order.findOneAndUpdate(
      { orderNumber: normalizedBarcode, status: { $ne: "completed" } },
      { status: "completed" },
      { new: true }
    );

    if (!updatedOrder) {
      // Either not found or already completed
      const existing = await Order.findOne({ orderNumber: normalizedBarcode });
      if (!existing) {
        throw new ApiError(404, `Order with barcode "${barcode}" not found`);
      }
      return res
        .status(200)
        .json(new ApiResponse(200, existing, "Order already completed"));
    }

    console.log("Updated order status to:", updatedOrder.status);

    // Credit wallet balance based on order total (only when just completed)
    const creditAmount = Number(updatedOrder.totalprice ?? updatedOrder.amount ?? 0);
    if (!Number.isNaN(creditAmount) && creditAmount > 0) {
      // Credit only admins as per requirement
      await User.updateMany(
        { role: "admin" },
        { $inc: { walletBalance: creditAmount } }
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedOrder, "Order marked as completed and wallet credited"));
  } catch (err) {
    console.error("Error in markCompleteByBarcode:", err);
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(500, `Failed to process barcode: ${err.message}`);
  }
});

// Returns daily order counts for the last N days (default 14)
const getDailyOrderStats = asyncHandler(async (req, res) => {
  const daysRaw = Number(req.body?.days ?? 14);
  const days = Number.isNaN(daysRaw) || daysRaw < 1 ? 14 : Math.min(daysRaw, 90);

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const stats = await Order.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const data = stats.map((s) => ({ date: s._id, count: s.count }));

  return res
    .status(200)
    .json(new ApiResponse(200, data, "Daily order stats fetched"));
});

// Returns daily order stats grouped by category and food item for last N days
const getCategoryFoodStats = asyncHandler(async (req, res) => {
  const daysRaw = Number(req.body?.days ?? 14);
  const days = Number.isNaN(daysRaw) || daysRaw < 1 ? 14 : Math.min(daysRaw, 90);

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  // Aggregate orders with food details
  const stats = await Order.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "foods",
        localField: "items",
        foreignField: "_id",
        as: "foodDetails",
      },
    },
    { $unwind: "$foodDetails" },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          category: "$foodDetails.category",
          foodName: "$foodDetails.itemname",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1, "_id.category": 1, "_id.foodName": 1 } },
  ]);

  // Organize data by category and date for easier frontend processing
  const organized = {};
  stats.forEach((s) => {
    const cat = s._id.category || "Other";
    const date = s._id.date;
    const food = s._id.foodName;

    if (!organized[cat]) organized[cat] = {};
    if (!organized[cat][food]) organized[cat][food] = [];
    organized[cat][food].push({ date, count: s.count });
  });

  return res
    .status(200)
    .json(new ApiResponse(200, organized, "Category food stats fetched"));
});

// Returns daily order counts grouped by category for comparison (all categories in one view)
const getCategoryCrossStats = asyncHandler(async (req, res) => {
  const daysRaw = Number(req.body?.days ?? 14);
  const days = Number.isNaN(daysRaw) || daysRaw < 1 ? 14 : Math.min(daysRaw, 90);

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  // Aggregate by date and category
  const stats = await Order.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "foods",
        localField: "items",
        foreignField: "_id",
        as: "foodDetails",
      },
    },
    { $unwind: "$foodDetails" },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          category: "$foodDetails.category",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1, "_id.category": 1 } },
  ]);

  // Organize by date with categories as keys
  const organized = {};
  stats.forEach((s) => {
    const date = s._id.date;
    const cat = s._id.category || "Other";
    if (!organized[date]) organized[date] = {};
    organized[date][cat] = s.count;
  });

  return res
    .status(200)
    .json(new ApiResponse(200, organized, "Category cross stats fetched"));
});

// Returns daily revenue stats grouped by category and food item for last N days
const getCategoryRevenueStats = asyncHandler(async (req, res) => {
  const daysRaw = Number(req.body?.days ?? 14);
  const days = Number.isNaN(daysRaw) || daysRaw < 1 ? 14 : Math.min(daysRaw, 90);

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  // Aggregate revenue by date and category
  const stats = await Order.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "foods",
        localField: "items",
        foreignField: "_id",
        as: "foodDetails",
      },
    },
    { $unwind: "$foodDetails" },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          category: "$foodDetails.category",
        },
        revenue: { $sum: "$foodDetails.price" },
      },
    },
    { $sort: { "_id.date": 1, "_id.category": 1 } },
  ]);

  // Organize by date with categories as keys
  const organized = {};
  stats.forEach((s) => {
    const date = s._id.date;
    const cat = s._id.category || "Other";
    if (!organized[date]) organized[date] = {};
    organized[date][cat] = s.revenue;
  });

  return res
    .status(200)
    .json(new ApiResponse(200, organized, "Category revenue stats fetched"));
});

// Returns food-level revenue stats by category
const getCategoryFoodRevenueStats = asyncHandler(async (req, res) => {
  const daysRaw = Number(req.body?.days ?? 14);
  const days = Number.isNaN(daysRaw) || daysRaw < 1 ? 14 : Math.min(daysRaw, 90);

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const stats = await Order.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "foods",
        localField: "items",
        foreignField: "_id",
        as: "foodDetails",
      },
    },
    { $unwind: "$foodDetails" },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          category: "$foodDetails.category",
          foodName: "$foodDetails.itemname",
        },
        revenue: { $sum: "$foodDetails.price" },
      },
    },
    { $sort: { "_id.date": 1, "_id.category": 1, "_id.foodName": 1 } },
  ]);

  const organized = {};
  stats.forEach((s) => {
    const cat = s._id.category || "Other";
    const date = s._id.date;
    const food = s._id.foodName;

    if (!organized[cat]) organized[cat] = {};
    if (!organized[cat][food]) organized[cat][food] = [];
    organized[cat][food].push({ date, revenue: s.revenue });
  });

  return res
    .status(200)
    .json(new ApiResponse(200, organized, "Category food revenue stats fetched"));
});

export { createOrder, getOrderList, getUserOrderList, markCompleteByBarcode, markPreparing, getDailyOrderStats, getCategoryFoodStats, getCategoryCrossStats, getCategoryRevenueStats, getCategoryFoodRevenueStats };
