import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Food } from "../models/food.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { createOrder } from "./order.controller.js";
import { Order } from "../models/order.model.js";

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, rollNo, role, phoneNo } = req.body;

  if (
    [username, email, password, rollNo, role, phoneNo].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(409, "All fields are required");
  }

  if (
    [email, username, password, rollNo, role, phoneNo].some(
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

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something wentr wrong while registering the user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});

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

const login = asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;

  if (!password) {
    throw new ApiError(409, "Password is Required");
  }
  if (!(username || email)) {
    throw new ApiError(409, "Username or Email is Required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(400, "user doesn't Exist");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "password is Invalid");
  }

  const { accessToken, refreshToken } = await generateAccesTokenandRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, {
        user: loggedInUser,
        roll: loggedInUser.roll,
        accessToken,
        refreshToken,
      }),
      "User LoggedIn Successfully"
    );
});

const logout = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, user, "User LoggedOut Succesfully"));
});

const addFriends = asyncHandler(async (req, res) => {
  // Support two payload shapes for compatibility:
  // 1) { userId, friendIds: [id, ...] }
  // 2) { username, friendName }
  const { userId, friendIds, username, friendName } = req.body;

  // If payload uses userId/friendIds
  if (userId || friendIds) {
    if (!userId || !Array.isArray(friendIds) || friendIds.length === 0) {
      throw new ApiError(409, "Invalid user or friend Ids");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(409, "User not exist");
    }

    // ensure all friend ids exist
    const friends = await User.find({ _id: { $in: friendIds } });
    if (!friends || friends.length === 0) {
      throw new ApiError(409, "Friend(s) not found");
    }

    // prevent duplicates
    for (const fid of friendIds) {
      if (user.friends.map(String).includes(String(fid))) {
        throw new ApiError(409, `Friend with ID ${fid} already exists`);
      }
    }

    user.friends.push(...friendIds);
    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, user, `Added friends successfully`));
  }

  // Otherwise expect username + friendName
  if (!username || !friendName) {
    throw new ApiError(409, "Invalid user or friend Ids");
  }

  const user = await User.findOne({ username: username.toLowerCase() });
  const friend = await User.findOne({ username: friendName.toLowerCase() });

  if (!user) {
    throw new ApiError(409, "User not exist");
  }

  if (!friend) {
    throw new ApiError(409, "Friend not exist");
  }

  const friendId = friend._id;

  if (user.friends.map(String).includes(String(friendId))) {
    throw new ApiError(409, `Friend with ID ${friendId} already exists`);
  }

  user.friends.push(friendId);
  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        `Added the ${friendName} with ID ${friendId} successfully`
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
  const { username } = req.body;

  if (!username) {
    throw new ApiError(409, "Required Username");
  }

  // const user = await User.findone(userId).populate("friends") Or
  // const user = await User.findone({username}).populate("friends")

  // const user = await User.findById(userId)
  const user = await User.findOne({ username });

  //This logic is not correct ,instead use for of loop
  // await user.friends.forEach(friend => {
  //   console.log(User.findById(friend))
  // })

  const freinds = [];

  for (const friendId of user.friends) {
    const friend = await User.findById(friendId);

    if (friend) freinds.push(friend);
  }

  return res.status(200).json(
    // new ApiResponse(200, user, "Succesfully fetched friends"))   //only send un populated user which doesn't shows the friends details
    // new ApiResponse(200, user, "Succesfully fetched friends"))  //send populated user which shows friends details also
    new ApiResponse(200, freinds, "Succesfully fetched friends")
  ); //send only the friends details
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
  const { userOrder, userDetails } = req.body;

  if (!(userOrder && userDetails)) {
    throw new ApiError(400, "Feilds cannot be empty");
  }

  const user = await User.findOne({
    $or: [
      { username: userDetails.toLowerCase() },
      { rollNo: userDetails.toLowerCase() },
    ],
  });

  if (!user) {
    throw new ApiError(400, "User Not found");
  }

  const orderNumber = `ORD-${Date.now()}`;

  let allItems = [];
  for (let items of userOrder) {
    const item = await Food.findOne({ itemname: items.toLowerCase() });
    if (item) {
      allItems.push(item);
    }
  }

  user.orders.push({
    orderNumber,
    items: allItems.map((i) => i._id),
  });

  const response = await createOrder(res, userDetails, orderNumber, allItems);

  if (response) {
    await user.save();
  }
  // return res
  //   .status(200)
  //   .json(new ApiResponse(200, user.username, "Successfully Added user orders"));
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
  const { userDetails, orderNumber ,cancelBy } = req.body;

  if (!orderNumber) {
    throw new ApiError(400, "orderNumber is required");
  }

  if (!userDetails) {
    throw new ApiError(400, "UserDetails is required");
  }
  if (!cancelBy) {
    throw new ApiError(400, "CancelBy is required");
  }


  const user = await User.findOne({ username: userDetails });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  // const orderNumberNormalized = orderNumber.toLowerCase();
  const order = await Order.findOne({ orderNumber: orderNumber });
  if (!order) {
    throw new ApiError(400, "Order not found");
  }

  user.orders = user.orders.filter(
    (order) => order.orderNumber !== orderNumber
  );

  user.cancelledorders.push({orderNumber : String(orderNumber), cancelledby : String (cancelBy) });

  await user.save();

  await Order.deleteOne({ _id: order._id });

  return res
    .status(200)
    .json(new ApiResponse(200, user.orders, "Canceled items Successfully"));
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
};
