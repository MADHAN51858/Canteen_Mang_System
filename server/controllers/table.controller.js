import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Table } from "../models/table.model.js";
import { User } from "../models/user.model.js";
import { Food } from "../models/food.model.js";
import { createOrder } from "./order.controller.js";

// Helper: Safely build table query by tableId without throwing CastError on _id
function findActiveTableQuery(tableId) {
  const tId = String(tableId || "").trim();
  const or = [
    { tableId: tId.toUpperCase() },
    { tableId: tId },
    { creatorRollNo: tId },
  ];
  if (mongoose.Types.ObjectId.isValid(tId)) {
    or.push({ _id: new mongoose.Types.ObjectId(tId) });
  }
  return { status: "active", $or: or };
}

// Helper to generate unique table code (e.g. TBL-402)
function generateTableId() {
  const num = Math.floor(100 + Math.random() * 900);
  return `TBL-${num}`;
}

// 1. Create a New Dining Table Session (Created automatically with user's Roll Number)
const createTable = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Use user's roll number (fallback to username if rollNo is missing)
  const userRoll = (user.rollNo ? String(user.rollNo) : user.username).trim();
  const tableId = userRoll.toUpperCase();
  const tableName = user.rollNo ? `Roll ${user.rollNo.toUpperCase()}` : `${user.username}'s Table`;

  // Leave any other active tables as a member
  await Table.updateMany(
    { status: "active", "members.username": user.username },
    { $pull: { members: { username: user.username } } }
  );

  // Check if a table document for this creator or tableId already exists
  let table = await Table.findOne({
    $or: [{ creator: user.username }, { tableId }, { creatorRollNo: userRoll }],
  });

  const memberData = {
    userId: user._id,
    username: user.username,
    name: user.name || user.username,
    avatar: user.avatar || "",
    isReady: false,
  };

  if (table) {
    table.tableId = tableId;
    table.tableName = tableName;
    table.creator = user.username;
    table.creatorRollNo = user.rollNo || userRoll;
    table.creatorName = user.name || user.username;
    table.creatorAvatar = user.avatar || "";
    table.members = [memberData];
    table.items = [];
    table.status = "active";
    table.orderType = "Order Now";
    table.orderNumber = "";
    table.receiptImageUrl = "";
    await table.save();
  } else {
    table = await Table.create({
      tableId,
      tableName,
      creator: user.username,
      creatorRollNo: user.rollNo || userRoll,
      creatorName: user.name || user.username,
      creatorAvatar: user.avatar || "",
      members: [memberData],
      items: [],
      status: "active",
      orderType: "Order Now",
    });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, table, `Table created with Roll Number ${tableId}`));
});

// 2. Join an Existing Table by Roll Number, Table ID, or Table Name
const joinTable = asyncHandler(async (req, res) => {
  const { tableIdOrName } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!tableIdOrName || !String(tableIdOrName).trim()) {
    throw new ApiError(400, "Roll Number or Table ID is required to join");
  }

  const queryStr = String(tableIdOrName).trim();

  // Find most recent table by roll number (tableId or creatorRollNo), tableName, or creator
  const table = await Table.findOne({
    $or: [
      { tableId: { $regex: new RegExp(`^${queryStr}$`, "i") } },
      { creatorRollNo: { $regex: new RegExp(`^${queryStr}$`, "i") } },
      { tableName: { $regex: new RegExp(`^${queryStr}$`, "i") } },
      { creator: { $regex: new RegExp(`^${queryStr}$`, "i") } },
    ],
  }).sort({ createdAt: -1 });

  if (!table) {
    throw new ApiError(404, `No table found for Roll Number "${queryStr}". Please verify the Roll Number.`);
  }

  // Check whether table is active or inactive
  if (table.status !== "active") {
    throw new ApiError(400, `Table for Roll Number "${queryStr}" is inactive or has already ended.`);
  }

  // Check if user is already in this table
  const currentUsernameLower = String(user.username || "").toLowerCase();
  const alreadyMember = table.members.some(
    (m) =>
      (m.userId && String(m.userId) === String(user._id)) ||
      (m.username && String(m.username).toLowerCase() === currentUsernameLower)
  );

  if (!alreadyMember) {
    // Leave any other active tables first
    await Table.updateMany(
      { _id: { $ne: table._id }, status: "active" },
      { $pull: { members: { $or: [{ username: currentUsernameLower }, { userId: user._id }] } } }
    );

    table.members.push({
      userId: user._id,
      username: currentUsernameLower,
      name: user.name || user.username,
      avatar: user.avatar || "",
      isReady: false,
    });
    await table.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, table, `Joined ${table.tableName} successfully`));
});

// 3. Leave Current Table
const leaveTable = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const table = await Table.findOne({
    status: "active",
    "members.username": user.username,
  });

  if (!table) {
    return res.status(200).json(new ApiResponse(200, null, "Not in any active table"));
  }

  // Remove member
  table.members = table.members.filter((m) => m.username !== user.username);

  // If creator leaves and there are remaining members, transfer creator to next member
  if (table.creator === user.username) {
    if (table.members.length > 0) {
      table.creator = table.members[0].username;
      table.creatorName = table.members[0].name;
      table.creatorAvatar = table.members[0].avatar;
    } else {
      table.status = "closed";
    }
  }

  if (table.members.length === 0) {
    table.status = "closed";
  }

  await table.save();

  return res.status(200).json(new ApiResponse(200, null, "Left table successfully"));
});

