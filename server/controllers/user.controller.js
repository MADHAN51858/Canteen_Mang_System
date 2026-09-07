import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Food } from "../models/food.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { createOrder } from "./order.controller.js";
import { Order } from "../models/order.model.js";
import { Table } from "../models/table.model.js";
import { uploadOnCloudinary, deleteFromCloudinaryByUrl } from "../utils/cloudinary.js";
import { sendPasswordResetOtpEmail } from "../utils/mail.service.js";
import { sendPasswordResetOtpSms } from "../utils/sms.service.js";

const generateAccesTokenandRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);


    if (!user) {
      throw new ApiError(409, "User Does not Exist");
    }

    const accessToken = user.generateAccesToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong While Generating Refresh and access token"
    );
  }
};


const registerUser = asyncHandler(async (req, res) => {
  // Role is not accepted from client; default every new user to "student".
  const { username, email, password, rollNo, phoneNo } = req.body;
  const role = "student";

  const cleanUser = typeof username === "string" ? username.trim().toLowerCase() : "";
  const cleanRoll = typeof rollNo === "string" ? rollNo.trim().toLowerCase() : "";
  const cleanPass = typeof password === "string" ? password.trim() : "";
  const cleanEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : undefined;
  const cleanPhone = phoneNo && String(phoneNo).trim() !== "" ? Number(String(phoneNo).replace(/\D/g, "")) : undefined;

  if (!cleanUser || !cleanRoll || !cleanPass) {
    throw new ApiError(400, "Username, Roll No, and Password are required");
  }

  const orConditions = [{ username: cleanUser }, { rollNo: cleanRoll }];
  if (cleanEmail) {
    orConditions.push({ email: cleanEmail });
  }
  if (cleanPhone) {
    orConditions.push({ phoneNo: cleanPhone });
  }

  const existedUser = await User.findOne({ $or: orConditions });
  if (existedUser) {
    throw new ApiError(409, "User with this username, roll number, or contact already exists");
  }

  let avatarUrl = "";
  if (req.file) {
    const uploadResult = await uploadOnCloudinary(req.file.path);
    if (uploadResult && uploadResult.secure_url) {
      avatarUrl = uploadResult.secure_url;
      console.log(`[Register] Uploaded avatar to Cloudinary for ${cleanUser}: ${avatarUrl}`);
    }
  }

  const userData = {
    username: cleanUser,
    password: cleanPass,
    rollNo: cleanRoll,
    role,
    avatar: avatarUrl,
  };
  if (cleanEmail) userData.email = cleanEmail;
  if (cleanPhone) userData.phoneNo = cleanPhone;

  const user = await User.create(userData);

  const { accessToken, refreshToken } = await generateAccesTokenandRefreshToken(
    user._id
  );

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -accessToken"
  );

  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});


