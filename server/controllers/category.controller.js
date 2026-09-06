import { Category } from "../models/category.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const DEFAULT_CATEGORIES = [
  { name: "Pizza", label: "Pizza", icon: "pizza" },
  { name: "Burger", label: "Burger", icon: "burger" },
  { name: "Drinks", label: "Drinks", icon: "beverage" },
  { name: "Sushi", label: "Sushi", icon: "sushi" },
  { name: "Breakfast", label: "Breakfast", icon: "egg" },
  { name: "Lunch", label: "Lunch", icon: "rice" },
];

const REMOVED_CATEGORY_NAMES = ["soups", "pasta", "main course", "maincourse", "dinner"];

const getAllCategories = asyncHandler(async (req, res) => {
  // 1. Clean up any previously stored removed categories
  await Category.deleteMany({
    name: { $in: REMOVED_CATEGORY_NAMES.map((n) => new RegExp(`^${n}$`, "i")) },
  });

  // 2. Fetch all current categories without re-creating deleted ones
  const categories = await Category.find({}).sort({ createdAt: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

const addCategory = asyncHandler(async (req, res) => {
  const { name, label, icon } = req.body;

  if (!name || !String(name).trim()) {
    throw new ApiError(400, "Category name is required");
  }

  const cleanName = String(name).trim();
  const cleanLabel = label && String(label).trim() ? String(label).trim() : cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  const cleanIcon = icon && String(icon).trim() ? String(icon).trim().toLowerCase() : "restaurant";

  // Check if category already exists (case-insensitive)
  const existing = await Category.findOne({
    name: new RegExp(`^${cleanName}$`, "i"),
  });

  if (existing) {
    throw new ApiError(400, `Category "${cleanName}" already exists`);
  }

  const newCat = await Category.create({
    name: cleanName,
    label: cleanLabel,
    icon: cleanIcon,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newCat, "Category created successfully"));
});

const removeCategory = asyncHandler(async (req, res) => {
  const { name, id } = req.body;

  if (!name && !id) {
    throw new ApiError(400, "Category name or ID is required");
  }

  let deleted = null;
  if (id) {
    deleted = await Category.findByIdAndDelete(id);
  }
  if (!deleted && name) {
    deleted = await Category.findOneAndDelete({
      name: new RegExp(`^${String(name).trim()}$`, "i"),
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deleted, "Category removed successfully"));
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id, name, label, icon } = req.body;

  if (!id && !name) {
    throw new ApiError(400, "Category ID or name is required");
  }

  let cat = null;
  if (id) {
    cat = await Category.findById(id);
  } else {
    cat = await Category.findOne({ name: new RegExp(`^${String(name).trim()}$`, "i") });
  }

  if (!cat) {
    throw new ApiError(404, "Category not found");
  }

  const oldName = cat.name;
  if (name && String(name).trim()) {
    cat.name = String(name).trim();
  }
  if (label && String(label).trim()) {
    cat.label = String(label).trim();
  } else if (name && String(name).trim()) {
    cat.label = String(name).trim();
  }
  if (icon && String(icon).trim()) {
    cat.icon = String(icon).trim().toLowerCase();
  }

  await cat.save();

  // If category name changed, cascade update to foods with this category
  if (name && String(name).trim() && String(name).trim().toLowerCase() !== oldName.toLowerCase()) {
    try {
      const { Food } = await import("../models/food.model.js");
      await Food.updateMany(
        { category: new RegExp(`^${oldName}$`, "i") },
        { $set: { category: cat.name } }
      );
    } catch (e) {
      console.warn("Could not cascade category name update to foods:", e);
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, cat, "Category updated successfully"));
});

export { getAllCategories, addCategory, removeCategory, updateCategory };