// 4. Get Current Active Table for Authenticated User
const getMyTable = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const userRoll = String(user.rollNo || "").trim().toLowerCase();
  const userName = String(user.username || "").trim().toLowerCase();

  const table = await Table.findOne({
    status: "active",
    $or: [
      { "members.userId": user._id },
      { "members.username": userName },
      { creator: userName },
      ...(userRoll
        ? [
            { creatorRollNo: userRoll },
            { tableId: userRoll.toUpperCase() },
            { tableId: userRoll.toLowerCase() },
          ]
        : []),
    ],
  }).sort({ updatedAt: -1 });

  return res.status(200).json(new ApiResponse(200, table, "Fetched current table details"));
});

// 5. Get All Active Tables (Powers the bottom active tables row)
const getActiveTables = asyncHandler(async (req, res) => {
  const tables = await Table.find({ status: "active" })
    .sort({ updatedAt: -1 })
    .limit(10);

  return res.status(200).json(new ApiResponse(200, tables, "Active tables fetched successfully"));
});

// 6. Add Food Item to Table Shared Cart
const addItemToTable = asyncHandler(async (req, res) => {
  const { tableId, foodId } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const table = await Table.findOne(findActiveTableQuery(tableId));

  if (!table) {
    throw new ApiError(404, "Active table not found");
  }

  const food = await Food.findById(foodId);
  if (!food) {
    throw new ApiError(404, "Food item not found");
  }

  // Check if this user already added this food item
  const existingIndex = table.items.findIndex(
    (i) => String(i.foodId) === String(food._id) && i.addedBy?.username === user.username
  );

  const isVeg = !(
    food.itemname.toLowerCase().includes("chicken") ||
    food.itemname.toLowerCase().includes("meat") ||
    food.itemname.toLowerCase().includes("fish") ||
    food.itemname.toLowerCase().includes("non veg") ||
    food.itemname.toLowerCase().includes("egg")
  );

  if (existingIndex >= 0) {
    table.items[existingIndex].quantity += 1;
  } else {
    table.items.push({
      foodId: food._id,
      itemname: food.itemname,
      price: food.price,
      image: food.image || "",
      category: food.category || "",
      quantity: 1,
      isVeg,
      addedBy: {
        username: user.username,
        name: user.name || user.username,
        avatar: user.avatar || "",
      },
    });
  }

  await table.save();

  return res.status(200).json(new ApiResponse(200, table, `${food.itemname} added to table cart`));
});

// 7. Update Item Quantity in Table Shared Cart
const updateTableItemQty = asyncHandler(async (req, res) => {
  const { tableId, itemId, delta } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const table = await Table.findOne(findActiveTableQuery(tableId));

  if (!table) {
    throw new ApiError(404, "Active table not found");
  }

  const itemIndex = table.items.findIndex((i) => String(i._id) === String(itemId));
  if (itemIndex === -1) {
    throw new ApiError(404, "Item not found in table cart");
  }

  const newQty = table.items[itemIndex].quantity + Number(delta || 0);

  if (newQty <= 0) {
    table.items.splice(itemIndex, 1);
  } else {
    table.items[itemIndex].quantity = newQty;
  }

  await table.save();

  return res.status(200).json(new ApiResponse(200, table, "Item quantity updated"));
});

// 8. Remove Item from Table Shared Cart
const removeTableItem = asyncHandler(async (req, res) => {
  const { tableId, itemId } = req.body;

  const table = await Table.findOne(findActiveTableQuery(tableId));

  if (!table) {
    throw new ApiError(404, "Active table not found");
  }

  table.items = table.items.filter((i) => String(i._id) !== String(itemId));
  await table.save();

  return res.status(200).json(new ApiResponse(200, table, "Item removed from table cart"));
});

// 9. Member Toggles "Continue" / Ready State
const toggleMemberReady = asyncHandler(async (req, res) => {
  const { tableId, isReady } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const table = await Table.findOne(findActiveTableQuery(tableId));

  if (!table) {
    throw new ApiError(404, "Active table not found");
  }

  const member = table.members.find((m) => m.username === user.username);
  if (member) {
    member.isReady = typeof isReady === "boolean" ? isReady : !member.isReady;
    await table.save();
  }

  return res.status(200).json(new ApiResponse(200, table, "Ready status updated"));
});