const escapeRegex = (string) => {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildUserSearchConditions = (rawInput) => {
  const clean = String(rawInput || "").trim().toLowerCase();
  if (!clean) return [];

  const escaped = escapeRegex(clean);
  const conditions = [
    { email: new RegExp(`^${escaped}$`, "i") },
    { rollNo: new RegExp(`^${escaped}$`, "i") },
    { username: new RegExp(`^${escaped}$`, "i") },
  ];

  // Also support matching padded/unpadded rollNo (e.g. 1db23cs1 <-> 1db23cs001)
  const rollMatch = clean.match(/^1db23cs(\d+)$/i);
  if (rollMatch) {
    const num = parseInt(rollMatch[1], 10);
    const padded = `1db23cs${String(num).padStart(3, "0")}`;
    const unpadded = `1db23cs${num}`;
    conditions.push({ rollNo: new RegExp(`^${padded}$`, "i") });
    conditions.push({ rollNo: new RegExp(`^${unpadded}$`, "i") });
    conditions.push({ username: new RegExp(`^${padded}$`, "i") });
    conditions.push({ username: new RegExp(`^${unpadded}$`, "i") });
  }

  return conditions;
};

const maskEmail = (email) => {
  if (!email || typeof email !== "string" || !email.includes("@")) return email || "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone) return "";
  const s = String(phone).replace(/\D/g, "");
  if (s.length <= 4) return s;
  const start = s.slice(0, 2);
  const end = s.slice(-2);
  const middle = "*".repeat(Math.max(2, s.length - 4));
  return `+91 ${start}${middle}${end}`;
};

const login = asyncHandler(async (req, res) => {
  const { username, password, email, rollNo } = req.body;
  const rawId = (rollNo || email || username || "").trim().toLowerCase();

  if (!password) {
    throw new ApiError(409, "Password is Required");
  }
  if (!rawId) {
    throw new ApiError(409, "Email or Roll Number is Required");
  }

  const orConditions = buildUserSearchConditions(rawId);
  const user = await User.findOne({ $or: orConditions });

  if (!user) {
    throw new ApiError(400, "User doesn't exist");
  }

  if (user.blocked || user.status === "block" || user.status === "blocked") {
    throw new ApiError(403, "This account has been blocked by admin");
  }

  let isPasswordCorrect = await user.isPasswordCorrect(password);

  // Allow password matching roll number exactly (both padded 1db23cs001 and unpadded 1db23cs1, case-insensitive)
  if (!isPasswordCorrect) {
    const cleanEntered = password.trim().toLowerCase();
    const uMatch = user.rollNo?.match(/^1db23cs(\d+)$/i) || user.username?.match(/^1db23cs(\d+)$/i);
    if (uMatch) {
      const num = parseInt(uMatch[1], 10);
      const rollPadded = `1db23cs${String(num).padStart(3, "0")}`;
      const rollUnpadded = `1db23cs${num}`;
      if (cleanEntered === rollPadded || cleanEntered === rollUnpadded) {
        isPasswordCorrect = true;
      }
    }
  }

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Password is Invalid");
  }

  const { accessToken, refreshToken } = await generateAccesTokenandRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -accessToken"
  );

  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          role: loggedInUser.role,
        },
        "User LoggedIn Successfully"
      )
    );
});

const logout = asyncHandler(async (req, res) => {
  // Remove refresh token from database
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User LoggedOut Successfully"));
});

const addFriends = asyncHandler(async (req, res) => {
  // Add friend to the current logged-in user
  const { friendName } = req.body;

  if (!friendName) {
    throw new ApiError(400, "Friend username is required");
  }

  // Get current user
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Find friend by username
  const friend = await User.findOne({ username: friendName.toLowerCase() });
  if (!friend) {
    throw new ApiError(404, "Friend not found");
  }

  // Check if trying to add yourself
  if (user._id.toString() === friend._id.toString()) {
    throw new ApiError(400, "You cannot add yourself as a friend");
  }

  // Check if already friends
  if (user.friends.map(String).includes(String(friend._id))) {
    throw new ApiError(409, `${friendName} is already your friend`);
  }

  // Add friend
  user.friends.push(friend._id);
  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { friend: { _id: friend._id, username: friend.username, email: friend.email } },
        `Added ${friendName} as friend successfully`
      )
    );
});

const removeFreinds = asyncHandler(async (req, res) => {
  const { userId, friendIds } = req.body;
  const user = await User.findById(userId);

  //   const freind = await User.findById(friendIds);
  const friend = await User.find({ _id: { $in: friendIds } });

  if (!user) {
    throw ApiError(409, "user not exist");
  }

  friendIds.forEach((friendId) => {
    if (!user.friends.includes(friendId)) {
      // throw ApiError(409, "friend already exists");  only usefull for non array
      throw new ApiError(409, `Friend with ID ${friendId} not exists`);
    }
  });

  friendIds.forEach((freind) => {
    user.friends = user.friends.filter((f) => f.toString() !== freind);
  });

  //For only one friend to delete
  //   user.friends = user.friends.filter((f) => f.toString() !== friendIds);
  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, `Deleted the friend with Id ${friendIds}`)
    );
});

