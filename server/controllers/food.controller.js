import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Food } from "../models/food.model.js";
import { uploadOnCloudinary, deleteFromCloudinaryByUrl } from "../utils/cloudinary.js";




const addItem = asyncHandler(async (req, res) => {
  // When using multer + multipart/form-data, req.body values are strings.
  // Accept string values and coerce them properly. Also allow price = 0.
  let { itemname, price, originalPrice, category, stock, description, offer, isVeg } = req.body || {};

  // check presence (undefined or null) rather than truthiness to allow falsy but valid values
  if (
    typeof itemname === "undefined" ||
    typeof price === "undefined" ||
    typeof category === "undefined" ||
    typeof stock === "undefined"
  ) {
    throw new ApiError(400, "All fields are Required");
  }

  // coerce types
  const parsedPrice = Number(price);
  if (Number.isNaN(parsedPrice)) {
    throw new ApiError(400, "Invalid price");
  }

  const parsedOriginalPrice = Number(originalPrice) || parsedPrice;

  const parsedStock = Number(stock);
  if (Number.isNaN(parsedStock) || parsedStock < 0) {
    throw new ApiError(400, "Invalid stock quantity");
  }

  let parsedOffer = Math.max(0, Math.min(100, Number(offer) || 0));
  if (parsedOriginalPrice > parsedPrice) {
    parsedOffer = Math.round(((parsedOriginalPrice - parsedPrice) / parsedOriginalPrice) * 100);
  }

  const parsedIsVeg =
    typeof isVeg !== "undefined"
      ? isVeg === true || isVeg === "true" || isVeg === 1 || isVeg === "1"
      : true;

  const inStockBool = parsedStock > 0;

  if (typeof itemname === "string") itemname = itemname.trim();

  const foodExists = await Food.findOne({ itemname: itemname.toLowerCase() });

  if (foodExists) {
    throw new ApiError(400, "Product Already Exists");
  }

  let imageUrl;
  if (req.file) {
    const uploadResult = await uploadOnCloudinary(req.file.path);
    if (uploadResult) imageUrl = uploadResult.secure_url;
  }

  const Product = await Food.create({
    itemname: itemname.toLowerCase(),
    price: parsedPrice,
    originalPrice: parsedOriginalPrice,
    image: imageUrl,
    category,
    inStock: inStockBool,
    stock: parsedStock,
    offer: parsedOffer,
    isVeg: parsedIsVeg,
    description: typeof description === "string" ? description.trim() : "",
  });

  if (!Product) {
    throw new ApiError(400, "something went wrong Adding the Product");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, Product, "Product Added Succesfully"));
});






