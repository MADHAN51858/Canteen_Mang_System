import { useState, useEffect, useCallback, useContext, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { useSnackbar } from "../hooks/useSnackbar";
import {
  post,
  postForm,
  get,
  createTable,
  joinTable,
  leaveTable,
  getMyTable,
  addItemToTable,
  updateTableItemQty,
  removeTableItem,
  toggleMemberReady,
  placeTableOrder,
  updateTableOrderType,
  placeOrder as placeSoloOrder,
} from "../utils/api";

import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Avatar,
  Stack,
  Tooltip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  MenuItem,
  Slider,
  Popover,
  Badge,
  Menu as MuiMenu,
  ListItemIcon,
  ListItemText,
  Rating,
  Collapse,
} from "@mui/material";

// Icons
import SearchIcon from "@mui/icons-material/Search";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import AppsRoundedIcon from "@mui/icons-material/AppsRounded";
import EggAltOutlinedIcon from "@mui/icons-material/EggAltOutlined";
import SoupKitchenOutlinedIcon from "@mui/icons-material/SoupKitchenOutlined";
import DinnerDiningOutlinedIcon from "@mui/icons-material/DinnerDiningOutlined";
import RestaurantOutlinedIcon from "@mui/icons-material/RestaurantOutlined";
import LunchDiningOutlinedIcon from "@mui/icons-material/LunchDiningOutlined";
import RiceBowlOutlinedIcon from "@mui/icons-material/RiceBowlOutlined";
import BedtimeOutlinedIcon from "@mui/icons-material/BedtimeOutlined";
import LocalCafeOutlinedIcon from "@mui/icons-material/LocalCafeOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import TableRestaurantRoundedIcon from "@mui/icons-material/TableRestaurantRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import RemoveShoppingCartRoundedIcon from "@mui/icons-material/RemoveShoppingCartRounded";
import AddShoppingCartRoundedIcon from "@mui/icons-material/AddShoppingCartRounded";
import LocalPizzaOutlinedIcon from "@mui/icons-material/LocalPizzaOutlined";
import IcecreamOutlinedIcon from "@mui/icons-material/IcecreamOutlined";
import FastfoodOutlinedIcon from "@mui/icons-material/FastfoodOutlined";
import BakeryDiningOutlinedIcon from "@mui/icons-material/BakeryDiningOutlined";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