const getFreiendsList = asyncHandler(async (req, res) => {
  // Get friends for the current logged-in user
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const freinds = [];

  for (const friendId of user.friends) {
    const friend = await User.findById(friendId).select("-password -refreshToken");

    if (friend) freinds.push(friend);
  }

  return res.status(200).json(
    new ApiResponse(200, freinds, "Succesfully fetched friends")
  );
});

const findUser = asyncHandler(async (req, res) => {
  const { username, email, phoneNo } = req.body;

  if (!(username || email || phoneNo)) {
    throw new ApiError(409, "Required username");
  }
  const user = await User.find({
    $or: [{ username }, { email }, { phoneNo }],
  }).select("-password");

  if (!user) {
    throw new ApiError(409, "User Doesn't Exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched succesfuly"));
});

const getAllUsers = asyncHandler(async (req, res) => {
  // Sync status field for legacy documents if not yet present
  await User.updateMany(
    { $or: [{ status: { $exists: false } }, { status: null }, { status: "" }, { status: "block" }] },
    [{ $set: { status: { $cond: { if: { $or: ["$blocked", { $eq: ["$status", "block"] }, { $eq: ["$status", "blocked"] }] }, then: "blocked", else: "unblock" } } } }]
  );

  const users = await User.find().select("-password");

  if (!users || users.length === 0) {
    throw new ApiError(404, "No users found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
});

const orderFood = asyncHandler(async (req, res) => {
  const { userOrder, pre } = req.body;

  if (!userOrder || !Array.isArray(userOrder) || userOrder.length === 0) {
    throw new ApiError(400, "Order items cannot be empty");
  }

  // Get current logged-in user
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const orderNumber = `ORD-${Date.now()}`;

  // Count requested quantities by itemname
  const counts = {};
  for (const n of userOrder) {
    const key = String(n || "").toLowerCase();
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  const names = Object.keys(counts);
  if (names.length === 0) throw new ApiError(400, "No valid items found in order");

  // Load foods and validate stock
  const foods = await Food.find({ itemname: { $in: names } });
  if (foods.length !== names.length) {
    const found = new Set(foods.map(f => f.itemname));
    const missing = names.filter(n => !found.has(n));
    throw new ApiError(400, `Items not found: ${missing.join(", ")}`);
  }

  for (const f of foods) {
    const need = counts[f.itemname] || 0;
    if (typeof f.stock !== "number" || f.stock < need) {
      throw new ApiError(400, `Insufficient stock for ${f.itemname}. Available: ${f.stock ?? 0}, requested: ${need}`);
    }
  }

  // Decrement stock atomically per item
  await Promise.all(
    foods.map(f => {
      const need = counts[f.itemname] || 0;
      const newStock = (f.stock || 0) - need;
      return Food.updateOne(
        { _id: f._id, stock: { $gte: need } },
        { $inc: { stock: -need }, $set: { inStock: newStock > 0 } }
      );
    })
  );

  // Build list of item ObjectIds repeated by requested qty
  const allItemIds = [];
  const expandedItems = [];
  for (const f of foods) {
    const need = counts[f.itemname] || 0;
    for (let i = 0; i < need; i++) {
      allItemIds.push(f._id);
      expandedItems.push(f);
    }
  }

  user.orders.push({ orderNumber, items: allItemIds });

  const response = await createOrder(res, user.username, orderNumber, expandedItems, pre);

  if (response) {
    await user.save();
  }
});

const getUserId = asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (!username) {
    throw new ApiError(409, "Required Username");
  }

  const user = await User.findOne({ username: username.toLowerCase() });

  return res
    .status(200)
    .json(new ApiResponse(200, user.username, "Succesfully fetched friends"));
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { orderNumber } = req.body;

  if (!orderNumber) {
    throw new ApiError(400, "orderNumber is required");
  }

  const requester = await User.findById(req.user._id);
  if (!requester) {
    throw new ApiError(404, "User not found");
  }

  const order = await Order.findOne({ orderNumber });
  if (!order) {
    throw new ApiError(400, "Order not found");
  }

  // Admins can cancel any order
  const isAdmin = requester.role === "admin";

  if (!isAdmin) {
    // Verify that the order belongs to this user
    if (order.orderedBy !== requester.username) {
      throw new ApiError(403, "You can only cancel your own orders");
    }

    requester.orders = requester.orders.filter(
      (o) => o.orderNumber !== orderNumber
    );

    requester.cancelledorders.push({ orderNumber: String(orderNumber), cancelledby: requester.username });
    requester.cancelledCount = (requester.cancelledCount || 0) + 1;

    await requester.save();
  } else {
    // Admin path: also update the owning user's records when possible
    const owner = await User.findOne({ username: order.orderedBy });
    if (owner) {
      owner.orders = owner.orders.filter((o) => o.orderNumber !== orderNumber);
      owner.cancelledorders.push({ orderNumber: String(orderNumber), cancelledby: requester.username });
      owner.cancelledCount = (owner.cancelledCount || 0) + 1;
      await owner.save();
    }
  }

  // Mark order as cancelled instead of deleting it
  order.status = "cancelled";

  // Clean up barcode receipt (Cloudinary) and clear QR code
  if (order.receiptImageUrl) {
    await deleteFromCloudinaryByUrl(order.receiptImageUrl);
    order.receiptImageUrl = "";
  }
  if (order.receiptImageUrlNoBarcode) {
    await deleteFromCloudinaryByUrl(order.receiptImageUrlNoBarcode);
    order.receiptImageUrlNoBarcode = "";
  }

  // Clear QR; if stored as Cloudinary URL, delete it
  const qrVal = order.qrcode;
  const isQrCloudinary = typeof qrVal === "string" && qrVal.startsWith("http") && qrVal.includes("res.cloudinary.com");
  if (isQrCloudinary) {
    await deleteFromCloudinaryByUrl(qrVal);
  }
  order.qrcode = "";

  await order.save();

  // Refund the full order amount to the user and deduct from admins' wallets
  const refundAmount = Number(order.totalprice ?? order.amount ?? 0);
  if (!Number.isNaN(refundAmount) && refundAmount > 0) {
    // Credit ordering user's wallet
    const owner = await User.findOne({ username: order.orderedBy });
    if (owner) {
      owner.walletBalance = Number(owner.walletBalance || 0) + refundAmount;
      await owner.save({ validateBeforeSave: false });
    }

    // Deduct evenly from all admins' wallets
    const admins = await User.find({ role: "admin" });
    if (admins && admins.length > 0) {
      const share = refundAmount / admins.length;
      await Promise.all(
        admins.map((admin) => {
          admin.walletBalance = Number(admin.walletBalance || 0) - share;
          return admin.save({ validateBeforeSave: false });
        })
      );
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Canceled items Successfully"));
});

const updateUserRole = asyncHandler(async (req, res) => {
  // Only admins can update user roles
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admins can update user roles");
  }

  const { userId, newRole } = req.body;

  if (!userId || !newRole) {
    throw new ApiError(400, "userId and newRole are required");
  }

  const allowed = ["student", "staff", "admin"];
  if (!allowed.includes(newRole)) {
    throw new ApiError(400, "Invalid role. Must be 'student', 'staff', or 'admin'");
  }

  const roleRank = { student: 0, staff: 1, admin: 2 };

  const user = await User.findById(userId).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const oldRole = user.role;
  if (oldRole === newRole) {
    return res
      .status(200)
      .json(new ApiResponse(200, user, "User already has this role"));
  }

  // Only capture previousRole on the very first promotion from student
  if (oldRole === "student" && user.previousRole === "student") {
    user.previousRole = oldRole;
  }

  user.role = newRole;
  await user.save({ validateBeforeSave: false });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User role updated successfully"));
});

const getMe = asyncHandler(async (req, res) => {
  // This endpoint is used by AuthContext to get the current user
  // req.user is set by the verifyJwt middleware
  const user = await User.findById(req.user._id).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Current user fetched successfully"));
});

const toggleBlockUser = asyncHandler(async (req, res) => {
  const { userId, status } = req.body;

  if (!userId) {
    throw new ApiError(409, "User ID is required");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Prevent blocking admin accounts
  if (user.role === "admin") {
    throw new ApiError(403, "Admin accounts cannot be blocked");
  }

  if (status && ["block", "blocked", "unblock"].includes(String(status).toLowerCase())) {
    user.status = String(status).toLowerCase() === "unblock" ? "unblock" : "blocked";
  } else {
    const isCurrentlyBlocked = user.status === "block" || user.status === "blocked" || user.blocked === true;
    user.status = isCurrentlyBlocked ? "unblock" : "blocked";
  }
  user.blocked = user.status === "blocked";

  if (user.blocked) {
    // Immediately invalidate active refresh token so session cannot be extended
    user.refreshToken = "";

    // Remove user from any active tables immediately
    try {
      await Table.updateMany(
        { status: "active", "members.username": user.username },
        { $pull: { members: { username: user.username } } }
      );
    } catch (tblErr) {
      console.error("Error removing blocked user from active tables:", tblErr);
    }
  }

  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findById(userId).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedUser,
        `User ${updatedUser.blocked ? "blocked" : "unblocked"} successfully`
      )
    );
});

const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    throw new ApiError(409, "User ID is required");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Prevent deletion of permanent admins (role admin with previousRole also admin)
  if (user.role === "admin" && user.previousRole === "admin") {
    throw new ApiError(403, "Cannot delete permanent admin user");
  }

  // 1. FIRST delete user avatar from Cloudinary if one exists
  if (user.avatar) {
    console.log(`[User Delete] First deleting avatar from Cloudinary for ${user.username}: ${user.avatar}`);
    await deleteFromCloudinaryByUrl(user.avatar);
  }

  // 2. Also clean up any receipt media from Cloudinary associated with user orders
  if (Array.isArray(user.orders) && user.orders.length > 0) {
    const orderNumbers = user.orders.map((o) => o.orderNumber).filter(Boolean);
    if (orderNumbers.length > 0) {
      const orders = await Order.find({ orderNumber: { $in: orderNumbers } });
      for (const ord of orders) {
        if (ord.receiptImageUrl) await deleteFromCloudinaryByUrl(ord.receiptImageUrl);
        if (ord.receiptImageUrlNoBarcode) await deleteFromCloudinaryByUrl(ord.receiptImageUrlNoBarcode);
      }
    }
  }

  // 3. THEN delete the user content from database
  await User.findByIdAndDelete(userId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, null, "User deleted successfully")
    );
});