// 10. Table Creator Places the Final Order (Normal Order or Pre-Order)
const placeTableOrder = asyncHandler(async (req, res) => {
  const { tableId, isPre, paymentMethod } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const table = await Table.findOne(findActiveTableQuery(tableId));

  if (!table) {
    throw new ApiError(404, "Active table not found");
  }

  // Only the creator can place the table order
  const userRoll = String(user.rollNo || "").trim().toLowerCase();
  const creatorUser = String(table.creator || "").trim().toLowerCase();
  const creatorRoll = String(table.creatorRollNo || "").trim().toLowerCase();
  const tblId = String(table.tableId || "").trim().toLowerCase();
  const username = String(user.username || "").trim().toLowerCase();

  const isCreator =
    (username && creatorUser && creatorUser === username) ||
    (userRoll && creatorRoll && creatorRoll === userRoll) ||
    (userRoll && tblId && tblId === userRoll);

  if (!isCreator) {
    throw new ApiError(403, `Only the table creator (${table.creatorName || table.creator}) can place the order.`);
  }

  if (!table.items || table.items.length === 0) {
    throw new ApiError(400, "Table cart is empty. Please add items before placing order.");
  }

  // Ensure all joined members have clicked Continue (marked isReady)
  const joinedMembers = (table.members || []).filter((m) => {
    const mUser = String(m.username || "").trim().toLowerCase();
    return mUser !== creatorUser && (!creatorRoll || mUser !== creatorRoll);
  });
  const unreadyMembers = joinedMembers.filter((m) => !m.isReady);
  if (unreadyMembers.length > 0) {
    const unreadyNames = unreadyMembers.map((m) => m.name || m.username).join(", ");
    throw new ApiError(
      400,
      `Cannot place order yet: waiting for ${unreadyNames} to click Continue (${joinedMembers.length - unreadyMembers.length}/${joinedMembers.length} ready).`
    );
  }

  // Aggregate items and check stock
  const counts = {};
  for (const it of table.items) {
    counts[it.itemname] = (counts[it.itemname] || 0) + (it.quantity || 1);
  }

  const foodNames = Object.keys(counts);
  const foods = await Food.find({ itemname: { $in: foodNames } });

  // Validate stock
  for (const f of foods) {
    const need = counts[f.itemname] || 0;
    if (typeof f.stock !== "number" || f.stock < need) {
      throw new ApiError(400, `Insufficient stock for ${f.itemname}. Available: ${f.stock ?? 0}, requested: ${need}`);
    }
  }

  // Decrement stock atomically
  await Promise.all(
    foods.map((f) => {
      const need = counts[f.itemname] || 0;
      const newStock = (f.stock || 0) - need;
      return Food.updateOne(
        { _id: f._id, stock: { $gte: need } },
        { $inc: { stock: -need }, $set: { inStock: newStock > 0 } }
      );
    })
  );

  // Build expanded item list
  const allItemIds = [];
  const expandedItems = [];
  for (const f of foods) {
    const need = counts[f.itemname] || 0;
    for (let i = 0; i < need; i++) {
      allItemIds.push(f._id);
      expandedItems.push(f);
    }
  }

  // Unique orderNumber for creator's receipt
  const orderNumber = "ord-" + Math.random().toString(36).substr(2, 9);
  user.orders.push({ orderNumber, items: allItemIds });

  // Deduct wallet balance if paying with wallet
  const totalBill = expandedItems.reduce((sum, item) => sum + (item.price || 0), 0);
  if (paymentMethod === "wallet") {
    if ((user.walletBalance || 0) < totalBill) {
      throw new ApiError(400, `Insufficient wallet balance. Total: ₹${totalBill}, Balance: ₹${user.walletBalance || 0}`);
    }
    user.walletBalance -= totalBill;
  }

  await user.save();

  // Mark table as ordered
  table.status = "ordered";
  table.orderNumber = orderNumber;
  table.orderType = isPre ? "Pre-Order" : "Ordered Now";
  table.paymentMethod = paymentMethod || "wallet";
  await table.save();

  // Create single receipt on table creator's name
  await createOrder(res, user.username, orderNumber, expandedItems, Boolean(isPre));
});

// 11. Update Order Type (Order Now vs Pre-Order) for Table
const updateTableOrderType = asyncHandler(async (req, res) => {
  const { tableId, orderType } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const table = await Table.findOne(findActiveTableQuery(tableId));
  if (!table) {
    throw new ApiError(404, "Active table not found");
  }

  const userRoll = String(user.rollNo || "").trim().toLowerCase();
  const creatorUser = String(table.creator || "").trim().toLowerCase();
  const creatorRoll = String(table.creatorRollNo || "").trim().toLowerCase();
  const tblId = String(table.tableId || "").trim().toLowerCase();
  const username = String(user.username || "").trim().toLowerCase();

  const isCreator =
    (username && creatorUser && creatorUser === username) ||
    (userRoll && creatorRoll && creatorRoll === userRoll) ||
    (userRoll && tblId && tblId === userRoll);

  if (!isCreator) {
    throw new ApiError(403, "Only the table creator can change the order type");
  }

  table.orderType = orderType === "pre" || orderType === "Pre-Order" ? "Pre-Order" : "Order Now";
  await table.save();

  return res.status(200).json(new ApiResponse(200, table, "Order type updated successfully"));
});

export {
  createTable,
  joinTable,
  leaveTable,
  getMyTable,
  getActiveTables,
  addItemToTable,
  updateTableItemQty,
  removeTableItem,
  toggleMemberReady,
  placeTableOrder,
  updateTableOrderType,
};