// Standard restaurant veg / non-veg indicator (square with colored circle)
function RestaurantVegIcon({ isVeg = true, size = 16 }) {
  const color = isVeg ? "#16a34a" : "#dc2626";
  return (
    <Box
      sx={{
        width: size,
        height: size,
        border: `1.8px solid ${color}`,
        borderRadius: "3px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        backgroundColor: "#ffffff",
        boxSizing: "border-box",
      }}
      title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
    >
      <Box
        sx={{
          width: Math.round(size * 0.44),
          height: Math.round(size * 0.44),
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
    </Box>
  );
}

// Automatically calculate offer percentage from original price and current price
function calculateOfferPercent(orig, curr) {
  const o = Number(orig) || 0;
  const c = Number(curr) || 0;
  if (o > 0 && c > 0 && o > c) {
    return Math.round(((o - c) / o) * 100);
  }
  return 0;
}

// Fallback culinary images for items without image
const DEFAULT_IMAGES = {
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
  salad: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
  tacos: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80",
  sushi: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80",
  juice: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80",
  pasta: "https://images.unsplash.com/photo-1621996346565-e3d5d62816f5?auto=format&fit=crop&w=600&q=80",
  default: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
};

function getFallbackImage(itemname = "") {
  const n = itemname.toLowerCase();
  if (n.includes("burger")) return DEFAULT_IMAGES.burger;
  if (n.includes("salad") || n.includes("diet")) return DEFAULT_IMAGES.salad;
  if (n.includes("taco")) return DEFAULT_IMAGES.tacos;
  if (n.includes("sushi") || n.includes("fish")) return DEFAULT_IMAGES.sushi;
  if (n.includes("juice") || n.includes("drink") || n.includes("tea") || n.includes("coffee")) return DEFAULT_IMAGES.juice;
  if (n.includes("pasta") || n.includes("noodle") || n.includes("soup")) return DEFAULT_IMAGES.pasta;
  return DEFAULT_IMAGES.default;
}

// Razorpay UPI Checkout Trigger
export async function openRazorpay(amount) {
  if (!window.Razorpay) {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(script);
    await new Promise((resolve) => {
      script.onload = resolve;
    });
  }

  return new Promise((resolve) => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      name: "Canteen Food Order",
      description: "UPI Order Payment",
      handler: function (response) {
        resolve(response);
      },
      theme: {
        color: "#059669",
      },
      modal: {
        ondismiss: function () {
          resolve({ dismissed: true });
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (err) {
      console.warn("Razorpay UPI payment warning:", err);
      resolve({ failed: true });
    });
    rzp.open();
  });
}

// Category visual icons & emoji definitions
export const CATEGORY_ICON_OPTIONS = [
  { id: "pizza", label: "Pizza", emoji: "🍕" },
  { id: "burger", label: "Burger", emoji: "🍔" },
  { id: "beverage", label: "Drinks", emoji: "🥤" },
  { id: "sushi", label: "Sushi", emoji: "🍣" },
  { id: "egg", label: "Breakfast / Egg", emoji: "🍳" },
  { id: "rice", label: "Lunch / Rice", emoji: "🍚" },
  { id: "fastfood", label: "Fast Food / Fries", emoji: "🍟" },
  { id: "icecream", label: "Ice Cream / Dessert", emoji: "🍦" },
  { id: "bakery", label: "Bakery / Bread", emoji: "🥐" },
  { id: "restaurant", label: "General / Dining", emoji: "🍽️" },
  { id: "taco", label: "Tacos", emoji: "🌮" },
  { id: "salad", label: "Salad", emoji: "🥗" },
  { id: "noodles", label: "Noodles", emoji: "🍜" },
];

export function getCategoryVisual(iconKey, catName = "") {
  const k = String(iconKey || "").toLowerCase();
  const n = String(catName || "").toLowerCase();
  if (k === "pizza" || n.includes("pizza")) return "🍕";
  if (k === "burger" || n.includes("burger")) return "🍔";
  if (k === "drinks" || k === "beverage" || k === "coffee" || n.includes("drink") || n.includes("beverag") || n.includes("tea") || n.includes("coffee") || n.includes("juice")) return "🥤";
  if (k === "sushi" || n.includes("sushi")) return "🍣";
  if (k === "egg" || n.includes("breakfast") || n.includes("egg")) return "🍳";
  if (k === "rice" || n.includes("lunch") || n.includes("rice") || n.includes("biryani")) return "🍚";
  if (k === "fastfood" || n.includes("snack") || n.includes("fast food") || n.includes("fries")) return "🍟";
  if (k === "icecream" || n.includes("ice cream") || n.includes("dessert")) return "🍦";
  if (k === "bakery" || n.includes("cake") || n.includes("bakery") || n.includes("bread")) return "🥐";
  if (k === "taco" || n.includes("taco")) return "🌮";
  if (k === "salad" || n.includes("salad")) return "🥗";
  if (k === "noodles" || n.includes("noodle")) return "🍜";
  if (k === "all" || n === "all") return "🍽️";
  return "🍽️";
}

// Category badge & filter helper functions
export function getCategoryIcon(iconKey, catName = "") {
  const k = String(iconKey || "").toLowerCase();
  const n = String(catName || "").toLowerCase();
  if (k === "egg" || n.includes("breakfast") || n.includes("egg")) return EggAltOutlinedIcon;
  if (k === "rice" || n.includes("lunch") || n.includes("rice") || n.includes("biryani")) return RiceBowlOutlinedIcon;
  if (k === "burger" || n.includes("burger")) return LunchDiningOutlinedIcon;
  if (k === "beverage" || k === "coffee" || n.includes("beverage") || n.includes("drink") || n.includes("tea") || n.includes("coffee") || n.includes("juice")) return LocalCafeOutlinedIcon;
  if (k === "pizza" || n.includes("pizza")) return LocalPizzaOutlinedIcon;
  if (k === "icecream" || n.includes("ice cream") || n.includes("dessert")) return IcecreamOutlinedIcon;
  if (k === "fastfood" || n.includes("snack") || n.includes("fast food")) return FastfoodOutlinedIcon;
  if (k === "bakery" || n.includes("cake") || n.includes("bakery") || n.includes("bread")) return BakeryDiningOutlinedIcon;
  return RestaurantOutlinedIcon;
}

export function getCardCategoryBadge(food, dbCategories = []) {
  const cat = String(food?.category || "").trim();
  const catLower = cat.toLowerCase();

  const match = Array.isArray(dbCategories)
    ? dbCategories.find(
        (c) => c.name?.toLowerCase() === catLower || c.label?.toLowerCase() === catLower
      )
    : null;

  if (match) {
    return {
      label: match.label || match.name,
      icon: getCategoryIcon(match.icon, match.name),
    };
  }

  if (catLower === "breakfast") return { label: "Breakfast", icon: EggAltOutlinedIcon };
  if (catLower === "lunch") return { label: "Lunch", icon: RiceBowlOutlinedIcon };
  if (catLower === "burgers") return { label: "Burgers", icon: LunchDiningOutlinedIcon };
  if (catLower === "beverages") return { label: "Beverages", icon: LocalCafeOutlinedIcon };

  const fallbackLabel = cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : "Other";
  return { label: fallbackLabel, icon: getCategoryIcon("", cat) };
}

export function checkIsVeg(food) {
  if (food?.isVeg !== undefined && food?.isVeg !== null) return Boolean(food.isVeg);
  const n = String(food?.itemname || "").toLowerCase();
  const desc = String(food?.description || "").toLowerCase();
  if (
    n.includes("non veg") ||
    n.includes("non-veg") ||
    n.includes("chicken") ||
    n.includes("meat") ||
    n.includes("mutton") ||
    n.includes("fish") ||
    n.includes("egg") ||
    n.includes("prawn") ||
    n.includes("beef") ||
    n.includes("pork") ||
    desc.includes("chicken") ||
    desc.includes("non-veg")
  ) {
    return false;
  }
  return true;
}

export function matchFoodCategory(food, targetCategory) {
  if (!targetCategory || targetCategory === "all") return true;
  const catLower = targetCategory.toLowerCase();
  const itemCat = String(food?.category || "").trim().toLowerCase();
  if (itemCat === catLower) return true;
  if ((catLower === "burger" || catLower === "burgers") && (itemCat === "burger" || itemCat === "burgers")) return true;
  if ((catLower === "drinks" || catLower === "beverages" || catLower === "drink") && (itemCat === "drinks" || itemCat === "beverages" || itemCat === "drink")) return true;
  return false;
}

export default function Menu() {
  const navigate = useNavigate();
  const { user, cart, addToCart, increaseQuantity, decreaseQuantity, removeFromCart, clearCart, login } =
    useContext(CartContext);
  const { enqueueSnackbar } = useSnackbar();

  // Role detection: Admin/Staff vs Student
  const rawRole = String(user?.role || "student").toLowerCase();
  const isAdminOrStaff = rawRole.includes("admin") || rawRole.includes("staff");
  const currentUsername = String(user?.username || "").toLowerCase();
  const [cartCollapsed, setCartCollapsed] = useState(false);

  // Categories & Foods State
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [allFoods, setAllFoods] = useState([]);
  const [loadingFoods, setLoadingFoods] = useState(true);

  // Dynamic Database Categories State (Add and Remove Categories)
  const [dbCategories, setDbCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("restaurant");
  const [addCategoryLoading, setAddCategoryLoading] = useState(false);
  const [deleteCatConfirmOpen, setDeleteCatConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);

  // Admin Edit Category States
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryIcon, setEditCategoryIcon] = useState("restaurant");
  const [editCategoryLoading, setEditCategoryLoading] = useState(false);

  // Refs for search keyboard shortcut and category scroll
  const searchInputRef = useRef(null);
  const categoryScrollRef = useRef(null);

  // Filter Popover States (Food Type, Ingredient Veg/Non-Veg, Pricing Range)
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [filterFoodTypes, setFilterFoodTypes] = useState([]);
  const [filterIngredient, setFilterIngredient] = useState("all"); // 'all' | 'veg' | 'non-veg'
  const [filterPriceRange, setFilterPriceRange] = useState([0, 1000]);

  // Card 3-Dots Action Menu State
  const [cardMenuAnchorEl, setCardMenuAnchorEl] = useState(null);
  const [cardMenuFood, setCardMenuFood] = useState(null);

  // ⌘ K / Ctrl K Search Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Collaborative Table State (Students only) - persisted in sessionStorage across page refreshes
  const [activeTable, setActiveTableState] = useState(() => {
    try {
      const cached = sessionStorage.getItem("activeTable");
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  const setActiveTable = useCallback((tbl) => {
    setActiveTableState(tbl);
    try {
      if (tbl && tbl._id) {
        sessionStorage.setItem("activeTable", JSON.stringify(tbl));
      } else {
        sessionStorage.removeItem("activeTable");
      }
    } catch (e) {}
  }, []);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableNameInput, setTableNameInput] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [tableModalTab, setTableModalTab] = useState("create"); // 'create' | 'join' - by default create is active
  const [expandedUsers, setExpandedUsers] = useState({});
  const toggleUserAccordion = useCallback((uName) => {
    setExpandedUsers((prev) => ({
      ...prev,
      [uName]: prev[uName] === undefined ? false : !prev[uName],
    }));
  }, []);

  // Order Details & Checkout State (Students only)
  const [deliveryType, setDeliveryType] = useState("Dine in"); // 'Dine in' | 'Take Away' | 'Delivery'
  const [orderMode, setOrderMode] = useState("now"); // 'now' (Ordered Now) | 'pre' (Pre-Order)
  const [paymentMethod, setPaymentMethod] = useState("cash"); // 'cash' | 'upi' | 'wallet'
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccessDialog, setOrderSuccessDialog] = useState(false);
  const [placedOrderDetails, setPlacedOrderDetails] = useState(null);

  // Admin Management State (Add / Edit / Remove Dish)
  const [addDishOpen, setAddDishOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    itemname: "",
    originalPrice: "",
    price: "",
    category: "BreakFast",
    stock: 20,
    offer: 0,
    isVeg: true,
    description: "",
  });
  const [addImageFile, setAddImageFile] = useState(null);
  const [addImagePreview, setAddImagePreview] = useState(null);
  const [addDishLoading, setAddDishLoading] = useState(false);
  const [addIsDragging, setAddIsDragging] = useState(false);
  const addFileInputRef = useRef(null);

  // Admin Edit Dish State
  const [editDishOpen, setEditDishOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [editForm, setEditForm] = useState({
    itemname: "",
    originalPrice: "",
    price: "",
    category: "BreakFast",
    stock: 0,
    offer: 0,
    isVeg: true,
  });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editDishLoading, setEditDishLoading] = useState(false);
  const [editIsDragging, setEditIsDragging] = useState(false);
  const editFileInputRef = useRef(null);

  // Admin Delete Dish Confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dishToDelete, setDishToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Student / User Food Rating State
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedFoodForRating, setSelectedFoodForRating] = useState(null);
  const [userRatingScore, setUserRatingScore] = useState(5);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const openRatingDialog = (food, e) => {
    if (e) e.stopPropagation();
    setSelectedFoodForRating(food);
    setUserRatingScore(5);
    setRatingDialogOpen(true);
  };

  const handleRatingSubmit = async () => {
    if (!selectedFoodForRating || !userRatingScore) return;
    try {
      setRatingSubmitting(true);
      const res = await post("/food/rateFood", {
        foodId: selectedFoodForRating._id,
        rating: userRatingScore,
      });

      if (res?.success || res?.status === 200 || res?.statusCode === 200) {
        // Update allFoods state locally with the new averageRating and totalRatings
        try {
          setAllFoods((prevFoods) =>
            Array.isArray(prevFoods)
              ? prevFoods.map((f) => {
                  if (String(f._id) === String(selectedFoodForRating._id)) {
                    return {
                      ...f,
                      averageRating: res.data?.averageRating ?? userRatingScore,
                      totalRatings: res.data?.totalRatings ?? ((f.totalRatings || 0) + 1),
                      ratings: res.data?.ratings ?? f.ratings,
                    };
                  }
                  return f;
                })
              : prevFoods
          );
        } catch (stateErr) {
          console.error("State update error:", stateErr);
        }

        enqueueSnackbar(`Rated ${selectedFoodForRating.itemname} ${userRatingScore} stars!`, {
          variant: "success",
        });
        setRatingDialogOpen(false);
      } else {
        enqueueSnackbar(res?.message || "Failed to submit rating", { variant: "error" });
      }
    } catch (err) {
      console.error("Submit rating error:", err);
      enqueueSnackbar(err?.message || "Error submitting rating", { variant: "error" });
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleDirectRate = async (food, newRatingValue, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!food || !newRatingValue) return;
    try {
      const res = await post("/food/rateFood", {
        foodId: food._id,
        rating: Number(newRatingValue),
      });

      if (res?.success || res?.status === 200 || res?.statusCode === 200) {
        // Update allFoods state locally with the new averageRating and totalRatings
        try {
          setAllFoods((prevFoods) =>
            Array.isArray(prevFoods)
              ? prevFoods.map((f) => {
                  if (String(f._id) === String(food._id)) {
                    return {
                      ...f,
                      averageRating: res.data?.averageRating ?? newRatingValue,
                      totalRatings: res.data?.totalRatings ?? ((f.totalRatings || 0) + 1),
                      ratings: res.data?.ratings ?? f.ratings,
                    };
                  }
                  return f;
                })
              : prevFoods
          );
        } catch (stateErr) {
          console.error("State update error:", stateErr);
        }

        enqueueSnackbar(`Rated ${food.itemname} ${newRatingValue} ★!`, {
          variant: "success",
        });
      } else {
        enqueueSnackbar(res?.message || "Failed to submit rating", { variant: "error" });
      }
    } catch (err) {
      console.error("Direct rating error:", err);
      enqueueSnackbar(err?.message || "Error submitting rating", { variant: "error" });
    }
  };

  const currentRollNo = String(user?.rollNo || "").trim().toLowerCase();

  const isJoinedMember = useMemo(() => {
    if (!activeTable) return false;
    const creatorUser = String(activeTable.creator || "").trim().toLowerCase();
    const creatorRoll = String(activeTable.creatorRollNo || "").trim().toLowerCase();
    const tblId = String(activeTable.tableId || "").trim().toLowerCase();

    let uName = String(user?.username || currentUsername || "").trim().toLowerCase();
    let uRoll = String(user?.rollNo || currentRollNo || "").trim().toLowerCase();

    if (!uName && !uRoll) {
      try {
        const cachedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
        uName = String(cachedUser.username || "").trim().toLowerCase();
        uRoll = String(cachedUser.rollNo || "").trim().toLowerCase();
      } catch (e) {}
    }

    const isCreator =
      (uName && creatorUser && creatorUser === uName) ||
      (uRoll && creatorRoll && creatorRoll === uRoll) ||
      (uRoll && tblId && tblId === uRoll);

    return !isCreator;
  }, [activeTable, user, currentUsername, currentRollNo]);

  const isTableCreator = useMemo(() => {
    if (!activeTable) return false;
    return !isJoinedMember;
  }, [activeTable, isJoinedMember]);

  // For collaborative tables, orderMode is strictly driven by activeTable.orderType
  const effectiveOrderMode = useMemo(() => {
    if (activeTable && activeTable.orderType) {
      return String(activeTable.orderType).toLowerCase().includes("pre") ? "pre" : "now";
    }
    return orderMode;
  }, [activeTable, orderMode]);

  // 1. Fetch All Foods from Backend
  const fetchFoods = useCallback(async () => {
    try {
      const res = await post("/food/getAllFoods", {});
      if (res && res.data && Array.isArray(res.data)) {
        setAllFoods(res.data);
      }
    } catch (err) {
      console.error("Failed to load foods:", err);
    } finally {
      setLoadingFoods(false);
    }
  }, []);

  // 1b. Fetch All Categories from Backend
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const res = await post("/category/getAll", {});
      if (res && res.data && Array.isArray(res.data)) {
        setDbCategories(res.data);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // 2. Fetch Initial Active Table Session (Once on mount for students)
  useEffect(() => {
    fetchFoods();
    fetchCategories();
    if (!isAdminOrStaff) {
      getMyTable()
        .then((res) => {
          if (res && res.data) {
            setActiveTable(res.data);
            if (res.data.orderType) {
              setOrderMode(res.data.orderType.toLowerCase().includes("pre") ? "pre" : "now");
            }
          } else if (res && res.success && !res.data) {
            // Table was ended or closed by host
            setActiveTable(null);
          }
        })
        .catch(() => {});
    }
  }, [fetchFoods, isAdminOrStaff, setActiveTable]);

  // 3. Poll Table Session ONLY when a table is created or joined (activeTable exists)
  // Rapid 1200ms sync ensures creator's orderType and cart changes reflect instantly to joined members
  useEffect(() => {
    if (!activeTable?._id || isAdminOrStaff) return;

    const interval = setInterval(async () => {
      try {
        const res = await getMyTable();
        if (res && res.data) {
          setActiveTable(res.data);
          if (res.data.orderType) {
            setOrderMode(res.data.orderType.toLowerCase().includes("pre") ? "pre" : "now");
          }
        } else if (res && res.success && !res.data) {
          setActiveTable(null);
        }
      } catch (err) {
        console.error("Table sync error:", err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [activeTable?._id, isAdminOrStaff, setActiveTable]);

  // Image preview effects for Add/Edit
  useEffect(() => {
    if (addImageFile) {
      const url = URL.createObjectURL(addImageFile);
      setAddImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setAddImagePreview(null);
  }, [addImageFile]);

  useEffect(() => {
    if (editImageFile) {
      const url = URL.createObjectURL(editImageFile);
      setEditImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setEditImagePreview(null);
  }, [editImageFile]);

  // 3. Category Metadata & Real Item Counters (Dynamically backed by MongoDB)
  const categoriesList = useMemo(() => {
    const countMap = {};
    allFoods.forEach((f) => {
      const cat = String(f.category || "").trim().toLowerCase();
      countMap[cat] = (countMap[cat] || 0) + 1;
    });

    const list = [
      { id: "all", label: "All", count: allFoods.length, icon: AppsRoundedIcon },
    ];

    dbCategories.forEach((cat) => {
      const id = cat.name;
      const count = allFoods.filter((f) => matchFoodCategory(f, cat.name)).length;
      const icon = getCategoryIcon(cat.icon, cat.name);
      list.push({
        id,
        name: cat.name,
        label: cat.label || cat.name,
        count,
        icon,
        _id: cat._id,
      });
    });

    return list;
  }, [allFoods, dbCategories]);

  // 4. Multi-Filter & Search Engine
  const filteredFoods = useMemo(() => {
    let result = allFoods;

    // A. Top bar category tab
    if (selectedCategory !== "all") {
      result = result.filter((f) => matchFoodCategory(f, selectedCategory));
    }

    // B. Food Types from Filter Popover
    if (filterFoodTypes.length > 0) {
      result = result.filter((f) => filterFoodTypes.some((type) => matchFoodCategory(f, type)));
    }

    // C. Ingredient Type (Veg / Non-Veg)
    if (filterIngredient === "veg") {
      result = result.filter((f) => checkIsVeg(f));
    } else if (filterIngredient === "non-veg") {
      result = result.filter((f) => !checkIsVeg(f));
    }

    // D. Pricing Range
    result = result.filter((f) => {
      const p = Number(f.price || 0);
      return p >= filterPriceRange[0] && p <= filterPriceRange[1];
    });

    // E. Search query (matches name, category, or SKU/id)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          String(f.itemname || "").toLowerCase().includes(q) ||
          String(f.category || "").toLowerCase().includes(q) ||
          String(f._id || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [allFoods, selectedCategory, filterFoodTypes, filterIngredient, filterPriceRange, searchQuery]);

  const hasActiveFilters = useMemo(() => {
    return (
      filterFoodTypes.length > 0 ||
      filterIngredient !== "all" ||
      filterPriceRange[0] > 0 ||
      filterPriceRange[1] < 1000
    );
  }, [filterFoodTypes, filterIngredient, filterPriceRange]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterFoodTypes.length > 0) count += 1;
    if (filterIngredient !== "all") count += 1;
    if (filterPriceRange[0] > 0 || filterPriceRange[1] < 1000) count += 1;
    return count;
  }, [filterFoodTypes, filterIngredient, filterPriceRange]);

  const handleResetFilters = () => {
    setFilterFoodTypes([]);
    setFilterIngredient("all");
    setFilterPriceRange([0, 1000]);
  };

  // 5. Active Cart Items (Student Only)
  const cartItems = useMemo(() => {
    if (activeTable && Array.isArray(activeTable.items)) {
      return activeTable.items;
    }
    return cart.map((i) => ({
      ...i,
      foodId: i._id,
      addedBy: {
        username: user?.username || "You",
        name: user?.name || user?.username || "You",
        avatar: user?.avatar || "",
      },
    }));
  }, [activeTable, cart, user]);

  const getItemCartQty = useCallback(
    (foodId) => {
      if (activeTable && Array.isArray(activeTable.items)) {
        const found = activeTable.items.find(
          (i) => String(i.foodId) === String(foodId) && i.addedBy?.username === currentUsername
        );
        return found ? found.quantity : 0;
      }
      const found = cart.find((i) => String(i._id) === String(foodId));
      return found ? found.quantity : 0;
    },
    [activeTable, cart, currentUsername]
  );

  // 6. Handle Add to Dish (Students only)
  const handleAddToDish = async (food) => {
    if (activeTable) {
      try {
        const res = await addItemToTable(activeTable.tableId, food._id);
        if (res && res.success !== false && res.data) {
          setActiveTable(res.data);
          enqueueSnackbar(`Added ${food.itemname} to table`, { variant: "success" });
        } else {
          enqueueSnackbar(res?.message || "Failed to add item to table", { variant: "error" });
        }
      } catch (err) {
        enqueueSnackbar(err?.message || "Failed to add item to table", { variant: "error" });
      }
    } else {
      addToCart(food);
      enqueueSnackbar(`Added ${food.itemname} to cart`, { variant: "success" });
    }
  };

  // 7. Handle Increment / Decrement Quantity (Students only)
  const handleUpdateQty = async (foodId, delta) => {
    if (activeTable) {
      const item = activeTable.items.find(
        (i) => String(i.foodId) === String(foodId) && i.addedBy?.username === currentUsername
      );
      if (!item) return;

      try {
        const res = await updateTableItemQty(activeTable.tableId, item._id, delta);
        if (res && res.success !== false && res.data) {
          setActiveTable(res.data);
        } else {
          enqueueSnackbar(res?.message || "Failed to update quantity", { variant: "error" });
        }
      } catch (err) {
        enqueueSnackbar(err?.message || "Failed to update quantity", { variant: "error" });
      }
    } else {
      if (delta > 0) {
        increaseQuantity(foodId);
      } else {
        decreaseQuantity(foodId);
      }
    }
  };

  // 8. Handle Direct Item Removal (Students only)
  const handleRemoveItem = async (itemId, foodId) => {
    if (activeTable) {
      try {
        const res = await removeTableItem(activeTable.tableId, itemId);
        if (res && res.success !== false && res.data) {
          setActiveTable(res.data);
        } else {
          enqueueSnackbar(res?.message || "Failed to remove item", { variant: "error" });
        }
      } catch (err) {
        enqueueSnackbar(err?.message || "Failed to remove item", { variant: "error" });
      }
    } else {
      removeFromCart(foodId);
    }
  };

  // 9. Collaborative Table Actions (Students only)
  const handleCreateTable = async () => {
    setTableLoading(true);
    try {
      const res = await createTable();
      if (res && res.success !== false && res.data) {
        setActiveTable(res.data);
        setTableModalOpen(false);
        setTableNameInput("");
        enqueueSnackbar(`Table created with Roll Number ${res.data.tableId}!`, { variant: "success" });
      } else {
        enqueueSnackbar(res?.message || "Failed to create table", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err?.message || "Failed to create table", { variant: "error" });
    } finally {
      setTableLoading(false);
    }
  };

  const handleJoinTable = async (nameOrId) => {
    const target = (nameOrId || joinInput).trim();
    if (!target) {
      enqueueSnackbar("Please enter a Roll Number to join table", { variant: "warning" });
      return;
    }
    setTableLoading(true);
    try {
      const res = await joinTable(target);
      if (res && res.success !== false && res.data) {
        setActiveTable(res.data);
        setTableModalOpen(false);
        setJoinInput("");
        enqueueSnackbar(`Joined ${res.data.tableName || res.data.tableId}! You can now order together.`, { variant: "success" });
      } else {
        enqueueSnackbar(res?.message || "Failed to join table", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err?.message || "Failed to join table", { variant: "error" });
    } finally {
      setTableLoading(false);
    }
  };

  const handleLeaveTable = async () => {
    try {
      const res = await leaveTable();
      if (res && res.success !== false) {
        setActiveTable(null);
        enqueueSnackbar("Left table session", { variant: "info" });
      } else {
        enqueueSnackbar(res?.message || "Failed to leave table", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err?.message || "Failed to leave table", { variant: "error" });
    }
  };

  const handleToggleReady = async () => {
    if (!activeTable) return;
    try {
      const currentMember = activeTable.members.find((m) => m.username === currentUsername);
      const nextState = !Boolean(currentMember?.isReady);
      const res = await toggleMemberReady(activeTable.tableId, nextState);
      if (res && res.success !== false && res.data) {
        setActiveTable(res.data);
        enqueueSnackbar(nextState ? "Marked as Ready! Waiting for creator to place order." : "Status set to ordering", {
          variant: nextState ? "success" : "info",
        });
      } else {
        enqueueSnackbar(res?.message || "Failed to update ready state", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err?.message || "Failed to update ready state", { variant: "error" });
    }
  };

  // 10. Financial Totals Calculation (Students only)
  const subTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  }, [cartItems]);

  const taxAmount = useMemo(() => {
    return Number((subTotal * 0.05).toFixed(2));
  }, [subTotal]);

  const totalAmount = useMemo(() => {
    return Number((subTotal + taxAmount).toFixed(2));
  }, [subTotal, taxAmount]);

  // Helper: check if a member has added any items to the table cart
  const memberHasItems = useCallback(
    (memberUsername) => {
      if (!activeTable || !Array.isArray(activeTable.items)) return false;
      const u = String(memberUsername || "").trim().toLowerCase();
      return activeTable.items.some(
        (it) => String(it.addedBy?.username || "").trim().toLowerCase() === u
      );
    },
    [activeTable]
  );

  // Helper: member readiness - if member has not added any items, count him as continue by default!
  const isMemberReady = useCallback(
    (member) => {
      if (!member) return true;
      if (!memberHasItems(member.username)) {
        return true; // No items in cart = auto-continue
      }
      return Boolean(member.isReady);
    },
    [memberHasItems]
  );

  const currentUserHasItems = useMemo(() => {
    return memberHasItems(currentUsername);
  }, [memberHasItems, currentUsername]);

  const isCurrentUserReady = useMemo(() => {
    if (!activeTable) return false;
    const m = activeTable.members.find(
      (m) => String(m.username || "").toLowerCase() === String(currentUsername || "").toLowerCase()
    );
    return isMemberReady(m);
  }, [activeTable, currentUsername, isMemberReady]);

  // Active users list for accordion rendering (Host first, then all members)
  const tableActiveUsers = useMemo(() => {
    if (!activeTable) return [];
    const members = Array.isArray(activeTable.members) ? [...activeTable.members] : [];
    const seen = new Set(members.map((m) => String(m.username || "").toLowerCase()));

    if (Array.isArray(activeTable.items)) {
      activeTable.items.forEach((it) => {
        const u = String(it.addedBy?.username || "").toLowerCase();
        if (u && !seen.has(u)) {
          seen.add(u);
          members.push({
            username: u,
            name: it.addedBy?.name || u,
            avatar: it.addedBy?.avatar || "",
            isReady: false,
          });
        }
      });
    }

    const hostUser = String(activeTable.creator || "").toLowerCase();
    members.forEach((m) => {
      const u = String(m.username || "").toLowerCase();
      if (!m.avatar) {
        if (u === hostUser && activeTable.creatorAvatar) {
          m.avatar = activeTable.creatorAvatar;
        } else if (u === String(user?.username || "").toLowerCase() && user?.avatar) {
          m.avatar = user.avatar;
        }
      }
    });

    members.sort((a, b) => {
      const aIsHost = String(a.username || "").toLowerCase() === hostUser;
      const bIsHost = String(b.username || "").toLowerCase() === hostUser;
      if (aIsHost) return -1;
      if (bIsHost) return 1;
      return 0;
    });

    return members;
  }, [activeTable, user]);

  // Joined members at the table excluding the creator
  const joinedMembersList = useMemo(() => {
    if (!activeTable || !Array.isArray(activeTable.members)) return [];
    const creatorUser = String(activeTable.creator || "").trim().toLowerCase();
    const creatorRoll = String(activeTable.creatorRollNo || "").trim().toLowerCase();
    return activeTable.members.filter((m) => {
      const u = String(m.username || "").trim().toLowerCase();
      return u !== creatorUser && (!creatorRoll || u !== creatorRoll);
    });
  }, [activeTable]);

  const allJoinedMembersReady = useMemo(() => {
    if (joinedMembersList.length === 0) return true;
    return joinedMembersList.every((m) => isMemberReady(m));
  }, [joinedMembersList, isMemberReady]);

  const readyJoinedCount = useMemo(() => {
    return joinedMembersList.filter((m) => isMemberReady(m)).length;
  }, [joinedMembersList, isMemberReady]);

  const readyCount = useMemo(() => {
    if (!activeTable || !Array.isArray(activeTable.members)) return 0;
    return activeTable.members.filter((m) => isMemberReady(m)).length;
  }, [activeTable, isMemberReady]);

  // 11. Final Place Order with CASH / UPI / WALLET
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      enqueueSnackbar("Your cart is empty. Please add some dishes first!", { variant: "warning" });
      return;
    }

    // Table Order check: Only creator can trigger final order
    if (activeTable && !isTableCreator) {
      enqueueSnackbar(`Only the table creator (${activeTable.creatorName || activeTable.creator}) can place the order.`, {
        variant: "warning",
      });
      return;
    }

    // Table Order check: All joined members must have clicked Continue (members with 0 items are auto-counted as continue)
    if (activeTable && isTableCreator && joinedMembersList.length > 0 && !allJoinedMembersReady) {
      const pendingMembers = joinedMembersList
        .filter((m) => !isMemberReady(m))
        .map((m) => m.name || m.username)
        .join(", ");
      enqueueSnackbar(
        `Cannot place order yet: waiting for ${pendingMembers} to click Continue (${readyJoinedCount}/${joinedMembersList.length} ready).`,
        { variant: "warning" }
      );
      return;
    }

    setOrderSubmitting(true);
    const isPre = effectiveOrderMode === "pre";
    const walletBalance = Number(user?.walletBalance || 0);

    try {
      // Handle UPI Payment: Open Razorpay popup with total amount
      if (paymentMethod === "upi") {
        enqueueSnackbar("Opening Razorpay UPI gateway...", { variant: "info" });
        try {
          await openRazorpay(totalAmount);
        } catch (e) {
          console.warn("Razorpay notice:", e);
        }
        // If the popup closes, directly proceed to place the order
      }

      // Handle Wallet Payment: Deduct from wallet balance
      if (paymentMethod === "wallet") {
        if (walletBalance < totalAmount) {
          enqueueSnackbar(`Insufficient wallet balance. Available: ₹${walletBalance}, Required: ₹${totalAmount}`, {
            variant: "warning",
          });
          setOrderSubmitting(false);
          return;
        }

        const deductRes = await post("/users/deductFromWallet", { amount: totalAmount });
        if (!deductRes || !deductRes.success) {
          enqueueSnackbar(deductRes?.message || "Failed to deduct from wallet", { variant: "error" });
          setOrderSubmitting(false);
          return;
        }

        if (deductRes.data && deductRes.data.newBalance !== undefined) {
          login({ ...user, walletBalance: deductRes.data.newBalance });
        }
      }

      // Execute Order Creation (Cash, UPI, or Wallet)
      if (activeTable) {
        const res = await placeTableOrder(activeTable.tableId, isPre, paymentMethod);
        if (res && res.success !== false && res.data) {
          setPlacedOrderDetails(res.data);
          setOrderSuccessDialog(true);
          setActiveTable(null);
          enqueueSnackbar(`Order placed successfully on ${activeTable.creatorName}'s receipt!`, { variant: "success" });
        } else {
          enqueueSnackbar(res?.message || "Failed to place table order. Please try again.", { variant: "error" });
        }
      } else {
        const formattedItems = cart.map((i) => ({
          _id: i._id,
          itemname: i.itemname,
          price: i.price,
          quantity: i.quantity || 1,
        }));

        const res = await placeSoloOrder(formattedItems, isPre);
        if (res && res.success !== false && res.data) {
          setPlacedOrderDetails(res.data);
          setOrderSuccessDialog(true);
          clearCart();
          enqueueSnackbar("Order placed successfully!", { variant: "success" });
        } else {
          // If wallet was deducted, refund it!
          if (paymentMethod === "wallet") {
            try {
              const refundRes = await post("/users/addMoney", { amount: totalAmount });
              if (refundRes?.data?.newBalance !== undefined) {
                login({ ...user, walletBalance: refundRes.data.newBalance });
              }
            } catch (re) {}
          }
          enqueueSnackbar(res?.message || "Failed to place order. Please try again.", { variant: "error" });
        }
      }
    } catch (err) {
      if (paymentMethod === "wallet") {
        try {
          const refundRes = await post("/users/addMoney", { amount: totalAmount });
          if (refundRes?.data?.newBalance !== undefined) {
            login({ ...user, walletBalance: refundRes.data.newBalance });
          }
        } catch (re) {}
      }
      enqueueSnackbar(err?.message || "Failed to place order. Please try again.", { variant: "error" });
    } finally {
      setOrderSubmitting(false);
    }
  };

  // 12. Admin Actions: Add Dish
  const handleAddDishSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.itemname.trim() || !addForm.price) {
      enqueueSnackbar("Please fill in Dish Name and Price", { variant: "warning" });
      return;
    }
    if (!addImageFile) {
      enqueueSnackbar("Please select an image for the dish", { variant: "warning" });
      return;
    }

    setAddDishLoading(true);
    try {
      const fd = new FormData();
      fd.append("itemname", addForm.itemname.trim().toLowerCase());
      fd.append("price", String(addForm.price));
      fd.append("originalPrice", String(addForm.originalPrice || addForm.price));
      fd.append("category", addForm.category);
      fd.append("stock", String(Math.max(0, Number(addForm.stock || 0))));
      fd.append("offer", String(Math.max(0, Number(addForm.offer || 0))));
      fd.append("isVeg", String(addForm.isVeg));
      fd.append("description", addForm.description || "");
      fd.append("image", addImageFile);

      const res = await postForm("/food/addItem", fd);
      if (res && (res.status === 200 || res.success)) {
        enqueueSnackbar("Product added successfully!", { variant: "success" });
        setAddDishOpen(false);
        setAddForm({ itemname: "", originalPrice: "", price: "", category: "BreakFast", stock: 20, offer: 0, isVeg: true, description: "" });
        setAddImageFile(null);
        await fetchFoods();
      } else {
        enqueueSnackbar(res?.message || "Failed to add product", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err?.message || "Error adding product", { variant: "error" });
    } finally {
      setAddDishLoading(false);
    }
  };

  // 13. Admin Actions: Edit Dish
  const openEditDialog = (food) => {
    setEditingDish(food);
    const orig = food.originalPrice && food.originalPrice > 0 
      ? food.originalPrice 
      : (food.offer > 0 ? Math.round(food.price / (1 - food.offer / 100)) : food.price);
    setEditForm({
      itemname: food.itemname,
      originalPrice: String(orig || food.price),
      price: String(food.price),
      category: food.category || "BreakFast",
      stock: food.stock !== undefined ? food.stock : 0,
      offer: food.offer !== undefined ? food.offer : 0,
      isVeg: food.isVeg !== undefined ? Boolean(food.isVeg) : checkIsVeg(food),
    });
    setEditImageFile(null);
    setEditImagePreview(food.image || null);
    setEditDishOpen(true);
  };

  const handleEditDishSubmit = async (e) => {
    e.preventDefault();
    if (!editingDish) return;

    setEditDishLoading(true);
    try {
      const fd = new FormData();
      fd.append("id", editingDish._id);
      fd.append("itemname", editForm.itemname.trim().toLowerCase());
      fd.append("price", String(editForm.price));
      fd.append("originalPrice", String(editForm.originalPrice || editForm.price));
      fd.append("category", editForm.category);
      fd.append("stock", String(editForm.stock || 0));
      fd.append("offer", String(Math.max(0, Number(editForm.offer || 0))));
      fd.append("isVeg", String(editForm.isVeg));
      if (editImageFile) fd.append("image", editImageFile);

      const res = await postForm("/food/updateItem", fd);
      if (res && (res.status === 200 || res.success)) {
        enqueueSnackbar("Product updated successfully!", { variant: "success" });
        setEditDishOpen(false);
        setEditingDish(null);
        await fetchFoods();
      } else {
        enqueueSnackbar(res?.message || "Failed to update product", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err?.message || "Error updating product", { variant: "error" });
    } finally {
      setEditDishLoading(false);
    }
  };

  // 13b. Admin Actions: Toggle Out of Stock / Restock
  const handleToggleStock = async (food) => {
    if (!food) return;
    const isCurrentlyInStock = Number(food.stock || 0) > 0;
    const newStock = isCurrentlyInStock ? 0 : 25;
    try {
      const fd = new FormData();
      fd.append("id", food._id);
      fd.append("itemname", food.itemname);
      fd.append("price", String(food.price));
      fd.append("category", food.category || "BreakFast");
      fd.append("stock", String(newStock));
      if (food.offer !== undefined) fd.append("offer", String(food.offer));
      if (food.isVeg !== undefined) fd.append("isVeg", String(food.isVeg));

      const res = await postForm("/food/updateItem", fd);
      if (res && (res.status === 200 || res.success)) {
        enqueueSnackbar(
          isCurrentlyInStock
            ? `"${food.itemname}" marked as Out of Stock`
            : `"${food.itemname}" restocked (25 units)`,
          { variant: isCurrentlyInStock ? "warning" : "success" }
        );
        await fetchFoods();
      } else {
        enqueueSnackbar(res?.message || "Failed to update stock", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err?.message || "Error updating stock", { variant: "error" });
    }
  };

  // 14. Admin Actions: Delete Dish
  const openDeleteDialog = (food) => {
    setDishToDelete(food);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!dishToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await post("/food/removeItem", { itemname: dishToDelete.itemname });
      if (res && (res.status === 200 || res.success)) {
        enqueueSnackbar(`"${dishToDelete.itemname}" removed from menu`, { variant: "success" });
        setDeleteConfirmOpen(false);
        setDishToDelete(null);
        await fetchFoods();
      } else {
        enqueueSnackbar(res?.message || "Failed to remove product", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err?.message || "Error removing product", { variant: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  // 14b. Admin Actions: Category Add & Remove
  const handleAddCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      enqueueSnackbar("Please enter a category name", { variant: "warning" });
      return;
    }
    setAddCategoryLoading(true);
    try {
      const res = await post("/category/add", {
        name: newCategoryName.trim(),
        label: newCategoryName.trim(),
        icon: newCategoryIcon,
      });
      if (res && (res.status === 200 || res.status === 201 || res.success)) {
        enqueueSnackbar(`Category "${newCategoryName.trim()}" added successfully!`, { variant: "success" });
        setNewCategoryName("");
        setNewCategoryIcon("restaurant");
        setAddCategoryOpen(false);
        await fetchCategories();
      } else {
        enqueueSnackbar(res?.message || "Failed to add category", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || err?.message || "Error adding category", { variant: "error" });
    } finally {
      setAddCategoryLoading(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setDeleteCategoryLoading(true);
    try {
      const catName = categoryToDelete.name || categoryToDelete.id;
      const catId = categoryToDelete._id;
      const res = await post("/category/remove", {
        name: catName,
        id: catId,
      });
      if (res && (res.status === 200 || res.success)) {
        enqueueSnackbar(`Category "${categoryToDelete.label || catName}" removed successfully!`, { variant: "success" });
        if (selectedCategory.toLowerCase() === (catName || "").toLowerCase()) {
          setSelectedCategory("all");
        }
        setDeleteCatConfirmOpen(false);
        setCategoryToDelete(null);
        setDbCategories((prev) =>
          prev.filter(
            (c) =>
              (catId ? c._id !== catId : true) &&
              c.name.toLowerCase() !== catName.toLowerCase()
          )
        );
        await fetchCategories();
      } else {
        enqueueSnackbar(res?.message || "Failed to remove category", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || err?.message || "Error removing category", { variant: "error" });
    } finally {
      setDeleteCategoryLoading(false);
    }
  };

  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setEditCategoryName(cat.label || cat.name || "");
    setEditCategoryIcon(cat.icon || "restaurant");
    setEditCategoryOpen(true);
  };

  const handleEditCategorySubmit = async (e) => {
    e.preventDefault();
    const cleanName = editCategoryName.trim();
    if (!cleanName) {
      enqueueSnackbar("Please enter a category name", { variant: "warning" });
      return;
    }
    setEditCategoryLoading(true);
    try {
      const res = await post("/category/update", {
        id: editingCategory?._id || editingCategory?.id,
        name: cleanName,
        label: cleanName,
        icon: editCategoryIcon,
      });
      if (res && (res.status === 200 || res.success)) {
        enqueueSnackbar(`Category updated successfully!`, { variant: "success" });
        if (selectedCategory.toLowerCase() === (editingCategory?.name || "").toLowerCase()) {
          setSelectedCategory(cleanName);
        }
        setEditCategoryOpen(false);
        setEditingCategory(null);
        await fetchCategories();
        await fetchFoods();
      } else {
        enqueueSnackbar(res?.message || "Failed to update category", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || err?.message || "Error updating category", { variant: "error" });
    } finally {
      setEditCategoryLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        backgroundColor: "#f8fafc",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ============================================================ */}
      {/* LEFT SECTION: MAIN MENU CATALOG (Full-width for Admin)       */}
      {/* ============================================================ */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100%",
          p: { xs: 1.5, sm: 2 },
          pr: { xs: 1, sm: 1.5 },
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* FIXED HEADER: Search Bar & Category Filters (Stays fixed at the top) */}
        <Box sx={{ flexShrink: 0, display: "flex", flexDirection: "column" }}>
          {/* 1. Top Bar: Products Header, Search with ⌘ K, Filter Button, + Add Product */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 1.5 },
              mb: 2,
              flexShrink: 0,
            }}
          >
            {/* Search Input with ⌘ K badge */}
            <TextField
              fullWidth
              inputRef={searchInputRef}
              placeholder="Search products, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 21, ml: 0.5 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Box
                      onClick={() => searchInputRef.current?.focus()}
                      sx={{
                        display: { xs: "none", md: "flex" },
                        alignItems: "center",
                        gap: 0.3,
                        px: 0.9,
                        py: 0.3,
                        borderRadius: "8px",
                        backgroundColor: "#f1f5f9",
                        border: "1px solid #e2e8f0",
                        color: "#64748b",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      ⌘ K
                    </Box>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#ffffff",
                  borderRadius: "10px",
                  height: 44,
                  border: "1px solid #e2e8f0",
                  fontSize: "0.9rem",
                  boxShadow: "none",
                  "&:hover": { borderColor: "#cbd5e1" },
                  "&.Mui-focused": {
                    borderColor: "#3b82f6",
                    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                  },
                  "& fieldset": { border: "none" },
                },
              }}
            />

            {/* Filter Button with active indicator */}
            <Tooltip title="Filter by food type, ingredient & price range">
              <IconButton
                onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                sx={{
                  backgroundColor: hasActiveFilters ? "#eff6ff" : "#ffffff",
                  border: hasActiveFilters ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
                  borderRadius: "10px",
                  width: 44,
                  height: 44,
                  color: hasActiveFilters ? "#2563eb" : "#64748b",
                  boxShadow: "none",
                  flexShrink: 0,
                  "&:hover": { backgroundColor: hasActiveFilters ? "#dbeafe" : "#f1f5f9", color: "#0f172a" },
                }}
              >
                <Badge
                  badgeContent={activeFilterCount}
                  invisible={!hasActiveFilters}
                  sx={{
                    "& .MuiBadge-badge": {
                      backgroundColor: "#2563eb",
                      color: "white",
                      fontSize: "0.68rem",
                      height: 16,
                      minWidth: 16,
                      fontWeight: 800,
                    },
                  }}
                >
                  <TuneRoundedIcon sx={{ fontSize: 20 }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* STUDENT ONLY: Open Cart Button (Visible in top bar when cart is collapsed) */}
            {!isAdminOrStaff && cartCollapsed && (
              <Button
                variant="outlined"
                onClick={() => setCartCollapsed(false)}
                startIcon={
                  <Badge
                    badgeContent={cart.length}
                    color="primary"
                    sx={{
                      "& .MuiBadge-badge": {
                        backgroundColor: "#2563eb",
                        color: "white",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                      },
                    }}
                  >
                    <ShoppingBagIcon sx={{ fontSize: 18 }} />
                  </Badge>
                }
                sx={{
                  borderColor: "#e2e8f0",
                  color: "#2563eb",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  height: 44,
                  borderRadius: "10px",
                  px: 1.8,
                  textTransform: "none",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  "&:hover": { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                Cart {cart.length > 0 ? `(${cart.length})` : ""}
              </Button>
            )}

            {/* ADMIN ONLY: Add Dish Button & Add Category Button */}
            {isAdminOrStaff && (
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                <Button
                  variant="contained"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => setAddDishOpen(true)}
                  sx={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    height: 44,
                    borderRadius: "10px",
                    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.2)",
                    px: 2,
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    "&:hover": { backgroundColor: "#1d4ed8" },
                  }}
                >
                  Add Product
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => setAddCategoryOpen(true)}
                  sx={{
                    borderColor: "#e2e8f0",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    height: 44,
                    borderRadius: "10px",
                    px: 1.8,
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    backgroundColor: "#ffffff",
                    "&:hover": { borderColor: "#2563eb", color: "#2563eb", backgroundColor: "#eff6ff" },
                  }}
                >
                  Add Category
                </Button>
              </Stack>
            )}
          </Box>

          {/* 2. Category Cards Row (All, Breakfast, Burgers, Beverages, etc.) */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
              flexShrink: 0,
              position: "relative",
              width: "100%",
            }}
          >
            {/* Left Navigation Chevron Button (flex-start) */}
            <IconButton
              size="small"
              onClick={() => categoryScrollRef.current?.scrollBy({ left: -220, behavior: "smooth" })}
              sx={{
                flexShrink: 0,
                width: 34,
                height: 34,
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                color: "#64748b",
                borderRadius: "10px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                "&:hover": { backgroundColor: "#f8fafc", color: "#0f172a", borderColor: "#cbd5e1" },
                display: { xs: "none", sm: "flex" },
              }}
            >
              <ChevronLeftRoundedIcon fontSize="small" />
            </IconButton>

            {/* In Between: Scrollable Category Cards */}
            <Box
              ref={categoryScrollRef}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                overflowX: "auto",
                pb: 0.8,
                pt: 0.2,
                flex: 1,
                minWidth: 0,
                scrollBehavior: "smooth",
                "&::-webkit-scrollbar": { display: "none" },
                scrollbarWidth: "none",
              }}
            >
              {categoriesList.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
                const emoji = getCategoryVisual(cat.icon, cat.name || cat.label);

                return (
                  <Box
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1,
                      height: 40,
                      pl: 0.6,
                      pr: isAdminOrStaff && cat.id !== "all" ? 1 : 2,
                      borderRadius: "9999px",
                      cursor: "pointer",
                      backgroundColor: isSelected ? "#2563eb" : "#ffffff",
                      color: isSelected ? "#ffffff" : "#475569",
                      border: isSelected ? "1px solid #2563eb" : "1px solid #e2e8f0",
                      boxShadow: isSelected
                        ? "0 3px 10px rgba(37, 99, 235, 0.25)"
                        : "0 1px 2px rgba(0,0,0,0.02)",
                      transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                      userSelect: "none",
                      flexShrink: 0,
                      position: "relative",
                      "&:hover": {
                        transform: "translateY(-1px)",
                        backgroundColor: isSelected ? "#1d4ed8" : "#f8fafc",
                        borderColor: isSelected ? "#1d4ed8" : "#cbd5e1",
                        color: isSelected ? "#ffffff" : "#0f172a",
                        boxShadow: isSelected
                          ? "0 4px 14px rgba(37, 99, 235, 0.32)"
                          : "0 2px 6px rgba(0,0,0,0.04)",
                      },
                    }}
                  >
                    {/* Circular Disc for Icon */}
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        backgroundColor: isSelected ? "rgba(255, 255, 255, 0.22)" : "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: "16px",
                        lineHeight: 1,
                      }}
                    >
                      {emoji}
                    </Box>

                    {/* Category Label */}
                    <Typography
                      sx={{
                        fontWeight: isSelected ? 700 : 600,
                        fontSize: "0.88rem",
                        color: "inherit",
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {cat.label}
                    </Typography>

                    {/* Admin Edit & Delete Actions */}
                    {isAdminOrStaff && cat.id !== "all" && (
                      <Stack direction="row" spacing={0.3} sx={{ ml: 0.4, alignItems: "center" }}>
                        <Tooltip title={`Edit "${cat.label}"`} arrow>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditCategory(cat);
                            }}
                            sx={{
                              width: 22,
                              height: 22,
                              backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : "#f1f5f9",
                              color: isSelected ? "#ffffff" : "#2563eb",
                              "&:hover": {
                                backgroundColor: isSelected ? "rgba(255,255,255,0.35)" : "#e2e8f0",
                              },
                              p: 0,
                            }}
                          >
                            <EditRoundedIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title={`Remove "${cat.label}"`} arrow>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCategoryToDelete(cat);
                              setDeleteCatConfirmOpen(true);
                            }}
                            sx={{
                              width: 22,
                              height: 22,
                              backgroundColor: isSelected ? "rgba(239,68,68,0.85)" : "#fee2e2",
                              color: isSelected ? "#ffffff" : "#ef4444",
                              "&:hover": {
                                backgroundColor: "#ef4444",
                                color: "#ffffff",
                              },
                              p: 0,
                            }}
                          >
                            <CloseRoundedIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </Box>
                );
              })}

              {/* Admin "+ Add Category" Pill */}
              {isAdminOrStaff && (
                <Box
                  onClick={() => setAddCategoryOpen(true)}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.8,
                    height: 40,
                    pl: 0.8,
                    pr: 1.8,
                    borderRadius: "9999px",
                    cursor: "pointer",
                    backgroundColor: "#ffffff",
                    border: "1.5px dashed #cbd5e1",
                    color: "#64748b",
                    transition: "all 0.18s ease",
                    userSelect: "none",
                    flexShrink: 0,
                    "&:hover": {
                      transform: "translateY(-1px)",
                      borderColor: "#2563eb",
                      color: "#2563eb",
                      backgroundColor: "#eff6ff",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      backgroundColor: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "inherit",
                    }}
                  >
                    <AddRoundedIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.84rem",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Add Category
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Right Navigation Chevron Button (flex-end) */}
            <IconButton
              size="small"
              onClick={() => categoryScrollRef.current?.scrollBy({ left: 220, behavior: "smooth" })}
              sx={{
                flexShrink: 0,
                width: 34,
                height: 34,
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                color: "#64748b",
                borderRadius: "10px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                "&:hover": { backgroundColor: "#f8fafc", color: "#0f172a", borderColor: "#cbd5e1" },
                display: { xs: "none", sm: "flex" },
              }}
            >
              <ChevronRightRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* SCROLLABLE ITEMS CONTAINER: Only this item grid scrolls */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            pr: { xs: 0.5, sm: 1 },
            pt: 0.5,
            pb: 3,
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#cbd5e1",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              backgroundColor: "#94a3b8",
            },
          }}
        >
          {/* 3. Food Products Grid (Responsive auto-fill prevents card stretching on cart collapse) */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(auto-fill, minmax(180px, 1fr))",
                sm: "repeat(auto-fill, minmax(210px, 1fr))",
                md: "repeat(auto-fill, minmax(230px, 1fr))",
                lg: "repeat(auto-fill, minmax(240px, 1fr))",
              },
              gap: 2,
              alignItems: "start",
              alignContent: "start",
              mb: 2,
            }}
          >
            {loadingFoods ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <Box
                  key={idx}
                  sx={{
                    backgroundColor: "#ffffff",
                    borderRadius: "14px",
                    p: 1.5,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Skeleton variant="rounded" width="100%" height={145} sx={{ borderRadius: "10px", mb: 1.2 }} />
                  <Skeleton variant="text" width="75%" height={22} />
                  <Skeleton variant="text" width="40%" height={18} sx={{ mb: 1 }} />
                  <Skeleton variant="rounded" width="100%" height={38} sx={{ borderRadius: "10px" }} />
                </Box>
              ))
            ) : filteredFoods.length === 0 ? (
              <Box sx={{ gridColumn: "1 / -1", textAlign: "center", py: 8 }}>
                <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", mb: 1 }}>
                  No dishes found
                </Typography>
                <Typography sx={{ color: "#94a3b8", fontSize: "0.88rem" }}>
                  Try adjusting your search or resetting active filters.
                </Typography>
                {hasActiveFilters && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleResetFilters}
                    sx={{ mt: 2, textTransform: "none", borderRadius: "10px", borderColor: "#e2e8f0", color: "#2563eb" }}
                  >
                    Reset Filters
                  </Button>
                )}
              </Box>
            ) : (
              filteredFoods.map((food) => {
                const qtyInCart = getItemCartQty(food._id);
                const isInCart = qtyInCart > 0;
                const isVeg = checkIsVeg(food);
                const imageUrl = food.image || getFallbackImage(food.itemname);
                const stock = Number(food.stock || 0);

                let avg = 0;
                let totalCount = 0;
                if (Array.isArray(food.ratings) && food.ratings.length > 0) {
                  const sum = food.ratings.reduce((s, r) => s + (Number(r.rating) || 0), 0);
                  avg = sum / food.ratings.length;
                  totalCount = food.ratings.length;
                } else if (typeof food.averageRating === "number" && food.averageRating > 0 && typeof food.totalRatings === "number" && food.totalRatings > 0) {
                  avg = food.averageRating;
                  totalCount = food.totalRatings;
                }
                const foodAvgRating = totalCount > 0 && avg > 0 ? (Math.round(avg * 10) / 10).toFixed(1) : null;
                const foodTotalRatings = totalCount;

                const myRatingObj = Array.isArray(food.ratings)
                  ? food.ratings.find(
                      (r) =>
                        r.user &&
                        (String(r.user._id || r.user) === String(user?._id) ||
                          (user?.username && String(r.user?.username || "").toLowerCase() === String(user?.username).toLowerCase()))
                    )
                  : null;
                const myRating = myRatingObj ? Number(myRatingObj.rating) : 0;

                const origPrice = food.originalPrice && food.originalPrice > food.price 
                  ? food.originalPrice 
                  : (food.offer > 0 ? Math.round(food.price / (1 - food.offer / 100)) : 0);

                return (
                  <Box
                    key={food._id}
                    sx={{
                      backgroundColor: "#ffffff",
                      borderRadius: "14px",
                      p: 1.5,
                      border: !isAdminOrStaff && isInCart ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                      boxShadow: !isAdminOrStaff && isInCart
                        ? "0 4px 14px rgba(37, 99, 235, 0.12)"
                        : "0 1px 3px rgba(0,0,0,0.03)",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                        borderColor: !isAdminOrStaff && isInCart ? "#2563eb" : "#cbd5e1",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    {/* Top Image Container */}
                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        height: 145,
                        borderRadius: "10px",
                        overflow: "hidden",
                        mb: 1.2,
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      {/* Discount Tag (Top-Left) */}
                      {Number(food.offer || 0) > 0 && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            backgroundColor: "#fef3c7",
                            color: "#b45309",
                            border: "1px solid #fde68a",
                            fontWeight: 800,
                            fontSize: "0.72rem",
                            px: 1,
                            py: 0.3,
                            borderRadius: "6px",
                            zIndex: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.3,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                          }}
                        >
                          <SellOutlinedIcon sx={{ fontSize: 13 }} />
                          {Number(food.offer)}% OFF
                        </Box>
                      )}

                      {/* Stock Pill Badge (Top-Right) */}
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          backgroundColor: stock > 0 ? "rgba(15, 23, 42, 0.72)" : "#ef4444",
                          backdropFilter: "blur(4px)",
                          color: "#ffffff",
                          fontWeight: 700,
                          fontSize: "0.7rem",
                          px: 1,
                          py: 0.3,
                          borderRadius: "100px",
                          zIndex: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 0.3,
                        }}
                      >
                        <Inventory2OutlinedIcon sx={{ fontSize: 12 }} />
                        {stock > 0 ? `${stock} left` : "Out of stock"}
                      </Box>

                      {/* Food Image */}
                      <Box
                        component="img"
                        src={imageUrl}
                        alt={food.itemname}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </Box>

                    {/* Food Content */}
                    <Box sx={{ mb: 1, flex: 1, display: "flex", flexDirection: "column" }}>
                      {/* Row 1: Name on Left, Category + Restaurant Veg/Non-Veg icon TOGETHER on Right */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 0.6,
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "1.02rem",
                            color: "#0f172a",
                            lineHeight: 1.25,
                            textTransform: "capitalize",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            pr: 1,
                          }}
                        >
                          {food.itemname}
                        </Typography>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, flexShrink: 0 }}>
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              px: 0.8,
                              py: 0.2,
                              borderRadius: "6px",
                              backgroundColor: "#f1f5f9",
                              color: "#475569",
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              textTransform: "capitalize",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {food.category || "General"}
                          </Box>
                          <RestaurantVegIcon isVeg={isVeg} size={15} />
                        </Box>
                      </Box>

                      {/* Row 2: Stars (Left) & Average Rating (Right) */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          py: 0.2,
                          mb: 0.6,
                          minHeight: 26,
                        }}
                      >
                        {/* Left: Read-only avg stars for Admin/Staff; Interactive stars for Students */}
                        {isAdminOrStaff ? (
                          <Tooltip
                            title={
                              foodTotalRatings > 0
                                ? `Average: ${foodAvgRating} ★ (${foodTotalRatings} reviews)`
                                : "No ratings yet"
                            }
                            arrow
                            placement="top"
                          >
                            <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                              <Rating
                                name={`avg-food-${food._id}`}
                                value={foodAvgRating ? Number(foodAvgRating) : 0}
                                precision={0.5}
                                readOnly
                                size="small"
                                sx={{
                                  color: "#f59e0b",
                                  fontSize: "1.1rem",
                                  "& .MuiRating-iconEmpty": { color: "#cbd5e1" },
                                }}
                              />
                            </Box>
                          </Tooltip>
                        ) : (
                          <Tooltip
                            title={myRating > 0 ? `Your rating: ${myRating} ★ (Click to change)` : "Click a star to rate"}
                            arrow
                            placement="top"
                          >
                            <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                              <Rating
                                name={`rate-food-${food._id}`}
                                value={myRating}
                                precision={1}
                                onChange={(e, val) => handleDirectRate(food, val, e)}
                                size="small"
                                sx={{
                                  color: "#f59e0b",
                                  fontSize: "1.1rem",
                                  "& .MuiRating-iconEmpty": { color: "#cbd5e1" },
                                }}
                              />
                            </Box>
                          </Tooltip>
                        )}

                        {/* Right: Average rating chip */}
                        <Box
                          onClick={(e) => !isAdminOrStaff && openRatingDialog(food, e)}
                          sx={{
                            cursor: isAdminOrStaff ? "default" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            px: 0.6,
                            py: 0.2,
                            borderRadius: "6px",
                            transition: "background-color 0.15s ease",
                            "&:hover": { backgroundColor: isAdminOrStaff ? "transparent" : "#f1f5f9" },
                          }}
                        >
                          {foodTotalRatings > 0 ? (
                            <Typography
                              sx={{
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                color: "#1e293b",
                                display: "flex",
                                alignItems: "center",
                                gap: 0.3,
                              }}
                            >
                              <StarRoundedIcon sx={{ color: "#f59e0b", fontSize: 15 }} />
                              {foodAvgRating}
                              <Box component="span" sx={{ color: "#64748b", fontWeight: 500, fontSize: "0.72rem" }}>
                                ({foodTotalRatings})
                              </Box>
                            </Typography>
                          ) : (
                            <Typography sx={{ fontSize: "0.74rem", fontWeight: 600, color: "#94a3b8" }}>
                              No ratings
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {/* Row 3: Price */}
                      <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.8, mt: "auto", pt: 0.4 ,justifyContent:"space-between" }}>
                        <Typography sx={{ fontWeight: 800, fontSize: "1.25rem", color: "#0f172a" }}>
                          ₹{Number(food.price || 0).toFixed(0)}
                        </Typography>
                        {origPrice > food.price && (
                          <Typography
                            sx={{
                              fontWeight: 500,
                              fontSize: "0.88rem",
                              color: "#94a3b8",
                              textDecoration: "line-through",
                            }}
                          >
                            ₹{Number(origPrice).toFixed(0)}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Bottom Actions — Different per role, SAME card height & structure */}
                    {isAdminOrStaff ? (
                      /* ADMIN / STAFF: Edit + Stock toggle + Delete */
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: 1,
                          mt: 0,
                        }}
                      >
                        <Tooltip title="Edit Dish" arrow>
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(food)}
                            sx={{
                              width: "100%",
                              height: 36,
                              backgroundColor: "#eff6ff",
                              color: "#2563eb",
                              border: "1px solid #bfdbfe",
                              borderRadius: "10px",
                              "&:hover": { backgroundColor: "#dbeafe" },
                            }}
                          >
                            <EditRoundedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title={stock > 0 ? "Mark as Out of Stock" : "Restock (25 items)"} arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleStock(food)}
                            sx={{
                              width: "100%",
                              height: 36,
                              backgroundColor: stock > 0 ? "#fff7ed" : "#eff6ff",
                              color: stock > 0 ? "#ea580c" : "#2563eb",
                              border: stock > 0 ? "1px solid #fed7aa" : "1px solid #bfdbfe",
                              borderRadius: "10px",
                              "&:hover": {
                                backgroundColor: stock > 0 ? "#ffedd5" : "#dbeafe",
                              },
                            }}
                          >
                            {stock > 0 ? (
                              <RemoveShoppingCartRoundedIcon sx={{ fontSize: 18 }} />
                            ) : (
                              <AddShoppingCartRoundedIcon sx={{ fontSize: 18 }} />
                            )}
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete Dish" arrow>
                          <IconButton
                            size="small"
                            onClick={() => openDeleteDialog(food)}
                            sx={{
                              width: "100%",
                              height: 36,
                              backgroundColor: "#fef2f2",
                              color: "#ef4444",
                              border: "1px solid #fee2e2",
                              borderRadius: "10px",
                              "&:hover": { backgroundColor: "#fee2e2" },
                            }}
                          >
                            <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      /* STUDENT: Add to cart button or qty stepper */
                      !isInCart ? (
                        <Tooltip title={stock > 0 ? "Add to cart" : "Out of stock"} arrow>
                          <span style={{ width: "100%" }}>
                            <IconButton
                              onClick={() => handleAddToDish(food)}
                              disabled={stock <= 0}
                              sx={{
                                width: "100%",
                                height: 38,
                                backgroundColor: stock > 0 ? "#2563eb" : "#94a3b8",
                                color: "#ffffff",
                                borderRadius: "10px",
                                boxShadow: stock > 0 ? "0 2px 6px rgba(37,99,235,0.22)" : "none",
                                "&:hover": {
                                  backgroundColor: stock > 0 ? "#1d4ed8" : "#94a3b8",
                                  boxShadow: stock > 0 ? "0 4px 12px rgba(37,99,235,0.32)" : "none",
                                },
                                "&.Mui-disabled": {
                                  backgroundColor: "#94a3b8",
                                  color: "#e2e8f0",
                                },
                              }}
                            >
                              <AddShoppingCartRoundedIcon sx={{ fontSize: 19 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            height: 38,
                            backgroundColor: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "10px",
                            px: 1,
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateQty(food._id, -1)}
                            sx={{
                              backgroundColor: "#2563eb",
                              color: "#ffffff",
                              width: 26,
                              height: 26,
                              borderRadius: "8px",
                              "&:hover": { backgroundColor: "#1d4ed8" },
                            }}
                          >
                            <RemoveRoundedIcon sx={{ fontSize: 15 }} />
                          </IconButton>

                          <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                            {qtyInCart}
                          </Typography>

                          <IconButton
                            size="small"
                            onClick={() => handleUpdateQty(food._id, 1)}
                            disabled={qtyInCart >= stock}
                            sx={{
                              backgroundColor: "#2563eb",
                              color: "#ffffff",
                              width: 26,
                              height: 26,
                              borderRadius: "8px",
                              "&:hover": { backgroundColor: "#1d4ed8" },
                            }}
                          >
                            <AddRoundedIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Box>
                      )
                    )}
                  </Box>
                );
              })
            )}
          </Box>
        </Box>
      </Box>

      {/* ============================================================ */}
      {/* RIGHT SECTION: TABLE & CART PANEL (Visible to Students Only) */}
      {/* ============================================================ */}
      {!isAdminOrStaff && (
        <>
       

          {/* Cart Panel — sits directly against the menu catalog with NO gap */}
          <Box
            sx={{
              width: cartCollapsed ? 0 : { xs: "100%", md: 380, lg: 410 },
              minWidth: cartCollapsed ? 0 : { xs: "100%", md: 380, lg: 410 },
              overflow: "hidden",
              transition: "width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1)",
              backgroundColor: "#ffffff",
              borderLeft: cartCollapsed ? "none" : "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              boxShadow: cartCollapsed ? "none" : "-4px 0 24px rgba(0,0,0,0.02)",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
          >
            <Box
              sx={{
                p: { xs: 1.8, sm: 2 },
                display: "flex",
                flexDirection: "column",
                height: "100%",
                width: { xs: "100%", md: 380, lg: 410 },
                boxSizing: "border-box",
              }}
            >
              {/* Table Header & Actions (Table Switcher + Collapse Button inside Cart at top like sidebar) */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  pb: 1.8,
                  borderBottom: "1px solid #f1f5f9",
                  flexShrink: 0,
                }}
              >
                <Box sx={{ minWidth: 0, pr: 1 }}>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: "1.18rem",
                      color: "#0f172a",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {activeTable ? activeTable.tableName : (user?.rollNo ? ` ${user.rollNo.toUpperCase()}` : "Collaborative Table")}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ flexShrink: 0 }}>
                  <Tooltip title={activeTable ? "Table Options / Switch Table" : "Create or Join Table"} arrow>
                    <IconButton
                      onClick={() => setTableModalOpen(true)}
                      sx={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        width: 38,
                        height: 38,
                        color: "#0f172a",
                        "&:hover": { backgroundColor: "#e2e8f0" },
                      }}
                    >
                      <EditRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>

                  {/* Sidebar Collapse Button — inside the cart at top */}
                  <Tooltip title="Collapse Cart" arrow>
                    <IconButton
                      onClick={() => setCartCollapsed(true)}
                      sx={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        width: 38,
                        height: 38,
                        color: "#64748b",
                        "&:hover": { backgroundColor: "#fee2e2", color: "#ef4444", borderColor: "#fecaca" },
                      }}
                    >
                      <ChevronRightRoundedIcon sx={{ fontSize: 22 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

          {/* Active Members Status Badge */}
          {activeTable && (
            <Box
              sx={{
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "12px",
                p: 1.2,
                my: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <GroupRoundedIcon sx={{ color: "#16a34a", fontSize: 20 }} />
                <Box>
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#15803d" }}>
                    {activeTable.members.length} {activeTable.members.length === 1 ? "Person" : "People"} at Table ({activeTable.tableId})
                  </Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: "#166534" }}>
                    {joinedMembersList.length === 0
                      ? "Solo session • Ready to order"
                      : `${readyJoinedCount}/${joinedMembersList.length} Ready to Order`}
                  </Typography>
                </Box>
              </Box>
              <Button
                size="small"
                onClick={handleLeaveTable}
                sx={{
                  fontSize: "0.72rem",
                  color: "#dc2626",
                  textTransform: "none",
                  fontWeight: 700,
                  minWidth: 0,
                  p: 0.5,
                }}
              >
                Leave
              </Button>
            </Box>
          )}

          {/* Order Type Switcher (Order Now vs Pre-Order) */}
          <Box sx={{ flexShrink: 0 }}>
            {isJoinedMember ? (
              <></>
            ) : (
              /* Creator or Solo User View: Interactive Switcher */
              <Box
                sx={{
                  display: "flex",
                  backgroundColor: "#f1f5f9",
                  borderRadius: "12px",
                  p: 0.5,
                }}
              >
                {[
                  { id: "now", label: "Order Now" },
                  { id: "pre", label: "Pre-Order" },
                ].map((tab) => {
                  const isSelected = effectiveOrderMode === tab.id;
                  return (
                    <Box
                      key={tab.id}
                      onClick={async () => {
                        setOrderMode(tab.id);
                        if (activeTable && isTableCreator) {
                          try {
                            const res = await updateTableOrderType(activeTable.tableId, tab.id);
                            if (res && res.data) {
                              setActiveTable(res.data);
                            }
                          } catch (err) {
                            console.warn("Order type update notice:", err);
                          }
                        }
                      }}
                      sx={{
                        flex: 1,
                        textAlign: "center",
                        py: 0.9,
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        backgroundColor: isSelected ? "#ffffff" : "transparent",
                        color: isSelected ? "#2563eb" : "#64748b",
                        boxShadow: isSelected ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                        transition: "all 0.15s ease",
                        userSelect: "none",
                        "&:hover": {
                          color: isSelected ? "#2563eb" : "#0f172a",
                        },
                      }}
                    >
                      {tab.label}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Cart Items List */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              pr: 0.5,
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": { backgroundColor: "#e2e8f0", borderRadius: "4px" },
            }}
          >
            {cartItems.length === 0 && (!activeTable || tableActiveUsers.length === 0) ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography sx={{ color: "#0f172a", fontWeight: 700, fontSize: "0.95rem", mb: 0.5 }}>
                  Your order is empty
                </Typography>
                <Typography sx={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                  Select items from the menu to build your table order.
                </Typography>
              </Box>
            ) : activeTable ? (
              /* Collaborative Table: Show USNs and Name of active users one below the other with Accordion */
              <Stack spacing={1.5}>
                {tableActiveUsers.map((member) => {
                  const mUser = String(member.username || "").toLowerCase();
                  const mName = member.name || member.username;
                  const isHost = mUser === String(activeTable.creator || "").toLowerCase();
                  const isSelf = mUser === String(currentUsername || "").toLowerCase();

                  // Items added by this active user
                  const memberItems = (activeTable.items || []).filter(
                    (it) => String(it.addedBy?.username || "").toLowerCase() === mUser
                  );
                  const itemCount = memberItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
                  const memberSubtotal = memberItems.reduce(
                    (acc, it) => acc + (Number(it.price || 0) * (it.quantity || 1)),
                    0
                  );
                  const hasItems = memberItems.length > 0;
                  const readyStatus = isMemberReady(member);

                  // Accordion expanded state: open by default if user has items or is self or host
                  const isExpanded =
                    expandedUsers[mUser] !== undefined ? expandedUsers[mUser] : true;

                  return (
                    <Box
                      key={mUser}
                      sx={{
                        borderRadius: "16px",
                        border: "1.5px solid #e2e8f0",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                        overflow: "hidden",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {/* Active User Accordion Header */}
                      <Box
                        onClick={() => toggleUserAccordion(mUser)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          p: 1.3,
                          backgroundColor: isExpanded ? "#f8fafc" : "#ffffff",
                          cursor: "pointer",
                          userSelect: "none",
                          transition: "background-color 0.15s ease",
                          "&:hover": {
                            backgroundColor: "#f1f5f9",
                          },
                        }}
                      >
                        {/* Left: Avatar + USN / Name */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0 }}>
                          {(() => {
                            const mAvatar =
                              member.avatar ||
                              (isSelf && user?.avatar ? user.avatar : "") ||
                              (isHost && activeTable?.creatorAvatar ? activeTable.creatorAvatar : "") ||
                              "";

                            return (
                              <Avatar
                                src={mAvatar || undefined}
                                alt={mName || mUser}
                                sx={{
                                  width: 38,
                                  height: 38,
                                  bgcolor: mAvatar ? "transparent" : isHost ? "#059669" : "#2563eb",
                                  fontSize: "0.82rem",
                                  fontWeight: 800,
                                  flexShrink: 0,
                                  border: mAvatar ? "1.5px solid #e2e8f0" : "none",
                                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                                  "& img": {
                                    objectFit: "cover",
                                  },
                                }}
                              >
                                {!mAvatar && (
                                  mName && isNaN(mName[0]) ? (
                                    mName[0].toUpperCase()
                                  ) : (
                                    <PersonRoundedIcon sx={{ fontSize: 20, color: "#ffffff" }} />
                                  )
                                )}
                              </Avatar>
                            );
                          })()}

                          <Box sx={{ minWidth: 0 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, flexWrap: "wrap" }}>
                              <Typography
                                sx={{
                                  fontWeight: 800,
                                  fontSize: "0.88rem",
                                  color: "#0f172a",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {mName}
                              </Typography>
                              {isHost && (
                                <Chip
                                  label="Host"
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.66rem",
                                    fontWeight: 800,
                                    bgcolor: "#ecfdf5",
                                    color: "#059669",
                                    border: "1px solid #a7f3d0",
                                  }}
                                />
                              )}
                              {isSelf && (
                                <Chip
                                  label="You"
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.66rem",
                                    fontWeight: 700,
                                    bgcolor: "#eff6ff",
                                    color: "#2563eb",
                                  }}
                                />
                              )}
                            </Box>

                            <Typography sx={{ fontSize: "0.74rem", color: "#000", fontWeight: 600, mt: 0.2 }}>
                              {hasItems
                                ? `${itemCount} ${itemCount === 1 ? "item" : "items"} • ₹${memberSubtotal.toFixed(2)}`
                                : "0 items added"}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Right: Status Pill & Accordion Expand Icon */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                          {isHost ? (
                            <Chip
                              label="Host"
                              size="small"
                              sx={{
                                height: 24,
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                bgcolor: "#ecfdf5",
                                color: "#059669",
                                border: "1px solid #a7f3d0",
                              }}
                            />
                          ) : !hasItems ? (
                            <Tooltip title="Member has not added items (by default counted as Continue)" arrow>
                              <Chip
                                label="Ready (No items)"
                                size="small"
                                sx={{
                                  height: 24,
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  bgcolor: "#f0fdf4",
                                  color: "#16a34a",
                                  border: "1px solid #bbf7d0",
                                }}
                              />
                            </Tooltip>
                          ) : readyStatus ? (
                            <Chip
                              label="Ready ✓"
                              size="small"
                              sx={{
                                height: 24,
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                bgcolor: "#dcfce7",
                                color: "#15803d",
                                border: "1px solid #86efac",
                              }}
                            />
                          ) : (
                            <Chip
                              label="Ordering..."
                              size="small"
                              sx={{
                                height: 24,
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                bgcolor: "#fef3c7",
                                color: "#b45309",
                                border: "1px solid #fde68a",
                              }}
                            />
                          )}

                          <KeyboardArrowDownRoundedIcon
                            sx={{
                              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 0.2s ease",
                              color: "#64748b",
                              fontSize: 22,
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Accordion Content: Items Added by this User */}
                      <Collapse in={isExpanded} timeout="auto">
                        <Box sx={{ p: 1.2, pt: 0.5, borderTop: isExpanded ? "1px solid #f1f5f9" : "none" }}>
                          {!hasItems ? (
                            <Box
                              sx={{
                                py: 2,
                                px: 2,
                                textAlign: "center",
                                bgcolor: "#f8fafc",
                                borderRadius: "12px",
                                border: "1px dashed #e2e8f0",
                                my: 0.5,
                              }}
                            >
                              <Typography sx={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>
                                No items added yet by {mName}
                              </Typography>
                           
                            </Box>
                          ) : (
                            <Stack spacing={1} sx={{ my: 0.5 }}>
                              {memberItems.map((item, idx) => {
                                const itemImg = item.image || getFallbackImage(item.itemname);
                                const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                                const isVeg = item.isVeg ?? true;

                                return (
                                  <Box
                                    key={item._id || `${item.foodId}-${idx}`}
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1.4,
                                      p: 1.2,
                                      borderRadius: "14px",
                                      border: "1px solid #f1f5f9",
                                      backgroundColor: "#ffffff",
                                      boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
                                    }}
                                  >
                                    <Box
                                      component="img"
                                      src={itemImg}
                                      alt={item.itemname}
                                      sx={{
                                        width: 50,
                                        height: 50,
                                        borderRadius: "10px",
                                        objectFit: "cover",
                                        backgroundColor: "#f8fafc",
                                        flexShrink: 0,
                                      }}
                                    />

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography
                                        sx={{
                                          fontWeight: 700,
                                          fontSize: "0.84rem",
                                          color: "#0f172a",
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          textTransform: "capitalize",
                                        }}
                                      >
                                        {item.itemname} {isVeg ? "(Veg)" : "(Non Veg)"}
                                      </Typography>

                                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.4 }}>
                                        <Typography sx={{ fontWeight: 800, fontSize: "0.84rem", color: "#059669" }}>
                                          ₹{Number(item.price || 0).toFixed(2)}
                                        </Typography>
                                        <Typography sx={{ fontSize: "0.9rem", fontWeight: 700 }}>
                                          {item.quantity}X
                                        </Typography>
                                      </Box>
                                    </Box>

                                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
                                      <Typography sx={{ fontWeight: 800, fontSize: "0.88rem", color: "#059669" }}>
                                        ₹{lineTotal.toFixed(2)}
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleRemoveItem(item._id, item.foodId)}
                                        sx={{ color: "#cbd5e1", p: 0.2, "&:hover": { color: "#ef4444" } }}
                                      >
                                        <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                                      </IconButton>
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Stack>
                          )}
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              /* Solo / Non-collaborative items list (NO added by chip) */
              <Stack spacing={1.2}>
                {cartItems.map((item, idx) => {
                  const itemImg = item.image || getFallbackImage(item.itemname);
                  const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                  const isVeg = item.isVeg ?? true;

                  return (
                    <Box
                      key={item._id || `${item.foodId}-${idx}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        p: 1.2,
                        borderRadius: "16px",
                        border: "1px solid #f1f5f9",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.01)",
                      }}
                    >
                      <Box
                        component="img"
                        src={itemImg}
                        alt={item.itemname}
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: "12px",
                          objectFit: "cover",
                          backgroundColor: "#f8fafc",
                          flexShrink: 0,
                        }}
                      />

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            color: "#0f172a",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            textTransform: "capitalize",
                          }}
                        >
                          {item.itemname} {isVeg ? "(Veg)" : "(Non Veg)"}
                        </Typography>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.3 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: "0.84rem", color: "#059669" }}>
                            ₹{Number(item.price || 0).toFixed(2)}
                          </Typography>
                          <Typography sx={{ fontSize: "0.76rem", color: "#94a3b8", fontWeight: 700 }}>
                            {item.quantity}X
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", color: "#059669" }}>
                          ₹{lineTotal.toFixed(2)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveItem(item._id, item.foodId)}
                          sx={{ color: "#cbd5e1", p: 0.2, "&:hover": { color: "#ef4444" } }}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>

          {/* Financials & Billing */}
          <Box sx={{ pt: 2, borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.8 }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 600 }}>Sub Total</Typography>
              <Typography sx={{ color: "#0f172a", fontSize: "0.88rem", fontWeight: 700 }}>
                ₹{subTotal.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.2 }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 600 }}>Tax 5%</Typography>
              <Typography sx={{ color: "#0f172a", fontSize: "0.88rem", fontWeight: 700 }}>
                ₹{taxAmount.toFixed(2)}
              </Typography>
            </Box>

            <Divider sx={{ borderStyle: "dashed", borderColor: "#e2e8f0", my: 1.2 }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography sx={{ color: "#0f172a", fontSize: "1.05rem", fontWeight: 800 }}>Total Amount</Typography>
              <Typography sx={{ color: "#0f172a", fontSize: "1.2rem", fontWeight: 800 }}>
                ₹{totalAmount.toFixed(2)}
              </Typography>
            </Box>

     

            {/* Payment Method Selector: ONLY visible to Table Creator or Solo Orders (NEVER visible to joined members) */}
            {!isJoinedMember && (!activeTable || isTableCreator) && (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.2, mb: 2 }}>
                {[
                  { id: "cash", label: "Cash", icon: PaymentsOutlinedIcon },
                  { id: "upi", label: "UPI", icon: QrCodeScannerRoundedIcon },
                  {
                    id: "wallet",
                    label: `Wallet (₹${Number(user?.walletBalance || 0).toFixed(0)})`,
                    icon: AccountBalanceWalletOutlinedIcon,
                  },
                ].map((p) => {
                  const isSelected = paymentMethod === p.id;
                  const IconComp = p.icon;
                  return (
                    <Box
                      key={p.id}
                      onClick={() => setPaymentMethod(p.id)}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        py: 1,
                        px: 0.5,
                        borderRadius: "10px",
                        cursor: "pointer",
                        border: isSelected ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                        backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <IconComp sx={{ fontSize: 20, color: isSelected ? "#2563eb" : "#64748b", mb: 0.3 }} />
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: isSelected ? "#2563eb" : "#64748b",
                          textAlign: "center",
                        }}
                      >
                        {p.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* Action Buttons: Joined Members ONLY see Continue button; Creator & Solo see Pay Button */}
            {isJoinedMember ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {/* <Typography sx={{ fontSize: "0.76rem", color: "#64748b", textAlign: "center", fontWeight: 600 }}>
                  {isCurrentUserReady
                    ? `You notified ${activeTable.creatorName}. Waiting for them to pay & place the order.`
                    : `Finished adding items? Click Continue to notify ${activeTable.creatorName}.`}
                </Typography> */}
                <Button
                  fullWidth
                  disabled={!currentUserHasItems}
                  onClick={handleToggleReady}
                  sx={{
                    backgroundColor: !currentUserHasItems
                      ? "#94a3b8"
                      : isCurrentUserReady
                      ? "#16a34a"
                      : "#2563eb",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    height: 46,
                    borderRadius: "10px",
                    textTransform: "none",
                    boxShadow: !currentUserHasItems ? "none" : "0 4px 14px rgba(37, 99, 235, 0.25)",
                    "&:hover": {
                      backgroundColor: !currentUserHasItems
                        ? "#94a3b8"
                        : isCurrentUserReady
                        ? "#15803d"
                        : "#1d4ed8",
                    },
                  }}
                >
                  {!currentUserHasItems
                    ? "Continue (Auto-ready: No items)"
                    : isCurrentUserReady
                    ? "Cart Ready ✓"
                    : "Continue (Notify Host)"}
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Button
                  fullWidth
                  disabled={
                    orderSubmitting ||
                    cartItems.length === 0 ||
                    Boolean(activeTable && isTableCreator && joinedMembersList.length > 0 && !allJoinedMembersReady)
                  }
                  onClick={handlePlaceOrder}
                  sx={{
                    backgroundColor:
                      activeTable && isTableCreator && joinedMembersList.length > 0 && !allJoinedMembersReady
                        ? "#94a3b8 !important"
                        : "#2563eb",
                    color: "#ffffff !important",
                    fontWeight: 700,
                    fontSize: "0.98rem",
                    height: 46,
                    borderRadius: "10px",
                    textTransform: "none",
                    boxShadow:
                      activeTable && isTableCreator && joinedMembersList.length > 0 && !allJoinedMembersReady
                        ? "none"
                        : "0 4px 14px rgba(37, 99, 235, 0.25)",
                    cursor:
                      activeTable && isTableCreator && joinedMembersList.length > 0 && !allJoinedMembersReady
                        ? "not-allowed !important"
                        : "pointer",
                    "&:hover": {
                      backgroundColor:
                        activeTable && isTableCreator && joinedMembersList.length > 0 && !allJoinedMembersReady
                          ? "#94a3b8"
                          : "#1d4ed8",
                    },
                  }}
                >
                  {orderSubmitting ? (
                    <CircularProgress size={24} sx={{ color: "white" }} />
                  ) : activeTable && isTableCreator && joinedMembersList.length > 0 && !allJoinedMembersReady ? (
                    `Waiting for Members (${readyJoinedCount}/${joinedMembersList.length} ready)`
                  ) : paymentMethod === "upi" ? (
                    "Pay with UPI"
                  ) : paymentMethod === "wallet" ? (
                    "Pay with Wallet"
                  ) : (
                    "Paid with Cash"
                  )}
                </Button>
              </Box>
            )}
              </Box>
            </Box>
          </Box>
        </>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADMIN ADD PRODUCT DIALOG                              */}
      {/* ============================================================ */}
      {isAdminOrStaff && (
        <Dialog
          open={addDishOpen}
          onClose={() => setAddDishOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}
        >
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a" }}>Add New Dish</Typography>
            <IconButton onClick={() => setAddDishOpen(false)} size="small">
              <CloseRoundedIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ pt: 1 }}>
            <Box component="form" onSubmit={handleAddDishSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Upside Image / Dropzone */}
              <Box
                onDragOver={(e) => {
                  e.preventDefault();
                  setAddIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setAddIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setAddIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0];
                    if (file.type.startsWith("image/")) {
                      setAddImageFile(file);
                    } else {
                      enqueueSnackbar("Please drop an image file (PNG, JPG, WEBP)", { variant: "warning" });
                    }
                  }
                }}
                onClick={() => addFileInputRef.current?.click()}
                sx={{
                  position: "relative",
                  width: "100%",
                  height: { xs: 160, sm: 195 },
                  borderRadius: "16px",
                  overflow: "hidden",
                  cursor: "pointer",
                  backgroundColor: addIsDragging ? "#f0fdf4" : "#f8fafc",
                  border: addImagePreview
                    ? addIsDragging
                      ? "2px dashed #059669"
                      : "1px solid #e2e8f0"
                    : addIsDragging
                    ? "2px dashed #059669"
                    : "2px dashed #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  "&:hover .image-hover-overlay": {
                    opacity: 1,
                  },
                }}
              >
                <input
                  ref={addFileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAddImageFile(e.target.files[0]);
                    }
                  }}
                />

                {addImagePreview ? (
                  <>
                    <Box
                      component="img"
                      src={addImagePreview}
                      alt="New Dish Preview"
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    {/* On hover only: show update image overlay */}
                    <Box
                      className="image-hover-overlay"
                      sx={{
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "rgba(15, 23, 42, 0.65)",
                        backdropFilter: "blur(2.5px)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        opacity: 0,
                        transition: "opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        color: "#ffffff",
                      }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          backgroundColor: "rgba(255, 255, 255, 0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1.5px solid rgba(255, 255, 255, 0.5)",
                        }}
                      >
                        <CloudUploadIcon sx={{ fontSize: 24, color: "#ffffff" }} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "#ffffff" }}>
                        Update Image
                      </Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                        Click or drag new image to replace
                      </Typography>
                    </Box>
                  </>
                ) : (
                  /* When no image: show Drop the image */
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      p: 2.5,
                      textAlign: "center",
                    }}
                  >
                    <Box
                      sx={{
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        backgroundColor: addIsDragging ? "#dcfce7" : "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: addIsDragging ? "#059669" : "#64748b",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <CloudUploadIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
                      Drop the image here
                    </Typography>
                
                  </Box>
                )}
              </Box>

              <TextField
                label="Dish Name"
                fullWidth
                size="small"
                required
                value={addForm.itemname}
                onChange={(e) => setAddForm({ ...addForm, itemname: e.target.value })}
                placeholder="e.g. Original Chess Meat Burger"
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Original Price / MRP (₹)"
                  type="number"
                  fullWidth
                  size="small"
                  value={addForm.originalPrice}
                  onChange={(e) => {
                    const newOrig = e.target.value;
                    const newOffer = calculateOfferPercent(newOrig, addForm.price);
                    setAddForm({ ...addForm, originalPrice: newOrig, offer: newOffer });
                  }}
                  placeholder="e.g. 260"
                />
                <TextField
                  label="Current / Selling Price (₹)"
                  type="number"
                  fullWidth
                  size="small"
                  required
                  value={addForm.price}
                  onChange={(e) => {
                    const newPrice = e.target.value;
                    const newOffer = calculateOfferPercent(addForm.originalPrice, newPrice);
                    setAddForm({ ...addForm, price: newPrice, offer: newOffer });
                  }}
                  placeholder="e.g. 200"
                />
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Discount Offer (%) [Auto]"
                  type="number"
                  fullWidth
                  size="small"
                  value={addForm.offer}
                  InputProps={{
                    readOnly: true,
                    endAdornment: addForm.offer > 0 ? (
                      <InputAdornment position="end">
                        <Chip label={`${addForm.offer}% OFF`} size="small" sx={{ bgcolor: "#fef08a", color: "#854d0e", fontWeight: 800 }} />
                      </InputAdornment>
                    ) : null,
                  }}
                  helperText={addForm.offer > 0 ? `Savings: ₹${Math.max(0, Number(addForm.originalPrice) - Number(addForm.price))}` : "Calculated from Original & Current price"}
                />
                <TextField
                  label="Category"
                  select
                  fullWidth
                  size="small"
                  value={addForm.category}
                  onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                >
                  {dbCategories.map((cat) => (
                    <MenuItem key={cat.name} value={cat.name}>
                      {cat.label || cat.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Stock Quantity"
                  type="number"
                  fullWidth
                  size="small"
                  value={addForm.stock}
                  onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })}
                  placeholder="20"
                />
              </Stack>

              <TextField
                label="Dietary Type"
                select
                fullWidth
                size="small"
                value={addForm.isVeg ? "veg" : "non-veg"}
                onChange={(e) => setAddForm({ ...addForm, isVeg: e.target.value === "veg" })}
              >
                <MenuItem value="veg">Vegetarian (Veg)</MenuItem>
                <MenuItem value="non-veg">Non-Vegetarian (Non-Veg)</MenuItem>
              </TextField>

              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                size="small"
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                placeholder="Brief description of the dish..."
              />

              <DialogActions sx={{ px: 0, pt: 1 }}>
                <Button onClick={() => setAddDishOpen(false)} sx={{ textTransform: "none", color: "#64748b" }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={addDishLoading}
                  sx={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: "10px",
                    px: 3,
                    "&:hover": { backgroundColor: "#1d4ed8" },
                  }}
                >
                  {addDishLoading ? <CircularProgress size={20} sx={{ color: "white" }} /> : "Add Dish"}
                </Button>
              </DialogActions>
            </Box>
          </DialogContent>
        </Dialog>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADMIN EDIT PRODUCT DIALOG                             */}
      {/* ============================================================ */}
      {isAdminOrStaff && (
        <Dialog
          open={editDishOpen}
          onClose={() => setEditDishOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}
        >
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a" }}>Edit Dish</Typography>
            <IconButton onClick={() => setEditDishOpen(false)} size="small">
              <CloseRoundedIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ pt: 1 }}>
            <Box component="form" onSubmit={handleEditDishSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Upside Image / Dropzone */}
              <Box
                onDragOver={(e) => {
                  e.preventDefault();
                  setEditIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setEditIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setEditIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0];
                    if (file.type.startsWith("image/")) {
                      setEditImageFile(file);
                    } else {
                      enqueueSnackbar("Please drop an image file (PNG, JPG, WEBP)", { variant: "warning" });
                    }
                  }
                }}
                onClick={() => editFileInputRef.current?.click()}
                sx={{
                  position: "relative",
                  width: "100%",
                  height: { xs: 160, sm: 195 },
                  borderRadius: "16px",
                  overflow: "hidden",
                  cursor: "pointer",
                  backgroundColor: editIsDragging ? "#f0fdf4" : "#f8fafc",
                  border: editImagePreview
                    ? editIsDragging
                      ? "2px dashed #059669"
                      : "1px solid #e2e8f0"
                    : editIsDragging
                    ? "2px dashed #059669"
                    : "2px dashed #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  "&:hover .image-hover-overlay": {
                    opacity: 1,
                  },
                }}
              >
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEditImageFile(e.target.files[0]);
                    }
                  }}
                />

                {editImagePreview ? (
                  <>
                    <Box
                      component="img"
                      src={editImagePreview}
                      alt={editForm.itemname || "Dish Preview"}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    {/* On hover only: show update image overlay */}
                    <Box
                      className="image-hover-overlay"
                      sx={{
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "rgba(15, 23, 42, 0.65)",
                        backdropFilter: "blur(2.5px)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        opacity: 0,
                        transition: "opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        color: "#ffffff",
                      }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          backgroundColor: "rgba(255, 255, 255, 0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1.5px solid rgba(255, 255, 255, 0.5)",
                        }}
                      >
                        <CloudUploadIcon sx={{ fontSize: 24, color: "#ffffff" }} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "#ffffff" }}>
                        Update Image
                      </Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                        Click or drag new image to replace
                      </Typography>
                    </Box>
                  </>
                ) : (
                  /* When no image: show Drop the image */
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      p: 2.5,
                      textAlign: "center",
                    }}
                  >
                    <Box
                      sx={{
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        backgroundColor: editIsDragging ? "#dcfce7" : "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: editIsDragging ? "#059669" : "#64748b",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <CloudUploadIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
                      Drop the image here
                    </Typography>
                
                  </Box>
                )}
              </Box>

              <TextField
                label="Dish Name"
                fullWidth
                size="small"
                required
                value={editForm.itemname}
                onChange={(e) => setEditForm({ ...editForm, itemname: e.target.value })}
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Original Price / MRP (₹)"
                  type="number"
                  fullWidth
                  size="small"
                  value={editForm.originalPrice}
                  onChange={(e) => {
                    const newOrig = e.target.value;
                    const newOffer = calculateOfferPercent(newOrig, editForm.price);
                    setEditForm({ ...editForm, originalPrice: newOrig, offer: newOffer });
                  }}
                  placeholder="e.g. 260"
                />
                <TextField
                  label="Current / Selling Price (₹)"
                  type="number"
                  fullWidth
                  size="small"
                  required
                  value={editForm.price}
                  onChange={(e) => {
                    const newPrice = e.target.value;
                    const newOffer = calculateOfferPercent(editForm.originalPrice, newPrice);
                    setEditForm({ ...editForm, price: newPrice, offer: newOffer });
                  }}
                  placeholder="e.g. 200"
                />
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Discount Offer (%) [Auto]"
                  type="number"
                  fullWidth
                  size="small"
                  value={editForm.offer}
                  InputProps={{
                    readOnly: true,
                    endAdornment: editForm.offer > 0 ? (
                      <InputAdornment position="end">
                        <Chip label={`${editForm.offer}% OFF`} size="small" sx={{ bgcolor: "#fef08a", color: "#854d0e", fontWeight: 800 }} />
                      </InputAdornment>
                    ) : null,
                  }}
                  helperText={editForm.offer > 0 ? `Savings: ₹${Math.max(0, Number(editForm.originalPrice) - Number(editForm.price))}` : "Calculated from Original & Current price"}
                />
                <TextField
                  label="Category"
                  select
                  fullWidth
                  size="small"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                >
                  {dbCategories.map((cat) => (
                    <MenuItem key={cat.name} value={cat.name}>
                      {cat.label || cat.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Stock Quantity"
                  type="number"
                  fullWidth
                  size="small"
                  value={editForm.stock}
                  onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                />
              </Stack>

              <TextField
                label="Dietary Type"
                select
                fullWidth
                size="small"
                value={editForm.isVeg ? "veg" : "non-veg"}
                onChange={(e) => setEditForm({ ...editForm, isVeg: e.target.value === "veg" })}
              >
                <MenuItem value="veg">Vegetarian (Veg)</MenuItem>
                <MenuItem value="non-veg">Non-Vegetarian (Non-Veg)</MenuItem>
              </TextField>

              <DialogActions sx={{ px: 0, pt: 1 }}>
                <Button onClick={() => setEditDishOpen(false)} sx={{ textTransform: "none", color: "#64748b" }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={editDishLoading}
                  sx={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: "10px",
                    px: 3,
                    "&:hover": { backgroundColor: "#1d4ed8" },
                  }}
                >
                  {editDishLoading ? <CircularProgress size={20} sx={{ color: "white" }} /> : "Save Changes"}
                </Button>
              </DialogActions>
            </Box>
          </DialogContent>
        </Dialog>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADMIN DELETE CONFIRMATION DIALOG                      */}
      {/* ============================================================ */}
      {isAdminOrStaff && (
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: "18px", p: 1 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>Remove Item</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: "#64748b", fontSize: "0.9rem" }}>
              Are you sure you want to remove <b>"{dishToDelete?.itemname}"</b> from the menu?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ pb: 1, px: 2 }}>
            <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ textTransform: "none", color: "#64748b" }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={deleteLoading}
              onClick={handleConfirmDelete}
              sx={{
                backgroundColor: "#dc2626",
                color: "#ffffff",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "10px",
                "&:hover": { backgroundColor: "#b91c1c" },
              }}
            >
              {deleteLoading ? <CircularProgress size={18} sx={{ color: "white" }} /> : "Yes, Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADMIN ADD CATEGORY DIALOG                             */}
      {/* ============================================================ */}
      {isAdminOrStaff && (
        <Dialog
          open={addCategoryOpen}
          onClose={() => setAddCategoryOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: "22px", p: 1 } }}
        >
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: "#0f172a" }}>
              Add New Category
            </Typography>
            <IconButton onClick={() => setAddCategoryOpen(false)} size="small">
              <CloseRoundedIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Box component="form" onSubmit={handleAddCategorySubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 0.5 }}>
              {/* Live Pill Preview */}
              <Box sx={{ p: 2, borderRadius: "16px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1.1,
                    height: 44,
                    pl: 0.6,
                    pr: 2.5,
                    borderRadius: "9999px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      backgroundColor: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      fontSize: "18px",
                    }}
                  >
                    {getCategoryVisual(newCategoryIcon, newCategoryName)}
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#ffffff" }}>
                    {newCategoryName.trim() || "Category Name"}
                  </Typography>
                </Box>
              </Box>

              <TextField
                label="Category Name"
                fullWidth
                size="small"
                required
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Pizza, Burger, Drinks, Sushi"
              />

              <TextField
                label="Select Category Icon"
                select
                fullWidth
                size="small"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
              >
                {CATEGORY_ICON_OPTIONS.map((opt) => (
                  <MenuItem key={opt.id} value={opt.id} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <span style={{ fontSize: "1.2rem" }}>{opt.emoji}</span>
                    <Typography sx={{ fontSize: "0.9rem", fontWeight: 600 }}>{opt.label}</Typography>
                  </MenuItem>
                ))}
              </TextField>

              <DialogActions sx={{ px: 0, pt: 1 }}>
                <Button onClick={() => setAddCategoryOpen(false)} sx={{ textTransform: "none", color: "#64748b" }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={addCategoryLoading}
                  sx={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: "10px",
                    px: 2.5,
                    "&:hover": { backgroundColor: "#1d4ed8" },
                  }}
                >
                  {addCategoryLoading ? <CircularProgress size={20} sx={{ color: "white" }} /> : "Add Category"}
                </Button>
              </DialogActions>
            </Box>
          </DialogContent>
        </Dialog>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADMIN EDIT CATEGORY DIALOG                            */}
      {/* ============================================================ */}
      {isAdminOrStaff && (
        <Dialog
          open={editCategoryOpen}
          onClose={() => setEditCategoryOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: "22px", p: 1 } }}
        >
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: "#0f172a" }}>
              Edit Category
            </Typography>
            <IconButton onClick={() => setEditCategoryOpen(false)} size="small">
              <CloseRoundedIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Box component="form" onSubmit={handleEditCategorySubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 0.5 }}>
              {/* Live Pill Preview */}
              <Box sx={{ p: 2, borderRadius: "16px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1.1,
                    height: 44,
                    pl: 0.6,
                    pr: 2.5,
                    borderRadius: "9999px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      backgroundColor: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      fontSize: "18px",
                    }}
                  >
                    {getCategoryVisual(editCategoryIcon, editCategoryName)}
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#ffffff" }}>
                    {editCategoryName.trim() || "Category Name"}
                  </Typography>
                </Box>
              </Box>

              {/* Single Input: Category Name */}
              <TextField
                label="Category Name"
                fullWidth
                size="small"
                required
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                placeholder="e.g. Pizza, Burger, Drinks, Sushi"
              />

              <TextField
                label="Select Category Icon"
                select
                fullWidth
                size="small"
                value={editCategoryIcon}
                onChange={(e) => setEditCategoryIcon(e.target.value)}
              >
                {CATEGORY_ICON_OPTIONS.map((opt) => (
                  <MenuItem key={opt.id} value={opt.id} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <span style={{ fontSize: "1.2rem" }}>{opt.emoji}</span>
                    <Typography sx={{ fontSize: "0.9rem", fontWeight: 600 }}>{opt.label}</Typography>
                  </MenuItem>
                ))}
              </TextField>

              <DialogActions sx={{ px: 0, pt: 1 }}>
                <Button onClick={() => setEditCategoryOpen(false)} sx={{ textTransform: "none", color: "#64748b" }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={editCategoryLoading}
                  sx={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: "10px",
                    px: 2.5,
                    "&:hover": { backgroundColor: "#1d4ed8" },
                  }}
                >
                  {editCategoryLoading ? <CircularProgress size={20} sx={{ color: "white" }} /> : "Save Changes"}
                </Button>
              </DialogActions>
            </Box>
          </DialogContent>
        </Dialog>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADMIN DELETE CATEGORY CONFIRMATION DIALOG              */}
      {/* ============================================================ */}
      {isAdminOrStaff && (
        <Dialog
          open={deleteCatConfirmOpen}
          onClose={() => setDeleteCatConfirmOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: "18px", p: 1 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>Remove Category</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: "#64748b", fontSize: "0.9rem" }}>
              Are you sure you want to remove the category <b>"{categoryToDelete?.label || categoryToDelete?.name}"</b>?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ pb: 1, px: 2 }}>
            <Button onClick={() => setDeleteCatConfirmOpen(false)} sx={{ textTransform: "none", color: "#64748b" }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={deleteCategoryLoading}
              onClick={handleConfirmDeleteCategory}
              sx={{
                backgroundColor: "#dc2626",
                color: "#ffffff",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "10px",
                "&:hover": { backgroundColor: "#b91c1c" },
              }}
            >
              {deleteCategoryLoading ? <CircularProgress size={18} sx={{ color: "white" }} /> : "Yes, Remove"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* ============================================================ */}
      {/* POPOVER: FILTER BY FOOD TYPE, INGREDIENT & PRICING RANGE     */}
      {/* ============================================================ */}
      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: { xs: 320, sm: 380 },
            p: 2.5,
            borderRadius: "22px",
            boxShadow: "0 20px 45px rgba(0,0,0,0.12)",
            border: "1px solid #e2e8f0",
            mt: 1,
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TuneRoundedIcon sx={{ color: "#047857", fontSize: 22 }} />
            <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a" }}>
              Filter Products
            </Typography>
            {activeFilterCount > 0 && (
              <Chip
                size="small"
                label={`${activeFilterCount} active`}
                sx={{
                  backgroundColor: "#dcfce7",
                  color: "#15803d",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  height: 20,
                }}
              />
            )}
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {hasActiveFilters && (
              <Button
                size="small"
                onClick={handleResetFilters}
                sx={{
                  textTransform: "none",
                  color: "#dc2626",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  p: "2px 6px",
                }}
              >
                Reset
              </Button>
            )}
            <IconButton size="small" onClick={() => setFilterAnchorEl(null)}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <Divider sx={{ mb: 2.2 }} />

        {/* 1. Food Type Filter */}
        <Box sx={{ mb: 2.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem", color: "#0f172a", mb: 1.2 }}>
            Food Type
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
            {dbCategories.map((cat) => {
              const isSelected = filterFoodTypes.some(
                (t) => t.toLowerCase() === cat.name.toLowerCase()
              );
              const ItemIcon = getCategoryIcon(cat.icon, cat.name);
              return (
                <Chip
                  key={cat.name}
                  icon={<ItemIcon sx={{ fontSize: "16px !important" }} />}
                  label={cat.label || cat.name}
                  clickable
                  onClick={() => {
                    setFilterFoodTypes((prev) =>
                      prev.some((t) => t.toLowerCase() === cat.name.toLowerCase())
                        ? prev.filter((t) => t.toLowerCase() !== cat.name.toLowerCase())
                        : [...prev, cat.name]
                    );
                  }}
                  sx={{
                    backgroundColor: isSelected ? "#ecfdf5" : "#f8fafc",
                    color: isSelected ? "#047857" : "#475569",
                    fontWeight: 700,
                    fontSize: "0.76rem",
                    border: isSelected ? "1.5px solid #22c55e" : "1px solid #e2e8f0",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      backgroundColor: isSelected ? "#d1fae5" : "#f1f5f9",
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* 2. Ingredient Type Filter (Veg / Non-Veg) */}
        <Box sx={{ mb: 2.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem", color: "#0f172a", mb: 1.2 }}>
            Ingredient Type
          </Typography>
          <Stack direction="row" spacing={1}>
            {[
              { id: "all", label: "All Items" },
              { id: "veg", label: "🟢 Veg" },
              { id: "non-veg", label: "🔴 Non-Veg" },
            ].map((t) => {
              const isSelected = filterIngredient === t.id;
              return (
                <Box
                  key={t.id}
                  onClick={() => setFilterIngredient(t.id)}
                  sx={{
                    flex: 1,
                    py: 1,
                    px: 1.2,
                    textAlign: "center",
                    borderRadius: "12px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#ecfdf5" : "#f8fafc",
                    border: isSelected ? "1.5px solid #22c55e" : "1px solid #e2e8f0",
                    color: isSelected ? "#047857" : "#475569",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    userSelect: "none",
                    transition: "all 0.15s ease",
                    "&:hover": { backgroundColor: isSelected ? "#d1fae5" : "#f1f5f9" },
                  }}
                >
                  {t.label}
                </Box>
              );
            })}
          </Stack>
        </Box>

        {/* 3. Pricing Range Filter */}
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "0.85rem", color: "#0f172a" }}>
              Pricing Range
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", color: "#059669" }}>
              ₹{filterPriceRange[0]} - ₹{filterPriceRange[1]}
            </Typography>
          </Box>

          <Box sx={{ px: 1 }}>
            <Slider
              value={filterPriceRange}
              onChange={(e, val) => setFilterPriceRange(val)}
              min={0}
              max={1000}
              step={10}
              valueLabelDisplay="auto"
              sx={{
                color: "#059669",
                "& .MuiSlider-thumb": {
                  width: 18,
                  height: 18,
                  backgroundColor: "#ffffff",
                  border: "2px solid #059669",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                },
                "& .MuiSlider-track": { height: 6 },
                "& .MuiSlider-rail": { height: 6, backgroundColor: "#e2e8f0" },
              }}
            />
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              size="small"
              label="Min Price"
              type="number"
              value={filterPriceRange[0]}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                setFilterPriceRange([Math.max(0, val), filterPriceRange[1]]);
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Max Price"
              type="number"
              value={filterPriceRange[1]}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                setFilterPriceRange([filterPriceRange[0], Math.min(2000, val)]);
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              sx={{ flex: 1 }}
            />
          </Stack>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Footer Actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleResetFilters}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.82rem",
              borderRadius: "12px",
              color: "#64748b",
              borderColor: "#cbd5e1",
              "&:hover": { borderColor: "#94a3b8", backgroundColor: "#f8fafc" },
            }}
          >
            Clear Filters
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setFilterAnchorEl(null)}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              fontSize: "0.82rem",
              borderRadius: "12px",
              backgroundColor: "#065f46",
              color: "#ffffff",
              boxShadow: "0 4px 12px rgba(6, 95, 70, 0.25)",
              "&:hover": { backgroundColor: "#044e3b" },
            }}
          >
            Show ({filteredFoods.length}) Dishes
          </Button>
        </Box>
      </Popover>

      {/* ============================================================ */}
      {/* CARD 3-DOTS ACTION MENU (Admin Only)                         */}
      {/* ============================================================ */}
      {isAdminOrStaff && (
        <MuiMenu
          anchorEl={cardMenuAnchorEl}
          open={Boolean(cardMenuAnchorEl)}
          onClose={() => {
            setCardMenuAnchorEl(null);
            setCardMenuFood(null);
          }}
          PaperProps={{
            sx: {
              borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              border: "1px solid #f1f5f9",
              minWidth: 180,
            },
          }}
        >
          <MenuItem
            onClick={() => {
              const food = cardMenuFood;
              setCardMenuAnchorEl(null);
              setCardMenuFood(null);
              if (food) openEditDialog(food);
            }}
            sx={{ fontSize: "0.85rem", fontWeight: 600, py: 1 }}
          >
            <ListItemIcon>
              <EditRoundedIcon fontSize="small" sx={{ color: "#059669" }} />
            </ListItemIcon>
            <ListItemText primary="Edit Details" />
          </MenuItem>

          <MenuItem
            onClick={async () => {
              const food = cardMenuFood;
              setCardMenuAnchorEl(null);
              setCardMenuFood(null);
              if (!food) return;
              const newStock = Number(food.stock || 0) > 0 ? 0 : 25;
              try {
                const fd = new FormData();
                fd.append("id", food._id);
                fd.append("itemname", food.itemname);
                fd.append("price", String(food.price));
                fd.append("category", food.category || "BreakFast");
                fd.append("stock", String(newStock));
                const res = await postForm("/food/updateItem", fd);
                if (res && (res.status === 200 || res.success)) {
                  enqueueSnackbar(`Stock updated to ${newStock}`, { variant: "success" });
                  await fetchFoods();
                }
              } catch (e) {
                enqueueSnackbar("Failed to update stock", { variant: "error" });
              }
            }}
            sx={{ fontSize: "0.85rem", fontWeight: 600, py: 1 }}
          >
            <ListItemIcon>
              <Inventory2OutlinedIcon fontSize="small" sx={{ color: "#3b82f6" }} />
            </ListItemIcon>
            <ListItemText primary={Number(cardMenuFood?.stock || 0) > 0 ? "Mark Out of Stock" : "Restock (25)"} />
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem
            onClick={() => {
              const food = cardMenuFood;
              setCardMenuAnchorEl(null);
              setCardMenuFood(null);
              if (food) openDeleteDialog(food);
            }}
            sx={{ fontSize: "0.85rem", fontWeight: 600, py: 1, color: "#dc2626" }}
          >
            <ListItemIcon>
              <DeleteOutlineRoundedIcon fontSize="small" sx={{ color: "#dc2626" }} />
            </ListItemIcon>
            <ListItemText primary="Delete Dish" />
          </MenuItem>
        </MuiMenu>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREATE OR JOIN TABLE (Students only)                  */}
      {/* ============================================================ */}
      {!isAdminOrStaff && (
        <Dialog
          open={tableModalOpen}
          onClose={() => setTableModalOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}
        >
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TableRestaurantRoundedIcon sx={{ color: "#059669" }} />
              <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>
                {activeTable ? `Table: ${activeTable.tableName}` : "Dining Table Session"}
              </Typography>
            </Box>
            <IconButton onClick={() => setTableModalOpen(false)} size="small">
              <CloseRoundedIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ pt: 1 }}>
            {activeTable ? (
              <Box>
                <Typography sx={{ fontSize: "0.85rem", color: "#64748b", mb: 2 }}>
                  Share your Table Code or Table Name with friends so they can order into this shared cart.
                </Typography>

                <Box
                  sx={{
                    backgroundColor: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "14px",
                    p: 2,
                    textAlign: "center",
                    mb: 2.5,
                  }}
                >
                  <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
                    Table Code
                  </Typography>
                  <Typography sx={{ fontSize: "1.4rem", fontWeight: 900, color: "#059669", letterSpacing: 1.5 }}>
                    {activeTable.tableId}
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<ContentCopyRoundedIcon sx={{ fontSize: 16 }} />}
                    onClick={() => {
                      navigator?.clipboard?.writeText(activeTable.tableId);
                      enqueueSnackbar("Table Code copied to clipboard!", { variant: "success" });
                    }}
                    sx={{ textTransform: "none", fontSize: "0.78rem", fontWeight: 700, mt: 0.5 }}
                  >
                    Copy Code
                  </Button>
                </Box>

                <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a", mb: 1 }}>
                  Connected Members ({activeTable.members.length})
                </Typography>
                <Stack spacing={1}>
                  {activeTable.members.map((m) => (
                    <Box
                      key={m.username}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1.2,
                        borderRadius: "12px",
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                        {(() => {
                          const isHost = m.username === activeTable.creator;
                          const mAvatar =
                            m.avatar ||
                            (m.username === user?.username ? user?.avatar : "") ||
                            (isHost ? activeTable.creatorAvatar : "") ||
                            "";
                          return (
                            <Avatar
                              src={mAvatar || undefined}
                              sx={{
                                width: 34,
                                height: 34,
                                bgcolor: mAvatar ? "transparent" : isHost ? "#059669" : "#2563eb",
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                border: mAvatar ? "1.5px solid #e2e8f0" : "none",
                              }}
                            >
                              {!mAvatar && (
                                m.name && isNaN(m.name[0]) ? (
                                  m.name[0].toUpperCase()
                                ) : (
                                  <PersonRoundedIcon sx={{ fontSize: 18, color: "#ffffff" }} />
                                )
                              )}
                            </Avatar>
                          );
                        })()}
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>
                            {m.name || m.username} {m.username === activeTable.creator && "(Host)"}
                          </Typography>
                          <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>@{m.username}</Typography>
                        </Box>
                      </Box>
                      <Chip
                        size="small"
                        label={m.isReady ? "Ready ✓" : "Ordering..."}
                        sx={{
                          backgroundColor: m.isReady ? "#dcfce7" : "#fef3c7",
                          color: m.isReady ? "#15803d" : "#b45309",
                          fontWeight: 700,
                          fontSize: "0.72rem",
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "12px", p: 0.5, mb: 2 }}>
                  <Box
                    onClick={() => setTableModalTab("create")}
                    sx={{
                      flex: 1,
                      textAlign: "center",
                      py: 0.8,
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      backgroundColor: tableModalTab === "create" ? "#ffffff" : "transparent",
                      color: tableModalTab === "create" ? "#0f172a" : "#64748b",
                      boxShadow: tableModalTab === "create" ? "0 2px 6px rgba(0,0,0,0.05)" : "none",
                    }}
                  >
                    Create Table
                  </Box>
                  <Box
                    onClick={() => setTableModalTab("join")}
                    sx={{
                      flex: 1,
                      textAlign: "center",
                      py: 0.8,
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      backgroundColor: tableModalTab === "join" ? "#ffffff" : "transparent",
                      color: tableModalTab === "join" ? "#0f172a" : "#64748b",
                      boxShadow: tableModalTab === "join" ? "0 2px 6px rgba(0,0,0,0.05)" : "none",
                    }}
                  >
                    Join Table
                  </Box>
                </Box>

                {tableModalTab === "create" ? (
                  <Box sx={{ textAlign: "center", py: 1 }}>
                    <Box
                      sx={{
                        p: 2.5,
                        mb: 2.5,
                        backgroundColor: "#f0fdf4",
                        border: "1.5px dashed #86efac",
                        borderRadius: "14px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#166534", letterSpacing: "0.5px" }}>
                        HOST TABLE WITH YOUR ROLL NUMBER
                      </Typography>
                      <Typography sx={{ fontSize: "1.6rem", fontWeight: 900, color: "#059669", letterSpacing: "1px" }}>
                        {user?.rollNo ? user.rollNo.toUpperCase() : user?.username?.toUpperCase() || "STUDENT"}
                      </Typography>
                      <Typography sx={{ fontSize: "0.8rem", color: "#475569", maxWidth: 330, lineHeight: 1.4 }}>
                        Clicking Create Table will start a shared session with your Roll Number. Friends can enter this Roll Number to join and order together into one cart.
                      </Typography>
                    </Box>

                    <Button
                      fullWidth
                      disabled={tableLoading}
                      onClick={handleCreateTable}
                      sx={{
                        backgroundColor: "#059669",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: "0.96rem",
                        height: 46,
                        borderRadius: "12px",
                        textTransform: "none",
                        boxShadow: "0 6px 20px rgba(5, 150, 105, 0.25)",
                        "&:hover": { backgroundColor: "#047857" },
                      }}
                    >
                      {tableLoading ? <CircularProgress size={22} sx={{ color: "white" }} /> : "Create Table"}
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <Typography sx={{ fontSize: "0.84rem", color: "#64748b", mb: 1.5 }}>
                      Enter the <b>Roll Number</b> of the student who created the table:
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Enter Roll Number (e.g. 21BCE102)..."
                      value={joinInput}
                      onChange={(e) => setJoinInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && joinInput.trim()) {
                          handleJoinTable();
                        }
                      }}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      fullWidth
                      disabled={tableLoading || !joinInput.trim()}
                      onClick={() => handleJoinTable()}
                      sx={{
                        backgroundColor: "#059669",
                        color: "#ffffff",
                        fontWeight: 700,
                        height: 42,
                        borderRadius: "10px",
                        textTransform: "none",
                        "&:hover": { backgroundColor: "#047857" },
                      }}
                    >
                      {tableLoading ? <CircularProgress size={20} sx={{ color: "white" }} /> : "Join Table"}
                    </Button>

                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* ============================================================ */}
      {/* MODAL: SINGLE RECEIPT CONFIRMATION POPUP (Students only)     */}
      {/* ============================================================ */}
      {!isAdminOrStaff && (
        <Dialog
          open={orderSuccessDialog}
          onClose={() => setOrderSuccessDialog(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: "20px", p: 1.5, textAlign: "center" } }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                bgcolor: "#dcfce7",
                color: "#16a34a",
                mx: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1.5,
              }}
            >
              <CheckCircleRoundedIcon sx={{ fontSize: 36 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a" }}>
              Order Placed Successfully!
            </Typography>
          </DialogTitle>

          <DialogContent>

            {placedOrderDetails?.orderNumber && (
              <Box sx={{ backgroundColor: "#f8fafc", p: 1.5, borderRadius: "12px", border: "1px dashed #cbd5e1", mb: 2 }}>
                <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>ORDER NUMBER</Typography>
                <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: "#059669" }}>
                  {String(placedOrderDetails.orderNumber).toUpperCase()}
                </Typography>
              </Box>
            )}

            {placedOrderDetails?.receiptImageUrl && (
              <Box
                component="img"
                src={placedOrderDetails.receiptImageUrl}
                alt="Receipt"
                sx={{
                  width: "100%",
                  maxHeight: 200,
                  objectFit: "contain",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  mb: 2,
                }}
              />
            )}
          </DialogContent>

          <DialogActions sx={{ justifyContent: "center", pb: 1 }}>
            <Button
              variant="contained"
              onClick={() => {
                setOrderSuccessDialog(false);
                navigate("/student/orders");
              }}
              sx={{
                backgroundColor: "#059669",
                color: "#ffffff",
                fontWeight: 700,
                borderRadius: "10px",
                px: 3,
                textTransform: "none",
                "&:hover": { backgroundColor: "#047857" },
              }}
            >
              View Orders
            </Button>
          </DialogActions>
        </Dialog>
      )}

    </Box>
  );
}