const addMoneyToWallet = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    throw new ApiError(400, "Valid amount is required");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Add money to wallet
  user.walletBalance = (user.walletBalance || 0) + Number(amount);
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(200, {
      newBalance: user.walletBalance,
      addedAmount: amount,
    }, "Money added to wallet successfully")
  );
});

const deductFromWallet = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    throw new ApiError(400, "Valid amount is required");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check balance
  const currentBalance = user.walletBalance || 0;
  if (currentBalance < amount) {
    throw new ApiError(400, `Insufficient wallet balance. Available: ${currentBalance}, Required: ${amount}`);
  }

  // Deduct money from wallet
  user.walletBalance = currentBalance - Number(amount);
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(200, {
      newBalance: user.walletBalance,
      deductedAmount: amount,
    }, "Amount deducted from wallet successfully")
  );
});

const updateProfile = asyncHandler(async (req, res) => {
  const { username, email, phoneNo, rollNo } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized - User not found");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const cleanStr = (v) => (typeof v === "string" ? v.trim() : String(v ?? "").trim());
  const toNumber = (v) => {
    const digits = String(v ?? "").replace(/\D/g, "");
    if (digits.length !== 10) {
      throw new ApiError(400, "Phone number must be exactly 10 digits");
    }
    const num = Number(digits);
    if (Number.isNaN(num)) {
      throw new ApiError(400, "Invalid phone number");
    }
    return num;
  };

  const updateFields = {};

  if (username != null && cleanStr(username) !== "") {
    updateFields.username = cleanStr(username).toLowerCase();
  }
  if (email != null && cleanStr(email) !== "") {
    updateFields.email = cleanStr(email).toLowerCase();
  }
  if (phoneNo != null && String(phoneNo).trim() !== "") {
    updateFields.phoneNo = toNumber(phoneNo);
  }
  if (rollNo != null && cleanStr(rollNo) !== "") {
    updateFields.rollNo = cleanStr(rollNo).toLowerCase();
  }

  // Handle avatar upload and delete old avatar from Cloudinary
  const { avatar } = req.body || {};
  if (req.file) {
    if (user.avatar) {
      console.log(`[Avatar Update] Deleting previous avatar from Cloudinary for ${user.username}: ${user.avatar}`);
      await deleteFromCloudinaryByUrl(user.avatar);
    }

    const uploadResult = await uploadOnCloudinary(req.file.path);
    if (!uploadResult || !uploadResult.secure_url) {
      throw new ApiError(500, "Cloudinary upload failed: Invalid Cloudinary credentials in Backend/.env (check CLOUDINARY_API_SECRET)");
    }
    updateFields.avatar = uploadResult.secure_url;
  } else if (typeof avatar !== "undefined" && avatar !== user.avatar) {
    if (user.avatar) {
      console.log(`[Avatar URL Changed] Deleting old avatar from Cloudinary for ${user.username}: ${user.avatar}`);
      await deleteFromCloudinaryByUrl(user.avatar);
    }
    updateFields.avatar = avatar;
  }

  const oldUsername = user.username;
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select("-password -refreshToken -accessToken -resetPasswordOtp -resetPasswordExpiry");

  if (updateFields.username && updateFields.username !== oldUsername) {
    await Order.updateMany({ orderedBy: oldUsername }, { orderedBy: updateFields.username });
  }

  return res.status(200).json(
    new ApiResponse(200, { user: updatedUser }, "Profile updated successfully")
  );
});

