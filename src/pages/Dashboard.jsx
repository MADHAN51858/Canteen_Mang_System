import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { post, get } from "../utils/api";
import { CartContext } from "../context/CartContext";
import { useToast } from "../hooks/useToast";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Container,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  Chip,
  Stack,
  TextField,
  Button,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  LinearProgress,
  IconButton,
} from "@mui/material";
import Chart from "react-apexcharts";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import SoupKitchenIcon from "@mui/icons-material/SoupKitchen";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TableRestaurantRoundedIcon from "@mui/icons-material/TableRestaurantRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";

// Time ago helper for recent order timestamps
function timeAgo(dateString) {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Category icon helper
function getCategoryEmoji(cat) {
  if (!cat) return "🍽️";
  const c = String(cat).toLowerCase();
  if (c.includes("breakfast")) return "🌅";
  if (c.includes("lunch")) return "🍽️";
  if (c.includes("dinner")) return "🌙";
  if (c.includes("pizza")) return "🍕";
  if (c.includes("burger")) return "🍔";
  if (c.includes("drink") || c.includes("beverage") || c.includes("juice") || c.includes("tea") || c.includes("coffee")) return "🥤";
  if (c.includes("sushi")) return "🍣";
  if (c.includes("dessert") || c.includes("sweet") || c.includes("ice")) return "🍰";
  if (c.includes("snack") || c.includes("chaat") || c.includes("fry")) return "🍿";
  if (c.includes("soup") || c.includes("curry") || c.includes("bowl")) return "🍲";
  return "🍴";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, login } = useContext(CartContext);
  const { showToast } = useToast();

  // Admin Details & Inline Edit
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [editAdminData, setEditAdminData] = useState({
    email: user?.email || "",
    phoneNo: user?.phoneNo || "",
    rollNo: user?.rollNo || "",
  });
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Wallet Withdrawal State
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [currentWalletBalance, setCurrentWalletBalance] = useState(
    user?.walletBalance || 0
  );
  const [walletTotal, setWalletTotal] = useState(0);

  // Core Data States
  const [userStats, setUserStats] = useState({ admin: 0, staff: 0, student: 0 });
  const [allFoods, setAllFoods] = useState([]);
  const [foodStats, setFoodStats] = useState({});
  const [allOrders, setAllOrders] = useState([]);
  const [orderStats, setOrderStats] = useState({ preOrder: 0, normalOrder: 0 });
  const [orderStatusStats, setOrderStatusStats] = useState({
    pending: 0,
    preparing: 0,
    completed: 0,
    cancelled: 0,
  });
  const [dailyStats, setDailyStats] = useState([]);
  const [categoryCrossStats, setCategoryCrossStats] = useState({});
  const [categoryRevenueStats, setCategoryRevenueStats] = useState({});
  const [categoryFoodStats, setCategoryFoodStats] = useState({});
  const [categoryFoodRevenueStats, setCategoryFoodRevenueStats] = useState({});
  const [activeTables, setActiveTables] = useState([]);

  // Filter & Timeline Controls
  const [selectedDays, setSelectedDays] = useState(14);
  const [filterType, setFilterType] = useState("units"); // 'units' | 'revenue'
  const [trendMetric, setTrendMetric] = useState("revenue"); // 'revenue' | 'orders' | 'both'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Keep admin user data in sync
  useEffect(() => {
    if (user) {
      setEditAdminData({
        email: user.email || "",
        phoneNo: user.phoneNo || "",
        rollNo: user.rollNo || "",
      });
      setCurrentWalletBalance(user.walletBalance || 0);
    }
  }, [user]);

  // Master Data Fetching Routine
  const fetchDashboardData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const [
        usersRes,
        foodRes,
        orderListRes,
        dailyRes,
        catFoodRes,
        catCrossRes,
        catRevRes,
        catFoodRevRes,
        orderStatsRes,
        orderStatusRes,
        tablesRes,
      ] = await Promise.all([
        post("/users/getAllUsers", {}),
        post("/food/getAllFoods", {}),
        post("/order/getOrderList", {}),
        post("/order/getDailyOrderStats", { days: selectedDays }),
        post("/order/getCategoryFoodStats", { days: selectedDays }),
        post("/order/getCategoryCrossStats", { days: selectedDays }),
        post("/order/getCategoryRevenueStats", { days: selectedDays }),
        post("/order/getCategoryFoodRevenueStats", { days: selectedDays }),
        post("/order/getOrderStats", {}),
        post("/order/getOrderStatusStats", {}),
        get("/table/active").catch(() => ({ data: [] })),
      ]);

      // 1. Process Users
      if (usersRes?.success && Array.isArray(usersRes.data)) {
        const users = usersRes.data;
        const admins = users.filter((u) => u.role === "admin");
        setUserStats({
          admin: admins.length,
          staff: users.filter((u) => u.role === "staff").length,
          student: users.filter((u) => u.role === "student").length,
        });

        const totalWallet = admins.reduce(
          (sum, u) => sum + Number(u.walletBalance || 0),
          0
        );
        setWalletTotal(totalWallet);
      }

      // 2. Process Food Items
      if (foodRes?.success && Array.isArray(foodRes.data)) {
        const foods = foodRes.data;
        setAllFoods(foods);
        const categories = {};
        foods.forEach((f) => {
          const cat = f.category || "Other";
          categories[cat] = (categories[cat] || 0) + 1;
        });
        setFoodStats(categories);
      }

      // 3. Process Full Orders List
      if (orderListRes?.success && Array.isArray(orderListRes.data)) {
        setAllOrders(orderListRes.data);
      }

      // 4. Process Analytics Aggregations
      if (dailyRes?.success && Array.isArray(dailyRes.data)) {
        setDailyStats(dailyRes.data);
      }
      if (catFoodRes?.success && catFoodRes.data) {
        setCategoryFoodStats(catFoodRes.data);
      }
      if (catCrossRes?.success && catCrossRes.data) {
        setCategoryCrossStats(catCrossRes.data);
      }
      if (catRevRes?.success && catRevRes.data) {
        setCategoryRevenueStats(catRevRes.data);
      }
      if (catFoodRevRes?.success && catFoodRevRes.data) {
        setCategoryFoodRevenueStats(catFoodRevRes.data);
      }
      if (orderStatsRes?.success && orderStatsRes.data) {
        setOrderStats(orderStatsRes.data);
      }
      if (orderStatusRes?.success && orderStatusRes.data) {
        setOrderStatusStats(orderStatusRes.data);
      }

      // 5. Process Active Collaborative Tables
      if (tablesRes?.data && Array.isArray(tablesRes.data)) {
        setActiveTables(tablesRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDays]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Re-fetch timeline when selectedDays changes
  const handleTimelineChange = async (days) => {
    setSelectedDays(days);
    try {
      const [dailyRes, catFoodRes, catCrossRes, catRevRes, catFoodRevRes] =
        await Promise.all([
          post("/order/getDailyOrderStats", { days }),
          post("/order/getCategoryFoodStats", { days }),
          post("/order/getCategoryCrossStats", { days }),
          post("/order/getCategoryRevenueStats", { days }),
          post("/order/getCategoryFoodRevenueStats", { days }),
        ]);

      if (dailyRes?.success && Array.isArray(dailyRes.data)) setDailyStats(dailyRes.data);
      if (catFoodRes?.success && catFoodRes.data) setCategoryFoodStats(catFoodRes.data);
      if (catCrossRes?.success && catCrossRes.data) setCategoryCrossStats(catCrossRes.data);
      if (catRevRes?.success && catRevRes.data) setCategoryRevenueStats(catRevRes.data);
      if (catFoodRevRes?.success && catFoodRevRes.data) setCategoryFoodRevenueStats(catFoodRevRes.data);
    } catch (e) {
      console.error("Failed to update timeline stats:", e);
    }
  };

  // --- Computed Metrics & Analytics ---
  const metrics = useMemo(() => {
    let grossRevenue = 0;
    let completedRevenue = 0;
    let todayOrdersCount = 0;
    let todayRevenue = 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const totalOrdersCount = allOrders.length;
    let completedCount = 0;
    let pendingCount = 0;
    let preparingCount = 0;
    let cancelledCount = 0;

    allOrders.forEach((order) => {
      const val = Number(order.totalprice ?? order.amount ?? 0);
      const st = String(order.status || "").toLowerCase();

      if (st === "completed") {
        completedCount += 1;
        completedRevenue += val;
        grossRevenue += val;
      } else if (st === "pending") {
        pendingCount += 1;
        grossRevenue += val;
      } else if (st === "preparing") {
        preparingCount += 1;
        grossRevenue += val;
      } else if (st === "cancelled") {
        cancelledCount += 1;
      }

      // Check if placed today
      if (order.createdAt && new Date(order.createdAt) >= startOfToday) {
        todayOrdersCount += 1;
        if (st !== "cancelled") {
          todayRevenue += val;
        }
      }
    });

    const activeKitchenCount = pendingCount + preparingCount;
    const aov = completedCount > 0 ? Math.round(completedRevenue / completedCount) : 0;
    const fulfillmentRate =
      totalOrdersCount > 0
        ? Math.round((completedCount / totalOrdersCount) * 100)
        : 0;

    return {
      grossRevenue,
      completedRevenue,
      todayRevenue,
      todayOrdersCount,
      totalOrdersCount,
      completedCount,
      pendingCount,
      preparingCount,
      cancelledCount,
      activeKitchenCount,
      aov,
      fulfillmentRate,
    };
  }, [allOrders]);

  // Top 5 Best-Selling Dishes (computed from order items)
  const topSellers = useMemo(() => {
    const itemMap = {};
    allOrders.forEach((order) => {
      if (order.status !== "cancelled" && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          if (!item) return;
          const id = String(item._id || item.itemname || Math.random());
          const name = item.itemname || "Unnamed Item";
          const category = item.category || "General";
          const price = Number(item.price || 0);

          if (!itemMap[id]) {
            itemMap[id] = {
              id,
              name,
              category,
              price,
              image: item.image || "",
              unitsSold: 0,
              revenue: 0,
            };
          }
          itemMap[id].unitsSold += 1;
          itemMap[id].revenue += price;
        });
      }
    });

    return Object.values(itemMap)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);
  }, [allOrders]);

  // Inventory & Stock Health
  const inventoryMetrics = useMemo(() => {
    const outOfStock = allFoods.filter(
      (f) => !f.inStock || Number(f.stock || 0) === 0
    );
    const lowStock = allFoods.filter(
      (f) => f.inStock && Number(f.stock || 0) > 0 && Number(f.stock || 0) <= 10
    );
    const healthyStock = allFoods.filter(
      (f) => f.inStock && Number(f.stock || 0) > 10
    );

    return {
      totalDishes: allFoods.length,
      outOfStock,
      lowStock,
      healthyStock,
      totalAlerts: outOfStock.length + lowStock.length,
    };
  }, [allFoods]);

  // Recent 8 live orders
  const recentOrders = useMemo(() => {
    return [...allOrders].slice(0, 8);
  }, [allOrders]);

  // Dynamic Categories available in dataset
  const dynamicCategories = useMemo(() => {
    const set = new Set();
    const source = filterType === "units" ? categoryCrossStats : categoryRevenueStats;
    Object.values(source).forEach((dateObj) => {
      Object.keys(dateObj).forEach((cat) => set.add(cat));
    });
    return Array.from(set);
  }, [filterType, categoryCrossStats, categoryRevenueStats]);

  // Handlers for Admin Profile Updates
  const handleSaveAdminDetails = async () => {
    if (!editAdminData.email?.trim()) {
      showToast("Email is required", "error");
      return;
    }
    if (!editAdminData.rollNo?.trim()) {
      showToast("Roll Number is required", "error");
      return;
    }
    const phoneStr = String(editAdminData.phoneNo || "").replace(/\D/g, "");
    if (phoneStr.length !== 10) {
      showToast("Phone number must be exactly 10 digits", "error");
      return;
    }

    setSavingAdmin(true);
    try {
      const payload = {
        username: user.username,
        email: editAdminData.email.trim(),
        phoneNo: phoneStr,
        rollNo: editAdminData.rollNo.trim(),
      };

      const response = await post("/users/updateProfile", payload);
      if (response.success) {
        showToast("Admin details updated successfully", "success");
        setIsEditingAdmin(false);
        const updatedUser = response.data?.user || {
          ...user,
          email: payload.email,
          phoneNo: parseInt(phoneStr, 10),
          rollNo: payload.rollNo,
        };
        login(updatedUser);
      } else {
        showToast(response.message || "Failed to update details", "error");
      }
    } catch (err) {
      showToast("Error updating admin details: " + err.message, "error");
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleCancelEdit = () => {
    setEditAdminData({
      email: user?.email || "",
      phoneNo: user?.phoneNo || "",
      rollNo: user?.rollNo || "",
    });
    setIsEditingAdmin(false);
  };

  // Handlers for Wallet Withdrawal
  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }
    const amount = parseFloat(withdrawAmount);
    if (amount > (currentWalletBalance || 0)) {
      showToast("Insufficient balance", "error");
      return;
    }

    setWithdrawing(true);
    try {
      const response = await post("/users/withdrawAmount", {
        userId: user._id,
        amount: amount,
      });

      if (response?.success) {
        const newBalance = response.data?.newBalance ?? Math.max(0, currentWalletBalance - amount);
        setCurrentWalletBalance(newBalance);
        login({ ...user, walletBalance: newBalance });
        setWalletTotal((prev) => Math.max(0, prev - amount));
        showToast(`Successfully withdrawn ₹${amount.toFixed(2)}`, "success");
        setWithdrawDialog(false);
        setWithdrawAmount("");
      } else {
        showToast(response?.message || "Withdrawal failed", "error");
      }
    } catch (err) {
      showToast("Error processing withdrawal: " + err.message, "error");
    } finally {
      setWithdrawing(false);
    }
  };

  // Loading skeleton screen
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 4 } }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Skeleton variant="rounded" height={160} sx={{ borderRadius: 4 }} />
          </Grid>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={`skel-card-${i}`}>
              <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
          <Grid item xs={12} md={8}>
            <Skeleton variant="rounded" height={380} sx={{ borderRadius: 3 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rounded" height={380} sx={{ borderRadius: 3 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  // Pre-calculated dates for timeline chart
  const timelineDates = dailyStats.map((d) => d.date);
  const timelineCounts = dailyStats.map((d) => d.count);
  // Estimate daily revenue from cross stats
  const timelineRevenues = timelineDates.map((date) => {
    const revObj = categoryRevenueStats[date] || {};
    return Object.values(revObj).reduce((sum, v) => sum + Number(v || 0), 0);
  });

  return (
    <Container maxWidth="xl" sx={{ py: 3, px: { xs: 2, md: 4 } }}>
      

      {/* 2. TOP-LEVEL EXECUTIVE METRICS GRID (8 High-Density KPIs) */}
      <Box sx={{ mb: 4 }}>

        <Grid container spacing={2.5}>
          {/* Card 1: Total Gross Revenue */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: "#ffffff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 16px -2px rgba(0,0,0,0.05)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 24px -4px rgba(0,0,0,0.08)" },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem" }}>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", my: 0.5 }}>
                    ₹{metrics.grossRevenue.toLocaleString()}
                  </Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Chip
                      size="small"
                      label={`₹${metrics.completedRevenue.toLocaleString()} Completed`}
                      sx={{ bgcolor: "#ecfdf5", color: "#059669", fontWeight: 700, fontSize: "0.68rem", height: 22 }}
                    />
                  </Stack>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "#ecfdf5",
                    color: "#10b981",
                  }}
                >
                  <AttachMoneyIcon />
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Card 2: Total Orders Placed */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: "#ffffff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 16px -2px rgba(0,0,0,0.05)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 24px -4px rgba(0,0,0,0.08)" },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem" }}>
                    Total Orders
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", my: 0.5 }}>
                    {metrics.totalOrdersCount}
                  </Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Chip
                      size="small"
                      label={`${metrics.fulfillmentRate}% Fulfilled`}
                      sx={{ bgcolor: "#eff6ff", color: "#2563eb", fontWeight: 700, fontSize: "0.68rem", height: 22 }}
                    />
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                      {orderStats.preOrder || 0} pre-orders
                    </Typography>
                  </Stack>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "#eff6ff",
                    color: "#3b82f6",
                  }}
                >
                  <ShoppingCartIcon />
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Card 3: Kitchen Active Queue (Pending + Preparing) */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: "#ffffff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 16px -2px rgba(0,0,0,0.05)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 24px -4px rgba(0,0,0,0.08)" },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem" }}>
                    Kitchen Active Queue
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: metrics.activeKitchenCount > 0 ? "#d97706" : "#0f172a", my: 0.5 }}>
                    {metrics.activeKitchenCount}
                  </Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Chip
                      size="small"
                      label={`${metrics.pendingCount} Pending`}
                      sx={{ bgcolor: "#fffbeb", color: "#b45309", fontWeight: 700, fontSize: "0.68rem", height: 22 }}
                    />
                    <Chip
                      size="small"
                      label={`${metrics.preparingCount} Cooking`}
                      sx={{ bgcolor: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: "0.68rem", height: 22 }}
                    />
                  </Stack>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: metrics.activeKitchenCount > 0 ? "#fffbeb" : "#f1f5f9",
                    color: metrics.activeKitchenCount > 0 ? "#d97706" : "#64748b",
                  }}
                >
                  <SoupKitchenIcon />
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Card 4: Average Order Value (AOV) */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: "#ffffff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 16px -2px rgba(0,0,0,0.05)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 24px -4px rgba(0,0,0,0.08)" },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem" }}>
                    Avg Order Value (AOV)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", my: 0.5 }}>
                    ₹{metrics.aov}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                    Per completed order
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "#faf5ff",
                    color: "#9333ea",
                  }}
                >
                  <TrendingUpIcon />
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Card 5: Menu Dish Library & Inventory Alerts */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: "#ffffff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 16px -2px rgba(0,0,0,0.05)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 24px -4px rgba(0,0,0,0.08)" },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem" }}>
                    Menu Dishes
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", my: 0.5 }}>
                    {inventoryMetrics.totalDishes}
                  </Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Chip
                      size="small"
                      label={`${inventoryMetrics.lowStock.length} Low Stock`}
                      sx={{ bgcolor: "#fff7ed", color: "#c2410c", fontWeight: 700, fontSize: "0.68rem", height: 22 }}
                    />
                    <Chip
                      size="small"
                      label={`${inventoryMetrics.outOfStock.length} Out`}
                      sx={{ bgcolor: "#fef2f2", color: "#dc2626", fontWeight: 700, fontSize: "0.68rem", height: 22 }}
                    />
                  </Stack>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "#fff7ed",
                    color: "#ea580c",
                  }}
                >
                  <RestaurantMenuIcon />
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Card 6: Registered User Base */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: "#ffffff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 16px -2px rgba(0,0,0,0.05)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 24px -4px rgba(0,0,0,0.08)" },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem" }}>
                    Registered Users
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", my: 0.5 }}>
                    {userStats.student + userStats.staff + userStats.admin}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                    {userStats.student} Students • {userStats.staff} Staff • {userStats.admin} Admins
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "#f0fdf4",
                    color: "#16a34a",
                  }}
                >
                  <PeopleAltIcon />
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Card 7: Active Collaborative Tables */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: "#ffffff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 16px -2px rgba(0,0,0,0.05)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 24px -4px rgba(0,0,0,0.08)" },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem" }}>
                    Dining Sessions
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", my: 0.5 }}>
                    {activeTables.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                    Active collaborative groups
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "#f0fdfa",
                    color: "#0d9488",
                  }}
                >
                  <TableRestaurantRoundedIcon />
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Card 8: Admin Wallet Reserve */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: "#ffffff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 16px -2px rgba(0,0,0,0.05)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 24px -4px rgba(0,0,0,0.08)" },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem" }}>
                    Admin Vault Reserve
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#7c3aed", my: 0.5 }}>
                    ₹{walletTotal.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                    Combined admin balances
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "#ede9fe",
                    color: "#7c3aed",
                  }}
                >
                  <Inventory2Icon />
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* 3. REAL-TIME ORDER PIPELINE (4-Step Funnel) */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3.5,
          bgcolor: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px -2px rgba(0,0,0,0.04)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#1e293b", letterSpacing: -0.5 }}>
              Live Order Fulfillment Pipeline
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Visual breakdown of all order lifecycles and kitchen throughput
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            endIcon={<ArrowForwardRoundedIcon />}
            onClick={() => navigate("/orders")}
            sx={{
              mt: { xs: 1.5, sm: 0 },
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.8rem",
              color: "#2563eb",
              borderColor: "#bfdbfe",
              "&:hover": { borderColor: "#3b82f6", bgcolor: "#eff6ff" },
            }}
          >
            Manage Orders
          </Button>
        </Stack>

        <Grid container spacing={2}>
          {/* Step 1: Pending */}
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "#fffbeb",
                border: "1.5px solid #fef3c7",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#f59e0b" }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#92400e" }}>
                    Pending
                  </Typography>
                </Stack>
                <Chip
                  size="small"
                  label={metrics.totalOrdersCount > 0 ? `${Math.round((orderStatusStats.pending / metrics.totalOrdersCount) * 100)}%` : "0%"}
                  sx={{ bgcolor: "#fef3c7", color: "#b45309", fontWeight: 800, fontSize: "0.7rem", height: 20 }}
                />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#b45309" }}>
                {orderStatusStats.pending}
              </Typography>
              <Typography variant="caption" sx={{ color: "#78350f" }}>
                Awaiting kitchen acceptance
              </Typography>
            </Box>
          </Grid>

          {/* Step 2: Preparing */}
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "#eff6ff",
                border: "1.5px solid #dbeafe",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#3b82f6" }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#1e40af" }}>
                    Preparing
                  </Typography>
                </Stack>
                <Chip
                  size="small"
                  label={metrics.totalOrdersCount > 0 ? `${Math.round((orderStatusStats.preparing / metrics.totalOrdersCount) * 100)}%` : "0%"}
                  sx={{ bgcolor: "#dbeafe", color: "#1d4ed8", fontWeight: 800, fontSize: "0.7rem", height: 20 }}
                />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#1d4ed8" }}>
                {orderStatusStats.preparing}
              </Typography>
              <Typography variant="caption" sx={{ color: "#1e3a8a" }}>
                Currently cooking in kitchen
              </Typography>
            </Box>
          </Grid>

          {/* Step 3: Completed */}
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "#ecfdf5",
                border: "1.5px solid #d1fae5",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#10b981" }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#065f46" }}>
                    Completed
                  </Typography>
                </Stack>
                <Chip
                  size="small"
                  label={metrics.totalOrdersCount > 0 ? `${Math.round((orderStatusStats.completed / metrics.totalOrdersCount) * 100)}%` : "0%"}
                  sx={{ bgcolor: "#d1fae5", color: "#047857", fontWeight: 800, fontSize: "0.7rem", height: 20 }}
                />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#047857" }}>
                {orderStatusStats.completed}
              </Typography>
              <Typography variant="caption" sx={{ color: "#064e3b" }}>
                Fulfilled & picked up
              </Typography>
            </Box>
          </Grid>

          {/* Step 4: Cancelled */}
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "#fef2f2",
                border: "1.5px solid #fee2e2",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#ef4444" }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#991b1b" }}>
                    Cancelled
                  </Typography>
                </Stack>
                <Chip
                  size="small"
                  label={metrics.totalOrdersCount > 0 ? `${Math.round((orderStatusStats.cancelled / metrics.totalOrdersCount) * 100)}%` : "0%"}
                  sx={{ bgcolor: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: "0.7rem", height: 20 }}
                />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#b91c1c" }}>
                {orderStatusStats.cancelled}
              </Typography>
              <Typography variant="caption" sx={{ color: "#7f1d1d" }}>
                Rejected or voided
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 4. REVENUE & SALES VELOCITY (Time-Series Interactive Chart) */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3.5,
          bgcolor: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px -2px rgba(0,0,0,0.04)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#1e293b", letterSpacing: -0.5 }}>
              Sales & Order Velocity Trends
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Daily tracking of customer orders and canteen revenue over time
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            {/* View Metric Mode Toggle */}
            <ToggleButtonGroup
              value={trendMetric}
              exclusive
              onChange={(e, val) => val && setTrendMetric(val)}
              size="small"
              sx={{
                bgcolor: "#f1f5f9",
                p: 0.5,
                borderRadius: 2,
                "& .MuiToggleButton-root": {
                  border: "none",
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 0.5,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  textTransform: "none",
                  color: "#64748b",
                  "&.Mui-selected": {
                    bgcolor: "#ffffff",
                    color: "#1e293b",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                  },
                },
              }}
            >
              <ToggleButton value="revenue">Revenue (₹)</ToggleButton>
              <ToggleButton value="orders">Orders Count</ToggleButton>
              <ToggleButton value="both">Combined</ToggleButton>
            </ToggleButtonGroup>

            {/* Timeframe selector */}
            <ToggleButtonGroup
              value={selectedDays}
              exclusive
              onChange={(e, val) => val && handleTimelineChange(val)}
              size="small"
              sx={{
                bgcolor: "#f1f5f9",
                p: 0.5,
                borderRadius: 2,
                "& .MuiToggleButton-root": {
                  border: "none",
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 0.5,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  textTransform: "none",
                  color: "#64748b",
                  "&.Mui-selected": {
                    bgcolor: "#3b82f6",
                    color: "white",
                    boxShadow: "0 2px 6px rgba(59,130,246,0.3)",
                    "&:hover": { bgcolor: "#2563eb" },
                  },
                },
              }}
            >
              <ToggleButton value={7}>7 Days</ToggleButton>
              <ToggleButton value={14}>14 Days</ToggleButton>
              <ToggleButton value={30}>30 Days</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        {timelineDates.length > 0 ? (
          <Chart
            type="area"
            height={340}
            series={
              trendMetric === "revenue"
                ? [{ name: "Revenue (₹)", data: timelineRevenues }]
                : trendMetric === "orders"
                ? [{ name: "Orders Placed", data: timelineCounts }]
                : [
                    { name: "Revenue (₹)", data: timelineRevenues },
                    { name: "Orders Placed", data: timelineCounts },
                  ]
            }
            options={{
              chart: {
                toolbar: { show: false },
                zoom: { enabled: false },
                fontFamily: "inherit",
              },
              colors: trendMetric === "orders" ? ["#3b82f6"] : ["#10b981", "#3b82f6"],
              fill: {
                type: "gradient",
                gradient: {
                  shadeIntensity: 1,
                  opacityFrom: 0.45,
                  opacityTo: 0.05,
                  stops: [0, 95, 100],
                },
              },
              stroke: {
                curve: "smooth",
                width: 3,
              },
              markers: {
                size: 4,
                strokeWidth: 2,
                hover: { size: 6 },
              },
              xaxis: {
                categories: timelineDates,
                labels: {
                  style: { colors: "#64748b", fontSize: "11px", fontWeight: 600 },
                  rotate: -30,
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
              },
              yaxis:
                trendMetric === "both"
                  ? [
                      {
                        title: { text: "Revenue (₹)", style: { color: "#10b981", fontWeight: 700 } },
                        labels: {
                          formatter: (val) => `₹${Math.round(val)}`,
                          style: { colors: "#64748b" },
                        },
                      },
                      {
                        opposite: true,
                        title: { text: "Orders", style: { color: "#3b82f6", fontWeight: 700 } },
                        labels: {
                          formatter: (val) => `${Math.round(val)}`,
                          style: { colors: "#64748b" },
                        },
                      },
                    ]
                  : {
                      labels: {
                        formatter: (val) =>
                          trendMetric === "revenue" ? `₹${Math.round(val)}` : `${Math.round(val)}`,
                        style: { colors: "#64748b" },
                      },
                    },
              grid: {
                borderColor: "#f1f5f9",
                strokeDashArray: 4,
              },
              tooltip: {
                theme: "light",
                shared: true,
                intersect: false,
                y: {
                  formatter: (val, opts) => {
                    const isRevenue = opts?.seriesIndex === 0 && trendMetric !== "orders";
                    return isRevenue ? `₹${Number(val).toFixed(2)}` : `${val} orders`;
                  },
                },
              },
            }}
          />
        ) : (
          <Box sx={{ height: 300, display: "grid", placeItems: "center", color: "#94a3b8" }}>
            <Typography>No timeline data available for the selected period</Typography>
          </Box>
        )}
      </Paper>

      {/* 5. DISTRIBUTION & OPERATIONAL BREAKDOWNS (3-Column Donut Charts) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Chart 1: Order Status Distribution */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3.5,
              height: "100%",
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px -2px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#1e293b", mb: 0.5 }}>
              Status Breakdown
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", mb: 2 }}>
              Orders categorized by active state
            </Typography>
            <Box sx={{ flexGrow: 1, display: "grid", placeItems: "center", minHeight: 280 }}>
              <Chart
                type="donut"
                height={280}
                series={[
                  orderStatusStats.pending || 0,
                  orderStatusStats.preparing || 0,
                  orderStatusStats.completed || 0,
                  orderStatusStats.cancelled || 0,
                ]}
                options={{
                  labels: ["Pending", "Preparing", "Completed", "Cancelled"],
                  colors: ["#f59e0b", "#3b82f6", "#10b981", "#ef4444"],
                  legend: { position: "bottom", fontWeight: 600, fontSize: "12px" },
                  plotOptions: {
                    pie: {
                      donut: {
                        size: "70%",
                        labels: {
                          show: true,
                          total: {
                            show: true,
                            label: "Total Orders",
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#64748b",
                            formatter: () => `${metrics.totalOrdersCount}`,
                          },
                        },
                      },
                    },
                  },
                  dataLabels: { enabled: false },
                }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Chart 2: Pre-Order vs Normal Orders */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3.5,
              height: "100%",
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px -2px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#1e293b", mb: 0.5 }}>
              Order Modes
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", mb: 2 }}>
              Pre-scheduled vs immediate orders
            </Typography>
            <Box sx={{ flexGrow: 1, display: "grid", placeItems: "center", minHeight: 280 }}>
              <Chart
                type="donut"
                height={280}
                series={[orderStats.preOrder || 0, orderStats.normalOrder || 0]}
                options={{
                  labels: ["Pre-Orders", "Instant / Now"],
                  colors: ["#8b5cf6", "#3b82f6"],
                  legend: { position: "bottom", fontWeight: 600, fontSize: "12px" },
                  plotOptions: {
                    pie: {
                      donut: {
                        size: "70%",
                        labels: {
                          show: true,
                          total: {
                            show: true,
                            label: "Total Orders",
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#64748b",
                            formatter: () => `${(orderStats.preOrder || 0) + (orderStats.normalOrder || 0)}`,
                          },
                        },
                      },
                    },
                  },
                  dataLabels: {
                    enabled: true,
                    formatter: (val) => `${val.toFixed(0)}%`,
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Chart 3: Menu Categories Share */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3.5,
              height: "100%",
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px -2px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#1e293b", mb: 0.5 }}>
              Menu Category Share
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", mb: 2 }}>
              Item distribution across menu categories
            </Typography>
            <Box sx={{ flexGrow: 1, display: "grid", placeItems: "center", minHeight: 280 }}>
              {Object.keys(foodStats).length > 0 ? (
                <Chart
                  type="donut"
                  height={280}
                  series={Object.values(foodStats)}
                  options={{
                    labels: Object.keys(foodStats),
                    colors: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"],
                    legend: { position: "bottom", fontWeight: 600, fontSize: "12px" },
                    plotOptions: {
                      pie: {
                        donut: {
                          size: "70%",
                          labels: {
                            show: true,
                            total: {
                              show: true,
                              label: "Total Dishes",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#64748b",
                              formatter: () => `${inventoryMetrics.totalDishes}`,
                            },
                          },
                        },
                      },
                    },
                    dataLabels: { enabled: false },
                  }}
                />
              ) : (
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>No categories configured</Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 6. CATEGORY-WISE PERFORMANCE COMPARISON (Units Sold vs Revenue Bar Chart) */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3.5,
          bgcolor: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px -2px rgba(0,0,0,0.04)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#1e293b", letterSpacing: -0.5 }}>
              Category Comparative Sales Analytics
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Dynamic performance benchmark across categories over the past {selectedDays} days
            </Typography>
          </Box>

          <ToggleButtonGroup
            value={filterType}
            exclusive
            onChange={(e, val) => val && setFilterType(val)}
            size="small"
            sx={{
              bgcolor: "#f1f5f9",
              p: 0.5,
              borderRadius: 2,
              "& .MuiToggleButton-root": {
                border: "none",
                borderRadius: 1.5,
                px: 2,
                py: 0.5,
                fontWeight: 700,
                fontSize: "0.75rem",
                textTransform: "none",
                color: "#64748b",
                "&.Mui-selected": {
                  bgcolor: "#3b82f6",
                  color: "white",
                  boxShadow: "0 2px 6px rgba(59,130,246,0.3)",
                },
              },
            }}
          >
            <ToggleButton value="units">Units Sold</ToggleButton>
            <ToggleButton value="revenue">Revenue Generated (₹)</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {dynamicCategories.length > 0 ? (
          <Chart
            type="bar"
            height={320}
            series={dynamicCategories.map((cat) => {
              const source = filterType === "units" ? categoryCrossStats : categoryRevenueStats;
              const dates = Object.keys(source);
              return {
                name: `${getCategoryEmoji(cat)} ${cat}`,
                data: dates.map((d) => source[d]?.[cat] || 0),
              };
            })}
            options={{
              chart: {
                stacked: false,
                toolbar: { show: false },
                fontFamily: "inherit",
              },
              colors: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"],
              plotOptions: {
                bar: {
                  horizontal: false,
                  columnWidth: "55%",
                  borderRadius: 3,
                },
              },
              dataLabels: { enabled: false },
              stroke: { show: true, width: 2, colors: ["transparent"] },
              xaxis: {
                categories: Object.keys(filterType === "units" ? categoryCrossStats : categoryRevenueStats),
                labels: {
                  rotate: -30,
                  style: { colors: "#64748b", fontSize: "11px", fontWeight: 600 },
                },
              },
              yaxis: {
                labels: {
                  formatter: (val) =>
                    filterType === "units" ? `${Math.round(val)}` : `₹${Math.round(val)}`,
                  style: { colors: "#64748b" },
                },
              },
              grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
              tooltip: {
                theme: "light",
                y: {
                  formatter: (val) =>
                    filterType === "units" ? `${val} units` : `₹${Number(val).toFixed(2)}`,
                },
              },
              legend: { position: "top", fontWeight: 600 },
            }}
          />
        ) : (
          <Box sx={{ height: 280, display: "grid", placeItems: "center", color: "#94a3b8" }}>
            <Typography>No category sales data recorded in this timeframe</Typography>
          </Box>
        )}
      </Paper>

      {/* 7. TWO-COLUMN SPLIT: TOP SELLERS LEADERBOARD & INVENTORY STOCK ALERTS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Column 1: Top 5 Best-Selling Dishes */}
        <Grid item xs={12} lg={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3.5,
              height: "100%",
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px -2px rgba(0,0,0,0.04)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LocalFireDepartmentRoundedIcon sx={{ color: "#ea580c" }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: "#1e293b", letterSpacing: -0.5 }}>
                    Top Best-Selling Dishes
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "#64748b" }}>
                  Ranked by cumulative volume and customer demand
                </Typography>
              </Box>
              <Button
                size="small"
                variant="text"
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate("/menu")}
                sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.8rem", color: "#2563eb" }}
              >
                View Menu
              </Button>
            </Stack>

            {topSellers.length > 0 ? (
              <Stack spacing={1.5}>
                {topSellers.map((item, idx) => (
                  <Box
                    key={item.id}
                    sx={{
                      p: 1.75,
                      borderRadius: 2.5,
                      bgcolor: idx === 0 ? "#fffbeb" : "#f8fafc",
                      border: idx === 0 ? "1.5px solid #fef3c7" : "1px solid #f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "transform 0.15s ease",
                      "&:hover": { transform: "translateX(4px)" },
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          bgcolor: idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#b45309" : "#e2e8f0",
                          color: idx < 3 ? "white" : "#64748b",
                          fontWeight: 800,
                          fontSize: "0.8rem",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <Avatar
                        src={item.image}
                        variant="rounded"
                        sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: "#e2e8f0" }}
                      >
                        {getCategoryEmoji(item.category)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0f172a", textTransform: "capitalize" }}>
                          {item.name}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={item.category}
                            size="small"
                            sx={{ height: 18, fontSize: "0.65rem", fontWeight: 600, bgcolor: "rgba(0,0,0,0.05)" }}
                          />
                          <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                            ₹{item.price} each
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>

                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#059669" }}>
                        ₹{item.revenue.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
                        {item.unitsSold} sold
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Box sx={{ p: 4, textAlign: "center", color: "#94a3b8" }}>
                <Typography variant="body2">No sales data recorded yet</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Column 2: Inventory Stock Health Monitor */}
        <Grid item xs={12} lg={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3.5,
              height: "100%",
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px -2px rgba(0,0,0,0.04)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <WarningAmberRoundedIcon sx={{ color: "#dc2626" }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: "#1e293b", letterSpacing: -0.5 }}>
                    Inventory Health & Low Stock Alerts
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "#64748b" }}>
                  Items requiring immediate replenishment or out of stock
                </Typography>
              </Box>
              <Chip
                size="small"
                label={`${inventoryMetrics.totalAlerts} Attention Needed`}
                sx={{
                  bgcolor: inventoryMetrics.totalAlerts > 0 ? "#fef2f2" : "#ecfdf5",
                  color: inventoryMetrics.totalAlerts > 0 ? "#dc2626" : "#059669",
                  fontWeight: 800,
                  fontSize: "0.72rem",
                }}
              />
            </Stack>

            {inventoryMetrics.totalAlerts > 0 ? (
              <Stack spacing={1.5}>
                {[...inventoryMetrics.outOfStock, ...inventoryMetrics.lowStock].slice(0, 5).map((dish) => {
                  const isOut = !dish.inStock || Number(dish.stock || 0) === 0;
                  return (
                    <Box
                      key={dish._id}
                      sx={{
                        p: 1.75,
                        borderRadius: 2.5,
                        bgcolor: isOut ? "#fef2f2" : "#fff7ed",
                        border: isOut ? "1.5px solid #fee2e2" : "1px solid #ffedd5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          src={dish.image}
                          variant="rounded"
                          sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: "#e2e8f0" }}
                        >
                          {getCategoryEmoji(dish.category)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0f172a", textTransform: "capitalize" }}>
                            {dish.itemname}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              label={dish.category}
                              size="small"
                              sx={{ height: 18, fontSize: "0.65rem", fontWeight: 600, bgcolor: "rgba(0,0,0,0.05)" }}
                            />
                            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                              ₹{dish.price}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>

                      <Box sx={{ textAlign: "right" }}>
                        <Chip
                          size="small"
                          label={isOut ? "OUT OF STOCK" : `LOW: ${dish.stock} left`}
                          sx={{
                            bgcolor: isOut ? "#dc2626" : "#ea580c",
                            color: "white",
                            fontWeight: 800,
                            fontSize: "0.68rem",
                            height: 22,
                          }}
                        />
                        <Typography variant="caption" sx={{ display: "block", color: "#64748b", mt: 0.25, fontWeight: 600 }}>
                          Restock recommended
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Box
                sx={{
                  p: 4,
                  textAlign: "center",
                  borderRadius: 2.5,
                  bgcolor: "#f0fdf4",
                  border: "1px dashed #86efac",
                }}
              >
                <CheckCircleRoundedIcon sx={{ fontSize: 40, color: "#16a34a", mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#166534" }}>
                  All Stock Levels Healthy
                </Typography>
                <Typography variant="caption" sx={{ color: "#15803d" }}>
                  Every item on the menu has sufficient quantity in stock
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* 8. LIVE RECENT ORDERS ACTIVITY STREAM (Operational Table) */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3.5,
          bgcolor: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px -2px rgba(0,0,0,0.04)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ mb: 2.5 }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <ReceiptLongRoundedIcon sx={{ color: "#2563eb" }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#1e293b", letterSpacing: -0.5 }}>
                Recent Live Orders Activity Stream
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Latest transactions processed through the canteen system
            </Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            endIcon={<ArrowForwardRoundedIcon />}
            onClick={() => navigate("/orders")}
            sx={{
              bgcolor: "#2563eb",
              color: "white",
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.8rem",
              px: 2,
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            All Orders ({metrics.totalOrdersCount})
          </Button>
        </Stack>

        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.75rem", py: 1.5 }}>ORDER #</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.75rem", py: 1.5 }}>CUSTOMER</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.75rem", py: 1.5 }}>ITEMS</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.75rem", py: 1.5 }}>AMOUNT</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.75rem", py: 1.5 }}>TYPE</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.75rem", py: 1.5 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.75rem", py: 1.5, textAlign: "right" }}>PLACED</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => {
                  const statusColors = {
                    pending: { bg: "#fffbeb", text: "#b45309", border: "#fef3c7" },
                    preparing: { bg: "#eff6ff", text: "#1d4ed8", border: "#dbeafe" },
                    completed: { bg: "#ecfdf5", text: "#047857", border: "#d1fae5" },
                    cancelled: { bg: "#fef2f2", text: "#b91c1c", border: "#fee2e2" },
                  };
                  const st = String(order.status || "pending").toLowerCase();
                  const stColor = statusColors[st] || statusColors.pending;

                  const itemsList = Array.isArray(order.items)
                    ? order.items.map((it) => it.itemname || "Item").join(", ")
                    : "—";

                  return (
                    <TableRow key={order._id} hover sx={{ "&:last-child td": { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {order.orderNumber || "—"}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Avatar
                            src={order.user?.avatar}
                            sx={{ width: 28, height: 28, fontSize: "0.75rem", bgcolor: "#3b82f6" }}
                          >
                            {(order.orderedBy || "U").charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                              {order.orderedBy}
                            </Typography>
                            {order.user?.rollNo && (
                              <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.7rem" }}>
                                {order.user.rollNo}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <Typography variant="body2" sx={{ color: "#475569", fontSize: "0.8rem" }}>
                          {itemsList}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.85rem" }}>
                        ₹{Number(order.totalprice ?? order.amount ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={order.pre ? "Pre-Order" : "Order Now"}
                          sx={{
                            bgcolor: order.pre ? "#faf5ff" : "#f1f5f9",
                            color: order.pre ? "#7c3aed" : "#475569",
                            fontWeight: 700,
                            fontSize: "0.68rem",
                            height: 22,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={st.toUpperCase()}
                          sx={{
                            bgcolor: stColor.bg,
                            color: stColor.text,
                            border: `1px solid ${stColor.border}`,
                            fontWeight: 800,
                            fontSize: "0.68rem",
                            height: 22,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: "right", color: "#64748b", fontSize: "0.75rem", fontWeight: 600 }}>
                        {timeAgo(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 4, color: "#94a3b8" }}>
                    No recent orders found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 9. LIVE ACTIVE COLLABORATIVE DINING SESSIONS (If Any) */}
      {activeTables.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3.5,
            bgcolor: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 20px -2px rgba(0,0,0,0.04)",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <TableRestaurantRoundedIcon sx={{ color: "#0d9488" }} />
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#1e293b", letterSpacing: -0.5 }}>
                  Active Collaborative Dining Sessions
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                Students currently sharing live group carts
              </Typography>
            </Box>
            <Chip
              label={`${activeTables.length} Active Tables`}
              size="small"
              sx={{ bgcolor: "#f0fdfa", color: "#0d9488", fontWeight: 800 }}
            />
          </Stack>

          <Grid container spacing={2}>
            {activeTables.map((tbl) => (
              <Grid item xs={12} sm={6} md={4} key={tbl._id}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                      {tbl.tableName || tbl.tableId}
                    </Typography>
                    <Chip
                      size="small"
                      label={tbl.orderType || "Order Now"}
                      sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700, bgcolor: "#ecfdf5", color: "#047857" }}
                    />
                  </Stack>
                  <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                    Host: <strong>{tbl.creator}</strong> {tbl.creatorRollNo ? `(${tbl.creatorRollNo})` : ""}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 0.5 }}>
                    Members: {tbl.members?.length || 1} • Cart Items: {tbl.items?.length || 0}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* WITHDRAW DIALOG MODAL */}
      <Dialog
        open={withdrawDialog}
        onClose={() => !withdrawing && setWithdrawDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3.5, p: 1 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1.25rem", color: "#0f172a", pb: 1 }}>
          Withdraw From Wallet
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", mb: 2 }}>
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
              Available Balance
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#10b981", mt: 0.5 }}>
              ₹{(currentWalletBalance || 0).toFixed(2)}
            </Typography>
          </Box>
          <TextField
            autoFocus
            fullWidth
            label="Withdraw Amount (₹)"
            type="number"
            inputProps={{ min: 1, step: "any" }}
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            disabled={withdrawing}
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: 2.5 },
            }}
          />
          {parseFloat(withdrawAmount) > (currentWalletBalance || 0) && (
            <Typography variant="caption" sx={{ color: "#dc2626", display: "block", mt: 1, fontWeight: 600 }}>
              Amount exceeds your current wallet balance
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setWithdrawDialog(false)}
            disabled={withdrawing}
            sx={{ textTransform: "none", fontWeight: 700, color: "#64748b" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleWithdraw}
            disabled={
              withdrawing ||
              !withdrawAmount ||
              parseFloat(withdrawAmount) <= 0 ||
              parseFloat(withdrawAmount) > (currentWalletBalance || 0)
            }
            sx={{
              bgcolor: "#10b981",
              color: "white",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              px: 3,
              "&:hover": { bgcolor: "#059669" },
            }}
          >
            {withdrawing ? "Processing..." : "Confirm Withdraw"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
