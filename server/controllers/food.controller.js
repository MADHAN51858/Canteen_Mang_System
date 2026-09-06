import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Food } from "../models/food.model.js";
import { uploadOnCloudinary, deleteFromCloudinaryByUrl } from "../utils/cloudinary.js";




const addItem = asyncHandler(async (req, res) => {
  // When using multer + multipart/form-data, req.body values are strings.
  // Accept string values and coerce them properly. Also allow price = 0.
  let { itemname, price, category, stock, description, offer, isVeg } = req.body || {};

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

  const parsedStock = Number(stock);
  if (Number.isNaN(parsedStock) || parsedStock < 0) {
    throw new ApiError(400, "Invalid stock quantity");
  }

  const parsedOffer = Math.max(0, Math.min(100, Number(offer) || 0));
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
  const { id, oldItemname, itemname, price, category, inStock, image, stock, description, offer, isVeg } =
    req.body || {};

  if (!id && !oldItemname) {
    throw new ApiError(400, "Either id or oldItemname is required for update");
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

  if (typeof offer !== "undefined") {
    const o = Number(offer);
    if (!Number.isNaN(o)) {
      update.offer = Math.max(0, Math.min(100, o));
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

  if (typeof image !== "undefined") update.image = image;

  const existingFood = id
    ? await Food.findById(id)
    : await Food.findOne({ itemname: oldItemname ? oldItemname.trim().toLowerCase() : "" });

  if (!existingFood) {
    throw new ApiError(404, "Item not found");
  }

  // If a file was uploaded via multer (multipart/form-data), upload it and set image
  if (req.file) {
    // Permanently delete old food image from Cloudinary
    if (existingFood.image) {
      console.log(`[Food Image Update] Deleting old image for ${existingFood.itemname}: ${existingFood.image}`);
      await deleteFromCloudinaryByUrl(existingFood.image);
    }
    const uploadResult = await uploadOnCloudinary(req.file.path);
    if (uploadResult && uploadResult.secure_url)
      update.image = uploadResult.secure_url;
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
  const { itemname } = req.body;

  if (!itemname) {
    throw new ApiError(400, "Itemname not Found");
  }

  const food = await Food.findOne({
    itemname: itemname.trim().toLowerCase(),
  });

  if (!food) {
    return res.status(404).json(new ApiResponse(404, null, "Item Not Found"));
  }

  // Permanently delete food image from Cloudinary
  if (food.image) {
    console.log(`[Food Delete] Deleting image for ${food.itemname}: ${food.image}`);
    await deleteFromCloudinaryByUrl(food.image);
  }

  await Food.deleteOne({ _id: food._id });

  return res
    .status(200)
    .json(new ApiResponse(200, itemname, "Items Deleted Successfully"));
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

export { addItem, updateItem, removeItem, getItemsBasedOnCategory, getAllFoods };