const withdrawAmount = asyncHandler(async (req, res) => {
  const { userId, amount } = req.body;
  const targetId = userId || req.user?._id;

  if (!targetId || !amount) {
    throw new ApiError(400, "User ID and amount are required");
  }

  const amountNum = Number(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new ApiError(400, "Amount must be greater than 0");
  }

  const user = await User.findById(targetId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (Number(user.walletBalance || 0) < amountNum) {
    throw new ApiError(400, "Insufficient wallet balance");
  }

  // Deduct amount from wallet
  user.walletBalance = Math.max(0, (Number(user.walletBalance) || 0) - amountNum);
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      { user, withdrawnAmount: amountNum, newBalance: user.walletBalance },
      `Successfully withdrawn ₹${amountNum}`
    )
  );
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email, phoneNo } = req.body;
  const cleanEmail = email ? String(email).trim().toLowerCase() : "";
  const cleanPhone = phoneNo ? String(phoneNo).replace(/\D/g, "") : "";

  if (!cleanEmail && !cleanPhone) {
    throw new ApiError(400, "Please enter your registered email address or mobile number");
  }

  let user = null;
  let method = "email";

  if (cleanPhone) {
    method = "sms";
    const phoneNum = Number(cleanPhone);
    if (!phoneNum || cleanPhone.length < 7) {
      throw new ApiError(400, "Please enter a valid mobile number");
    }
    user = await User.findOne({ phoneNo: phoneNum });
    if (!user) {
      throw new ApiError(404, "No account found with this registered mobile number");
    }
  } else {
    method = "email";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new ApiError(400, "Please enter a valid email address");
    }
    user = await User.findOne({
      email: new RegExp(`^${escapeRegex(cleanEmail)}$`, "i"),
    });
    if (!user) {
      throw new ApiError(404, "No account found with this registered email address");
    }
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // 15 minutes validity
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  user.resetPasswordOtp = otp;
  user.resetPasswordExpiry = expiry;
  await user.save({ validateBeforeSave: false });

  if (method === "sms") {
    console.log(`[FORGOT PASSWORD - SMS] Generated OTP "${otp}" for user "${user.username}" (phone: ${user.phoneNo}), expires at ${expiry.toISOString()}`);
    try {
      await sendPasswordResetOtpSms(user.phoneNo, otp, user.username);
    } catch (smsErr) {
      console.error(`[SMS ERROR in forgotPassword]:`, smsErr.message || smsErr);
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          method: "sms",
          phoneNo: user.phoneNo,
          maskedTarget: maskPhone(user.phoneNo),
          username: user.username,
        },
        `Verification code sent via SMS to ${maskPhone(user.phoneNo)}`
      )
    );
  } else {
    console.log(`[FORGOT PASSWORD - EMAIL] Generated OTP "${otp}" for user "${user.username}" (email: ${user.email}), expires at ${expiry.toISOString()}`);
    try {
      await sendPasswordResetOtpEmail(user.email, otp, user.username);
    } catch (emailErr) {
      console.error(`[MAIL ERROR in forgotPassword]:`, emailErr.message || emailErr);
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          method: "email",
          email: user.email,
          maskedTarget: maskEmail(user.email),
          username: user.username,
        },
        `Verification code sent to registered email (${user.email})`
      )
    );
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, phoneNo, otp, newPassword } = req.body;
  const cleanEmail = email ? String(email).trim().toLowerCase() : "";
  const cleanPhone = phoneNo ? String(phoneNo).replace(/\D/g, "") : "";

  if ((!cleanEmail && !cleanPhone) || !otp || !newPassword) {
    throw new ApiError(400, "Email or phone number, verification code, and new password are required");
  }

  if (String(newPassword).length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters long");
  }

  let user = null;
  if (cleanPhone) {
    const phoneNum = Number(cleanPhone);
    user = await User.findOne({ phoneNo: phoneNum });
    if (!user) {
      throw new ApiError(404, "No account found with this registered mobile number");
    }
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new ApiError(400, "Please provide a valid email address");
    }
    user = await User.findOne({
      email: new RegExp(`^${escapeRegex(cleanEmail)}$`, "i"),
    });
    if (!user) {
      throw new ApiError(404, "No account found with this registered email address");
    }
  }

  console.log(`[RESET PASSWORD ATTEMPT] User: ${user.username} (target: "${cleanPhone || cleanEmail}"), DB OTP: ${user.resetPasswordOtp ? "SET" : "NOT SET"}, Expiry: ${user.resetPasswordExpiry}`);

  if (!user.resetPasswordOtp || !user.resetPasswordExpiry) {
    throw new ApiError(400, "No password reset requested or verification code expired. Please request a new code.");
  }

  if (new Date() > new Date(user.resetPasswordExpiry)) {
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(400, "Verification code has expired. Please click 'Resend code' to get a fresh code.");
  }

  const cleanDbOtp = String(user.resetPasswordOtp || "").trim();
  const cleanInputOtp = String(otp || "").trim();

  if (cleanDbOtp !== cleanInputOtp) {
    console.log(`[OTP MISMATCH] User: ${user.username}, Expected: "${cleanDbOtp}", Received: "${cleanInputOtp}"`);
    throw new ApiError(400, "Invalid verification code. Please check the code received and try again.");
  }

  // Update password (pre('save') hook hashes it with bcrypt)
  user.password = newPassword;
  user.resetPasswordOtp = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  console.log(`[RESET PASSWORD SUCCESS] Password successfully reset for user: ${user.username} (${user.email || user.phoneNo})`);

  // Automatically log in the user with newly reset credentials
  const { accessToken, refreshToken } = await generateAccesTokenandRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -accessToken -resetPasswordOtp -resetPasswordExpiry"
  );

  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          role: loggedInUser.role,
        },
        "Password reset successfully! Logging you in..."
      )
    );
});

const changePassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized - User not found");
  }

  if (!newPassword) {
    throw new ApiError(400, "New password is required");
  }

  if (String(newPassword).length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters long");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

export {
  registerUser,
  addFriends,
  removeFreinds,
  getFreiendsList,
  findUser,
  getAllUsers,
  getUserId,
  login,
  logout,
  orderFood,
  cancelOrder,
  getMe,
  updateUserRole,
  toggleBlockUser,
  deleteUser,
  addMoneyToWallet,
  deductFromWallet,
  updateProfile,
  withdrawAmount,
  forgotPassword,
  resetPassword,
  changePassword,
};