const updateItem = asyncHandler(async (req, res) => {
  // Simple req.body based update handler.
  // Accepts either { id, ...fields } or { oldItemname, ...fields }
  const { id, oldItemname, itemname, price, originalPrice, category, inStock, image, stock, description, offer, isVeg } =
    req.body || {};

  if (!id && !oldItemname) {
    throw new ApiError(400, "Either id or oldItemname is required for update");
  }

  const existingFood = id
    ? await Food.findById(id)
    : await Food.findOne({ itemname: oldItemname ? oldItemname.trim().toLowerCase() : "" });

  if (!existingFood) {
    throw new ApiError(404, "Item not found");
  }

  const update = {};

  if (typeof itemname !== "undefined") {
    if (typeof itemname !== "string" || itemname.trim() === "") {
      throw new ApiError(400, "Invalid itemname");
    }
    update.itemname = itemname.trim().toLowerCase();
  }

  if (typeof price !== "undefined") {
    const p = Number(price);
    if (Number.isNaN(p)) throw new ApiError(400, "Invalid price");
    update.price = p;
  }

  if (typeof originalPrice !== "undefined") {
    const op = Number(originalPrice);
    if (!Number.isNaN(op)) update.originalPrice = op;
  }

  // Automatically calculate offer percentage if originalPrice and price are known
  const effPrice = typeof update.price !== "undefined" ? update.price : existingFood.price;
  const effOrigPrice = typeof update.originalPrice !== "undefined" ? update.originalPrice : (existingFood.originalPrice || effPrice);
  if (effOrigPrice > effPrice) {
    update.offer = Math.round(((effOrigPrice - effPrice) / effOrigPrice) * 100);
  } else if (typeof offer !== "undefined") {
    const o = Number(offer);
    if (!Number.isNaN(o)) {
      update.offer = Math.max(0, Math.min(100, o));
    }
  } else {
    update.offer = 0;
  }

  if (typeof category !== "undefined") update.category = category;

  if (typeof inStock !== "undefined") {
    update.inStock =
      inStock === true ||
      inStock === "true" ||
      inStock === "1" ||
      inStock === "on";
  }

  if (typeof stock !== "undefined") {
    const s = Number(stock);
    if (Number.isNaN(s) || s < 0) throw new ApiError(400, "Invalid stock quantity");
    update.stock = s;
    // keep inStock consistent with stock when explicitly provided
    if (typeof update.inStock === "undefined") {
      update.inStock = s > 0;
    }
  }

  if (typeof isVeg !== "undefined") {
    update.isVeg =
      isVeg === true ||
      isVeg === "true" ||
      isVeg === 1 ||
      isVeg === "1";
  }

  if (typeof description !== "undefined") {
    update.description = typeof description === "string" ? description.trim() : "";
  }

  // Handle media updates: delete old media in Cloudinary whenever media is updated
  if (req.file) {
    // 1. Delete previous media from Cloudinary first
    if (existingFood.image) {
      console.log(`[Food Media Update] Deleting old media for ${existingFood.itemname}: ${existingFood.image}`);
      await deleteFromCloudinaryByUrl(existingFood.image);
    }
    // 2. Upload new media to Cloudinary
    const uploadResult = await uploadOnCloudinary(req.file.path);
    if (uploadResult && uploadResult.secure_url) {
      update.image = uploadResult.secure_url;
    }
  } else if (typeof image !== "undefined" && image !== existingFood.image) {
    // If image URL is explicitly changed or cleared, delete the old media from Cloudinary
    if (existingFood.image) {
      console.log(`[Food Media URL Change] Deleting previous media for ${existingFood.itemname}: ${existingFood.image}`);
      await deleteFromCloudinaryByUrl(existingFood.image);
    }
    update.image = image;
  }

  let updated;
  if (id) {
    updated = await Food.findByIdAndUpdate(id, { $set: update }, { new: true });
  } else {
    updated = await Food.findOneAndUpdate(
      { itemname: oldItemname.trim().toLowerCase() },
      { $set: update },
      { new: true }
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Item Updated Successfully"));
});

const removeItem = asyncHandler(async (req, res) => {
  const { itemname, id, _id } = req.body || {};

  if (!itemname && !id && !_id) {
    throw new ApiError(400, "Item identifier (itemname or id) is required for deletion");
  }

  const query = {};
  if (id || _id) {
    query._id = id || _id;
  } else {
    query.itemname = itemname.trim().toLowerCase();
  }

  const food = await Food.findOne(query);

  if (!food) {
    return res.status(404).json(new ApiResponse(404, null, "Item Not Found"));
  }

  // 1. FIRST delete the media from Cloudinary
  if (food.image) {
    console.log(`[Food Delete] First deleting media from Cloudinary for ${food.itemname}: ${food.image}`);
    await deleteFromCloudinaryByUrl(food.image);
  }

  // 2. THEN delete the content from the database
  await Food.deleteOne({ _id: food._id });

  return res
    .status(200)
    .json(new ApiResponse(200, food.itemname, "Item and associated media deleted successfully"));
});










const getItemsBasedOnCategory = asyncHandler(async (req, res) => {
  const { category } = req.body;

  if (!category) {
    throw new ApiError(400, "Category not Found");
  }

  const AllItems = await Food.find({ category });

  return res
    .status(200)
    .json(new ApiResponse(200, AllItems, "All Items Fetched Succesfully"));
});

const getAllFoods = asyncHandler(async (req, res) => {
  const foods = await Food.find();

  return res
    .status(200)
    .json(new ApiResponse(200, foods, "All foods fetched successfully"));
});

const rateFood = asyncHandler(async (req, res) => {
  const { foodId, rating } = req.body;
  const userId = req.user?._id || req.body.userId;

  if (!foodId || rating === undefined || rating === null) {
    throw new ApiError(400, "Food ID and rating are required");
  }

  const numericRating = Number(rating);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  const food = await Food.findById(foodId);
  if (!food) {
    throw new ApiError(404, "Food item not found");
  }

  if (!Array.isArray(food.ratings)) {
    food.ratings = [];
  }

  if (userId) {
    const existingIndex = food.ratings.findIndex(
      (r) => r.user && String(r.user) === String(userId)
    );
    if (existingIndex >= 0) {
      food.ratings[existingIndex].rating = numericRating;
      food.ratings[existingIndex].createdAt = new Date();
    } else {
      food.ratings.push({
        user: userId,
        rating: numericRating,
        createdAt: new Date(),
      });
    }
  } else {
    food.ratings.push({
      rating: numericRating,
      createdAt: new Date(),
    });
  }

  const total = food.ratings.reduce((sum, r) => sum + Number(r.rating || 0), 0);
  const avg = food.ratings.length > 0 ? total / food.ratings.length : 0;
  food.averageRating = Math.round(avg * 10) / 10;
  food.totalRatings = food.ratings.length;

  await food.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        foodId: food._id,
        itemname: food.itemname,
        averageRating: food.averageRating,
        totalRatings: food.totalRatings,
        ratings: food.ratings,
      },
      "Rating submitted successfully"
    )
  );
});

export { addItem, updateItem, removeItem, getItemsBasedOnCategory, getAllFoods, rateFood };
