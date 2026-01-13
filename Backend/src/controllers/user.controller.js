import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Food } from "../models/food.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { createOrder } from "./order.controller.js";
import { Order } from "../models/order.model.js";
import { deleteFromCloudinaryByUrl } from "../utils/cloudinary.js";

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

  if (
    [username, email, password, rollNo, phoneNo].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(409, "All fields are required");
  }

  if (
    [email, username, password, rollNo, phoneNo].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(409, "All feilds are Required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exist");
  }
  
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    password,
    rollNo,
    role,
    phoneNo,
  });

  const { accessToken, refreshToken } = await generateAccesTokenandRefreshToken(
    user._id
  );

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -accessToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user");
  }

  const cookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});


const login = asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;
  const normalizedUsername = typeof username === "string" ? username.toLowerCase().trim() : undefined;
  const normalizedEmail = typeof email === "string" ? email.toLowerCase().trim() : undefined;

  if (!password) {
    throw new ApiError(409, "Password is Required");
  }
  if (!(username || email)) {
    throw new ApiError(409, "Username or Email is Required");
  }

  const user = await User.findOne({
    $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
  });

  if (!user) {
    throw new ApiError(400, "user doesn't Exist");
  }

  if (user.blocked) {
    throw new ApiError(403, "This account has been blocked by admin");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "password is Invalid");
  }

  const { accessToken, refreshToken } = await generateAccesTokenandRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -accessToken"
  );

  const cookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(
      new ApiResponse(200, {
        user: loggedInUser,
        role: loggedInUser.role,
      }),
      "User LoggedIn Successfully"
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
  const { userId } = req.body;

  if (!userId) {
    throw new ApiError(409, "User ID is required");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.blocked = !user.blocked;
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

  if (username == null || email == null || phoneNo == null || rollNo == null) {
    throw new ApiError(400, "All fields are required");
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

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        username: cleanStr(username).toLowerCase(),
        email: cleanStr(email).toLowerCase(),
        phoneNo: toNumber(phoneNo),
        rollNo: cleanStr(rollNo).toLowerCase(),
      },
    },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, { user }, "Profile updated successfully")
  );
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
};
