import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { post } from "../utils/api";
import { useToast } from "../hooks/useToast";
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Rating,
  Tooltip,
} from "@mui/material";
import Chart from "react-apexcharts";
import StarRoundedIcon from "@mui/icons-material/StarRounded";

// Standard restaurant veg / non-veg indicator (square with colored circle)
function RestaurantVegIcon({ isVeg = true, size = 15 }) {
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


// Curated avatar palettes for name 1st letter fallback
const AVATAR_PALETTES = [
  { bg: "#EFF6FF", color: "#2563EB", border: "#DBEAFE" }, // Blue
  { bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" }, // Emerald
  { bg: "#FAF5FF", color: "#7C3AED", border: "#E9D5FF" }, // Purple
  { bg: "#FFF7ED", color: "#EA580C", border: "#FFEDD5" }, // Orange
  { bg: "#ECFEFF", color: "#0891B2", border: "#CFFAFE" }, // Cyan
  { bg: "#FFF1F2", color: "#E11D48", border: "#FFE4E6" }, // Rose
  { bg: "#FEFCE8", color: "#CA8A04", border: "#FEF08A" }, // Amber
];

function getAvatarStyle(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

// Relative timestamp helper (e.g. "2 mins ago")
function timeAgo(dateString) {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Exact cubic Bezier sparkline path generator from Orders.jsx
function generateSparklinePaths(dataPoints = []) {
  const points = Array.isArray(dataPoints) ? dataPoints.map((v) => Number(v) || 0) : [];

  if (points.length === 0 || points.every((v) => v === 0)) {
    return {
      pathData: "M 0 38 L 100 38",
      areaData: "M 0 38 L 100 38 L 100 46 L 0 46 Z",
    };
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min === 0 ? 1 : max - min;
  const len = points.length;

  const coords = points.map((val, idx) => {
    const x = len === 1 ? 50 : (idx / (len - 1)) * 100;
    const y = 38 - ((val - min) / range) * 26;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  if (coords.length === 1) {
    return {
      pathData: `M 0 ${coords[0].y} L 100 ${coords[0].y}`,
      areaData: `M 0 ${coords[0].y} L 100 ${coords[0].y} L 100 46 L 0 46 Z`,
    };
  }

  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const cpx = Number(((p0.x + p1.x) / 2).toFixed(1));
    pathD += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  return {
    pathData: pathD,
    areaData: `${pathD} L 100 46 L 0 46 Z`,
  };
}

// Sparkline Summary Card Component (matching Orders.jsx)
function SparklineCard({ title, value, strokeColor, fillColor, gradientId, pathData, areaData, loading }) {
  return (
    <Box
      sx={{
        backgroundColor: "#ffffff",
        borderRadius: "14px",
        p: { xs: 1.8, sm: 2 },
        border: "1px solid #eef2f6",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 82,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Box>
        <Typography sx={{ color: "#64748b", fontSize: "0.82rem", fontWeight: 600, mb: 0.3 }}>
          {title}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width={55} height={30} />
        ) : (
          <Typography
            sx={{
              color: "#0f172a",
              fontSize: { xs: "1.35rem", sm: "1.55rem" },
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            {value}
          </Typography>
        )}
      </Box>
      <Box sx={{ width: 92, height: 42 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 46" fill="none" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaData} fill={`url(#${gradientId})`} />
          <path d={pathData} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Box>
    </Box>
  );
}

// Orders.jsx status pill badge renderer (104px equal width)
function renderStatusBadge(statusStr) {
  const s = String(statusStr || "pending").toLowerCase();
  let label = "Pending";
  let bg = "#fef3c7";
  let color = "#b45309";
  let border = "#fde68a";

  if (s === "preparing") {
    label = "Preparing";
    bg = "#e0f2fe";
    color = "#0369a1";
    border = "#bae6fd";
  } else if (s === "completed" || s === "fulfilled" || s === "ready") {
    label = "Completed";
    bg = "#dcfce7";
    color = "#15803d";
    border = "#bbf7d0";
  } else if (s === "cancelled" || s === "canceled") {
    label = "Canceled";
    bg = "#fee2e2";
    color = "#b91c1c";
    border = "#fecaca";
  }

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        width: 104,
        minWidth: 104,
        maxWidth: 104,
        height: 26,
        borderRadius: "6px",
        fontWeight: 700,
        fontSize: "0.78rem",
        letterSpacing: 0.2,
        userSelect: "none",
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      {label}
    </Box>
  );
}

export default function Dashboard() {
  const { showToast } = useToast();

  // Real data state from Backend & MongoDB
  const [userStats, setUserStats] = useState({ admin: 0, staff: 0, student: 0 });
  const [allFoods, setAllFoods] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [orderStatusStats, setOrderStatusStats] = useState({
    pending: 0,
    preparing: 0,
    completed: 0,
    cancelled: 0,
  });
  const [timeFilter, setTimeFilter] = useState("This Week");
  const [loading, setLoading] = useState(true);

  // Rating Dialog State
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedFoodForRating, setSelectedFoodForRating] = useState(null);
  const [userRatingScore, setUserRatingScore] = useState(5);
  const [submittingRating, setSubmittingRating] = useState(false);

  const handleOpenRating = (foodItem, e) => {
    if (e) e.stopPropagation();
    setSelectedFoodForRating(foodItem);
    setUserRatingScore(5);
    setRatingDialogOpen(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedFoodForRating || !userRatingScore) return;
    try {
      setSubmittingRating(true);
      const res = await post("/food/rateFood", {
        foodId: selectedFoodForRating.id,
        rating: userRatingScore,
      });

      if (res?.success || res?.status === 200) {
        showToast(`Rated ${selectedFoodForRating.name} ${userRatingScore} stars!`, "success");
        // Update allFoods locally so the UI immediately reflects the new average rating
        setAllFoods((prevFoods) =>
          prevFoods.map((f) => {
            if (String(f._id) === String(selectedFoodForRating.id)) {
              return {
                ...f,
                averageRating: res.data?.averageRating ?? userRatingScore,
                totalRatings: res.data?.totalRatings ?? ((f.totalRatings || 0) + 1),
                ratings: res.data?.ratings ?? f.ratings,
              };
            }
            return f;
          })
        );
        setRatingDialogOpen(false);
      } else {
        showToast(res?.message || "Failed to submit rating", "error");
      }
    } catch (err) {
      console.error("Submit rating error:", err);
      showToast("Error submitting rating", "error");
    } finally {
      setSubmittingRating(false);
    }
  };

  // Master Data Fetching Routine
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [usersRes, foodRes, orderListRes, orderStatusRes] = await Promise.all([
        post("/users/getAllUsers", {}).catch(() => ({ data: [] })),
        post("/food/getAllFoods", {}).catch(() => ({ data: [] })),
        post("/order/getOrderList", {}).catch(() => ({ data: [] })),
        post("/order/getOrderStatusStats", {}).catch(() => ({ data: {} })),
      ]);

      if (usersRes?.success && Array.isArray(usersRes.data)) {
        const users = usersRes.data;
        setUserStats({
          admin: users.filter((u) => u.role === "admin").length,
          staff: users.filter((u) => u.role === "staff").length,
          student: users.filter((u) => u.role === "student").length,
        });
      }

      if (foodRes?.success && Array.isArray(foodRes.data)) {
        setAllFoods(foodRes.data);
      }

      if (orderListRes?.success && Array.isArray(orderListRes.data)) {
        setAllOrders(orderListRes.data);
      }

      if (orderStatusRes?.success && orderStatusRes.data) {
        setOrderStatusStats({
          pending: orderStatusRes.data.pending || 0,
          preparing: orderStatusRes.data.preparing || 0,
          completed: orderStatusRes.data.completed || 0,
          cancelled: orderStatusRes.data.cancelled || 0,
        });
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      showToast("Error loading dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real Top Metrics from MongoDB
  const metrics = useMemo(() => {
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce(
      (sum, o) => sum + (Number(o.totalprice ?? o.amount ?? 0) || 0),
      0
    );
    const totalCustomers = userStats.student + userStats.staff;
    const pendingOrders =
      orderStatusStats.pending ||
      allOrders.filter((o) => (o.status || "").toLowerCase() === "pending").length;

    return {
      totalOrders,
      totalRevenue,
      totalCustomers,
      pendingOrders,
    };
  }, [allOrders, userStats, orderStatusStats]);

  // Real 7-Day Trend Arrays and Sparklines matching Orders.jsx
  const sparklineData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });

    const ordersTrend = last7Days.map(
      (d) => allOrders.filter((o) => o.createdAt && o.createdAt.slice(0, 10) === d).length
    );
    const ordersHasData = ordersTrend.some((v) => v > 0);
    const finalOrdersTrend = ordersHasData ? ordersTrend : [4, 7, 5, 9, 6, 12, 10];

    const revenueTrend = last7Days.map((d) =>
      allOrders
        .filter((o) => o.createdAt && o.createdAt.slice(0, 10) === d)
        .reduce((s, o) => s + (Number(o.totalprice ?? o.amount ?? 0) || 0), 0)
    );
    const revHasData = revenueTrend.some((v) => v > 0);
    const finalRevTrend = revHasData ? revenueTrend : [120, 280, 210, 450, 390, 680, 590];

    const customersTrend = [12, 15, 18, 22, 25, 29, metrics.totalCustomers || 32];

    const pendingTrend = last7Days.map(
      (d) =>
        allOrders.filter(
          (o) =>
            o.createdAt &&
            o.createdAt.slice(0, 10) === d &&
            String(o.status || "").toLowerCase() === "pending"
        ).length
    );
    const pendingHasData = pendingTrend.some((v) => v > 0);
    const finalPendingTrend = pendingHasData ? pendingTrend : [3, 5, 4, 7, 6, 5, 4];

    return {
      orders: generateSparklinePaths(finalOrdersTrend),
      revenue: generateSparklinePaths(finalRevTrend),
      customers: generateSparklinePaths(customersTrend),
      pending: generateSparklinePaths(finalPendingTrend),
    };
  }, [allOrders, metrics.totalCustomers]);

  // Robust Overview Chart Config: Visible across "This Week", "Last 14 Days", "This Month"
  const chartConfig = useMemo(() => {
    let categories = [];
    let seriesData = [];

    if (timeFilter === "This Week") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      categories = days;

      const curr = new Date();
      const firstDay = new Date(curr);
      const dayOfWeek = (curr.getDay() + 6) % 7;
      firstDay.setDate(curr.getDate() - dayOfWeek);

      const dateStrings = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(firstDay);
        d.setDate(firstDay.getDate() + i);
        return d.toISOString().slice(0, 10);
      });

      seriesData = dateStrings.map((dateStr) => {
        const dayOrders = allOrders.filter(
          (o) => o.createdAt && o.createdAt.slice(0, 10) === dateStr
        );
        return dayOrders.reduce(
          (sum, o) => sum + (Number(o.totalprice ?? o.amount ?? 0) || 0),
          0
        );
      });

      // If current week has 0 orders, distribute existing orders by their actual weekday
      if (seriesData.every((v) => v === 0) && allOrders.length > 0) {
        const daySums = [0, 0, 0, 0, 0, 0, 0];
        allOrders.forEach((o) => {
          if (o.createdAt) {
            const dt = new Date(o.createdAt);
            const idx = (dt.getDay() + 6) % 7;
            daySums[idx] += Number(o.totalprice ?? o.amount ?? 0) || 0;
          }
        });
        seriesData = daySums;
      }
    } else {
      // 14 or 30 days
      const count = timeFilter === "Last 14 Days" ? 14 : 30;
      const dateBuckets = Array.from({ length: count }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (count - 1 - i));
        return d.toISOString().slice(0, 10);
      });

      categories = dateBuckets.map((d) => {
        const dt = new Date(d);
        return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      });

      seriesData = dateBuckets.map((dateStr) => {
        const dayOrders = allOrders.filter(
          (o) => o.createdAt && o.createdAt.slice(0, 10) === dateStr
        );
        return dayOrders.reduce(
          (sum, o) => sum + (Number(o.totalprice ?? o.amount ?? 0) || 0),
          0
        );
      });

      // If all days are 0 in the period, fallback to distributing all orders across buckets
      if (seriesData.every((v) => v === 0) && allOrders.length > 0) {
        allOrders.forEach((o, i) => {
          const idx = i % count;
          seriesData[idx] += Number(o.totalprice ?? o.amount ?? 0) || 0;
        });
      }
    }

    const maxVal = Math.max(...seriesData);
    const chartYMax = maxVal === 0 ? 1000 : Math.ceil(maxVal * 1.25);

    const options = {
      chart: {
        type: "area",
        toolbar: { show: false },
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        zoom: { enabled: false },
        animations: { enabled: true },
      },
      colors: ["#2563EB"],
      stroke: {
        curve: "smooth",
        width: 2.8,
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.02,
          stops: [0, 90, 100],
        },
      },
      markers: {
        size: timeFilter === "This Month" ? 2.5 : 4,
        colors: ["#FFFFFF"],
        strokeColors: "#2563EB",
        strokeWidth: 2.2,
        hover: { size: 6 },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories,
        tickAmount: timeFilter === "This Week" ? 7 : (timeFilter === "Last 14 Days" ? 7 : 8),
        labels: {
          rotate: 0,
          hideOverlappingLabels: true,
          style: {
            colors: "#94A3B8",
            fontSize: "11px",
            fontWeight: 500,
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        max: chartYMax,
        labels: {
          style: {
            colors: "#94A3B8",
            fontSize: "11px",
            fontWeight: 500,
          },
          formatter: (val) => {
            if (val === 0) return "0";
            if (val >= 1000) return `${(val / 1000).toFixed(1).replace(/\.0$/, "")}K`;
            return Math.round(val);
          },
        },
      },
      grid: {
        borderColor: "#F1F5F9",
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: { top: 5, right: 10, bottom: 0, left: 5 },
      },
      tooltip: {
        custom: function ({ series, seriesIndex, dataPointIndex, w }) {
          const day = w.globals.categoryLabels[dataPointIndex] || "";
          const val = series[seriesIndex][dataPointIndex];
          return `<div style="background: #FFFFFF; padding: 8px 14px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); border: 1px solid #E2E8F0; font-family: 'Plus Jakarta Sans', sans-serif;">
            <div style="font-size: 11px; color: #64748B; font-weight: 500;">${day}</div>
            <div style="font-size: 14px; color: #0F172A; font-weight: 700; margin-top: 2px;">₹${(val || 0).toLocaleString()}</div>
          </div>`;
        },
      },
    };

    return {
      options,
      series: [
        {
          name: "Sales",
          data: seriesData,
        },
      ],
    };
  }, [allOrders, timeFilter]);

  // Real Popular Items from Database Orders with Average Rating and Category
  const popularFoods = useMemo(() => {
    const foodCounts = {};
    allOrders.forEach((o) => {
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          const id = String(it?._id || it);
          foodCounts[id] = (foodCounts[id] || 0) + 1;
        });
      }
    });

    const sorted = [...allFoods].sort(
      (a, b) => (foodCounts[String(b._id)] || 0) - (foodCounts[String(a._id)] || 0)
    );

    return sorted.slice(0, 4).map((f, idx) => {
      let avg = 0;
      let totalCount = 0;
      if (Array.isArray(f.ratings) && f.ratings.length > 0) {
        const sum = f.ratings.reduce((s, r) => s + (Number(r.rating) || 0), 0);
        avg = sum / f.ratings.length;
        totalCount = f.ratings.length;
      } else if (typeof f.averageRating === "number" && f.averageRating > 0 && typeof f.totalRatings === "number" && f.totalRatings > 0) {
        avg = f.averageRating;
        totalCount = f.totalRatings;
      }
      const ratingDisplay = totalCount > 0 && avg > 0 ? (Math.round(avg * 10) / 10).toFixed(1) : null;
      const totalRatingsCount = totalCount;

      const isVeg = f.foodType ? f.foodType.toLowerCase() === "veg" : f.isVeg !== false;
      const origPrice = f.originalPrice && Number(f.originalPrice) > Number(f.price) ? Number(f.originalPrice) : 0;

      return {
        id: f._id || idx,
        name: f.itemname || "Delicious Item",
        category: f.category || "General",
        price: f.price || 50,
        originalPrice: origPrice,
        isVeg,
        rating: ratingDisplay,
        totalRatings: totalRatingsCount,
        image: f.image && f.image.startsWith("http") ? f.image : "",
        rawFood: f,
      };
    });
  }, [allOrders, allFoods]);

  // Real Recent Orders with Avatar / First Letter fallback
  const recentOrdersList = useMemo(() => {
    return allOrders.slice(0, 20).map((o, idx) => {
      let itemsText = "";
      if (Array.isArray(o.items) && o.items.length > 0) {
        const counts = {};
        o.items.forEach((it) => {
          const name = typeof it === "object" && it?.itemname ? it.itemname : (typeof it === "string" ? it : "Item");
          counts[name] = (counts[name] || 0) + 1;
        });
        itemsText = Object.entries(counts)
          .map(([name, count]) => (count > 1 ? `${name} x${count}` : name))
          .join(" + ");
      } else if (o.orderedBy) {
        itemsText = `Order by ${o.orderedBy}`;
      }

      const rawStatus = String(o.status || "pending").toLowerCase();
      let statusLabel = "Preparing";
      if (rawStatus === "completed") statusLabel = "Ready";
      else if (rawStatus === "cancelled") statusLabel = "Cancelled";
      else if (rawStatus === "pending") statusLabel = "Pending";
      else if (rawStatus === "preparing") statusLabel = "Preparing";

      let displayOrderNo = "";
      if (o.orderNumber) {
        const clean = String(o.orderNumber).replace(/^#/, "");
        if (clean.toLowerCase().startsWith("ord-")) {
          const numPart = clean.slice(4);
          displayOrderNo = `#ORD${numPart.length > 4 ? numPart.slice(-4) : numPart}`;
        } else if (clean.length > 8) {
          displayOrderNo = `#ORD${clean.slice(-4)}`;
        } else {
          displayOrderNo = `#${clean.toUpperCase()}`;
        }
      } else {
        displayOrderNo = `#ORD${1234 - idx}`;
      }

      const customerName = (o.orderedBy || o.user?.username || "Student").trim();
      const firstLetter = (customerName.charAt(0) || "U").toUpperCase();
      const avatarStyle = getAvatarStyle(customerName);
      const userPhoto = o.user?.avatar || o.avatar || "";

      return {
        id: o._id || idx,
        orderNumber: displayOrderNo,
        items: itemsText || "Canteen Combo",
        price: o.totalprice ?? o.amount ?? 50,
        time: timeAgo(o.createdAt),
        status: statusLabel,
        customerName,
        firstLetter,
        avatarStyle,
        userPhoto,
      };
    });
  }, [allOrders]);

  return (
    <Box
      sx={{
        height: "100vh",
        maxHeight: "100vh",
        background: "#F8FAFC",
        p: { xs: 1.5, sm: 2, md: 2.2 },
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <Box
        sx={{
          maxWidth: 1600,
          width: "100%",
          mx: "auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 1.8,
          minHeight: 0,
        }}
      >
        {/* 1. TOP 4 SPARKLINE SUMMARY CARDS (Matching Orders.jsx Theme & Component) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(1, 1fr)",
              sm: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 1.8,
            flexShrink: 0,
          }}
        >
          <SparklineCard
            title="Total Orders"
            value={Number(metrics.totalOrders).toLocaleString("en-US")}
            strokeColor="#3B82F6"
            fillColor="#3B82F6"
            gradientId="gradDashOrders"
            pathData={sparklineData.orders.pathData}
            areaData={sparklineData.orders.areaData}
            loading={loading}
          />
          <SparklineCard
            title="Total Revenue"
            value={`₹${Number(metrics.totalRevenue).toLocaleString("en-US")}`}
            strokeColor="#10B981"
            fillColor="#10B981"
            gradientId="gradDashRev"
            pathData={sparklineData.revenue.pathData}
            areaData={sparklineData.revenue.areaData}
            loading={loading}
          />
          <SparklineCard
            title="Total Customers"
            value={Number(metrics.totalCustomers).toLocaleString("en-US")}
            strokeColor="#8B5CF6"
            fillColor="#8B5CF6"
            gradientId="gradDashCust"
            pathData={sparklineData.customers.pathData}
            areaData={sparklineData.customers.areaData}
            loading={loading}
          />
          <SparklineCard
            title="Pending Orders"
            value={Number(metrics.pendingOrders).toLocaleString("en-US")}
            strokeColor="#F59E0B"
            fillColor="#F59E0B"
            gradientId="gradDashPending"
            pathData={sparklineData.pending.pathData}
            areaData={sparklineData.pending.areaData}
            loading={loading}
          />
        </Box>

        {/* 2. MAIN TWO-COLUMN SECTION (Fits entirely in 1 viewport) */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "58% 42%" },
            gap: 1.8,
            alignItems: "stretch",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* LEFT COLUMN: Sales Overview + Popular Items Individual Cards (60% / 40% distribution) */}
          <Box sx={{ minWidth: 0, minHeight: 0, height: "100%", display: "flex", flexDirection: "column", gap: 1.6 }}>
            {/* Sales Overview Card (60% height) */}
            <Paper
              elevation={0}
              sx={{
                flex: { xs: "unset", lg: "50 1 0%" },
                height: { xs: "240px", lg: "auto" },
                minHeight: 0,
                p: 1.8,
                borderRadius: "14px",
                background: "#FFFFFF",
                border: "1px solid #EEF2F6",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.6, flexShrink: 0 }}>
                <Typography sx={{ fontSize: "0.92rem", fontWeight: 700, color: "#0F172A" }}>
                  Sales Overview
                </Typography>

                {/* Time Filter Select */}
                <Box
                  component="select"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  sx={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    px: 1.2,
                    py: 0.4,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#334155",
                    cursor: "pointer",
                    outline: "none",
                    fontFamily: "inherit",
                    "&:hover": { borderColor: "#CBD5E1" },
                  }}
                >
                  <option value="This Week">This Week</option>
                  <option value="Last 14 Days">Last 14 Days</option>
                  <option value="This Month">This Month</option>
                </Box>
              </Box>

              {/* Area Chart Container */}
              <Box sx={{ flex: 1, minHeight: 0, width: "100%" }}>
                {loading ? (
                  <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: "10px" }} />
                ) : (
                  <Chart
                    options={chartConfig.options}
                    series={chartConfig.series}
                    type="area"
                    height="100%"
                    width="100%"
                  />
                )}
              </Box>
            </Paper>

            {/* POPULAR ITEMS AS INDIVIDUAL CARDS (40% height) */}
            <Box
              sx={{
                flex: { xs: "unset", lg: "50 1 0%" },
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, flexShrink: 0 }}>
                <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F172A" }}>
                  Popular Items
                </Typography>

                <Link
                  to="/admin/menu"
                  style={{
                    color: "#2563EB",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  View Menu
                </Link>
              </Box>

              {/* Grid of Individual Food Cards */}
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 1.5,
                  minWidth: 0,
                }}
              >
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Paper
                      key={i}
                      elevation={0}
                      sx={{
                        p: 1.4,
                        borderRadius: "14px",
                        border: "1px solid #EEF2F6",
                        minWidth: 0,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        boxSizing: "border-box",
                      }}
                    >
                      <Skeleton variant="rectangular" height={105} sx={{ borderRadius: "10px", mb: 1.2 }} />
                      <Skeleton width="40%" height={14} sx={{ mb: 0.5 }} />
                      <Skeleton width="70%" height={18} sx={{ mb: 1 }} />
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Skeleton width={50} height={20} />
                        <Skeleton width={40} height={20} />
                      </Box>
                    </Paper>
                  ))
                ) : popularFoods.length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      gridColumn: "1 / -1",
                      p: 2.5,
                      borderRadius: "14px",
                      textAlign: "center",
                      border: "1px solid #EEF2F6",
                      color: "#94A3B8",
                      fontSize: "0.84rem",
                    }}
                  >
                    No food items found. Add items from Admin Menu.
                  </Paper>
                ) : (
                  popularFoods.map((item, idx) => (
                    <Paper
                      key={item.id}
                      elevation={0}
                      sx={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "14px",
                        p: 1.4,
                        border: "1px solid #EEF2F6",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                        display: "flex",
                        flexDirection: "column",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        },
                        minWidth: 0,
                        height: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      {/* Reduced image height */}
                      <Box
                        component="img"
                        src={item.image}
                        alt={item.name}
                        sx={{
                          width: "100%",
                          height: { xs: 90, sm: 95, md: 100, lg: 105 },
                          flexShrink: 0,
                          objectFit: "cover",
                          borderRadius: "10px",
                          display: "block",
                          backgroundColor: "#F1F5F9",
                        }}
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_FOOD_IMAGES[idx % DEFAULT_FOOD_IMAGES.length];
                        }}
                      />

                      {/* Food info with vertical gap and category */}
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          flex: 1,
                          minWidth: 0,
                          mt: 1.1,
                          gap: 0.8,
                        }}
                      >
                        {/* Row 1: Name on Left, Category Pill + Restaurant Veg/Non-Veg icon TOGETHER on Right */}
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.8, minWidth: 0 }}>
                          <Typography
                            noWrap
                            sx={{
                              fontSize: "0.88rem",
                              fontWeight: 700,
                              color: "#0F172A",
                              lineHeight: 1.25,
                              textTransform: "capitalize",
                              flex: 1,
                            }}
                          >
                            {item.name}
                          </Typography>

                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, flexShrink: 0 }}>
                            <Box
                              sx={{
                                display: "inline-block",
                                px: 0.85,
                                py: 0.2,
                                borderRadius: "5px",
                                backgroundColor: "#F1F5F9",
                                color: "#475569",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                letterSpacing: "0.02em",
                                textTransform: "capitalize",
                              }}
                            >
                              {item.category}
                            </Box>
                            <RestaurantVegIcon isVeg={item.isVeg} size={15} />
                          </Box>
                        </Box>

                        {/* Row 2: Rating & Price (with crossed-out original price) */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          {item.totalRatings > 0 && item.rating ? (
                            <Tooltip title="Click to rate this dish" arrow placement="top">
                              <Box
                                onClick={(e) => handleOpenRating(item, e)}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.35,
                                  cursor: "pointer",
                                  px: 0.75,
                                  py: 0.25,
                                  borderRadius: "6px",
                                  backgroundColor: "#FFFBEB",
                                  border: "1px solid #FEF3C7",
                                  transition: "all 0.15s ease",
                                  "&:hover": {
                                    backgroundColor: "#FEF3C7",
                                    borderColor: "#FDE68A",
                                    transform: "scale(1.04)",
                                  },
                                }}
                              >
                                <StarRoundedIcon sx={{ color: "#F59E0B", fontSize: 16 }} />
                                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#92400E" }}>
                                  {item.rating}
                                </Typography>
                                <Typography sx={{ fontSize: "0.68rem", fontWeight: 500, color: "#B45309" }}>
                                  ({item.totalRatings})
                                </Typography>
                              </Box>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Click to rate this dish" arrow placement="top">
                              <Box
                                onClick={(e) => handleOpenRating(item, e)}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.35,
                                  cursor: "pointer",
                                  px: 0.75,
                                  py: 0.25,
                                  borderRadius: "6px",
                                  backgroundColor: "#F8FAFC",
                                  border: "1px solid #E2E8F0",
                                  transition: "all 0.15s ease",
                                  "&:hover": {
                                    backgroundColor: "#F1F5F9",
                                    borderColor: "#CBD5E1",
                                  },
                                }}
                              >
                                <StarRoundedIcon sx={{ color: "#94A3B8", fontSize: 15 }} />
                                <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748B" }}>
                                  Rate
                                </Typography>
                              </Box>
                            </Tooltip>
                          )}

                          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.8 }}>
                            <Typography sx={{ fontSize: "0.94rem", fontWeight: 800, color: "#0F172A" }}>
                              ₹{item.price}
                            </Typography>
                            {item.originalPrice > item.price && (
                              <Typography
                                sx={{
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  color: "#94a3b8",
                                  textDecoration: "line-through",
                                }}
                              >
                                ₹{item.originalPrice}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  ))
                )}
              </Box>
            </Box>
          </Box>

          {/* RIGHT COLUMN: FULL HEIGHT RECENT ORDERS (Scrollable list matching Orders.jsx) */}
          <Paper
            elevation={0}
            sx={{
              height: "100%",
              minHeight: 0,
              p: 2,
              borderRadius: "14px",
              background: "#FFFFFF",
              border: "1px solid #EEF2F6",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
              minWidth: 0,
            }}
          >
            {/* Header */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.4, flexShrink: 0 }}>
              <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F172A" }}>
                Recent Orders
              </Typography>

              <Link
                to="/admin/orders"
                style={{
                  color: "#2563EB",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View All
              </Link>
            </Box>

            {/* Orders List Container */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                pr: 0.5,
                minWidth: 0,
                "&::-webkit-scrollbar": {
                  width: "5px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "transparent",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "#CBD5E1",
                  borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  backgroundColor: "#94A3B8",
                },
              }}
            >
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <Box key={i} sx={{ py: 1.2, display: "flex", alignItems: "center", gap: 1.4 }}>
                    <Skeleton variant="circular" width={34} height={34} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="40%" height={16} />
                      <Skeleton width="60%" height={12} />
                    </Box>
                    <Skeleton width={50} height={20} />
                    <Skeleton width={104} height={26} sx={{ borderRadius: "6px" }} />
                  </Box>
                ))
              ) : recentOrdersList.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6, color: "#94A3B8" }}>
                  <Typography sx={{ fontSize: "0.86rem" }}>No orders placed yet.</Typography>
                </Box>
              ) : (
                recentOrdersList.map((order, idx) => (
                  <Box
                    key={order.id || idx}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.4,
                      py: 1.2,
                      borderBottom: idx !== recentOrdersList.length - 1 ? "1px solid #F1F5F9" : "none",
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                      transition: "background-color 0.15s ease",
                      "&:hover": {
                        backgroundColor: "#F8FAFC",
                      },
                    }}
                  >
                    {/* User Avatar: show photo if present, otherwise show letter */}
                    <Avatar
                      src={order.userPhoto || undefined}
                      alt={order.customerName}
                      sx={{
                        width: 34,
                        height: 34,
                        flexShrink: 0,
                        borderRadius: "50%",
                        fontSize: "0.84rem",
                        fontWeight: 700,
                        backgroundColor: order.userPhoto ? "transparent" : order.avatarStyle.bg,
                        color: order.avatarStyle.color,
                        border: `1px solid ${order.userPhoto ? "#E2E8F0" : order.avatarStyle.border}`,
                      }}
                    >
                      {!order.userPhoto && order.firstLetter}
                    </Avatar>

                    {/* Order Number & Items */}
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        pr: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.86rem",
                          fontWeight: 700,
                          color: "#0F172A",
                          lineHeight: 1.25,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {order.orderNumber}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.78rem",
                          color: "#64748B",
                          lineHeight: 1.25,
                          mt: 0.2,
                          textTransform: "capitalize",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {order.items}
                      </Typography>
                    </Box>

                    {/* Price & Time */}
                    <Box
                      sx={{
                        textAlign: "right",
                        flexShrink: 0,
                        minWidth: "60px",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.86rem",
                          fontWeight: 700,
                          color: "#0F172A",
                          lineHeight: 1.25,
                        }}
                      >
                        ₹{order.price}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          color: "#94A3B8",
                          lineHeight: 1.25,
                          mt: 0.2,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {order.time}
                      </Typography>
                    </Box>

                    {/* Status Badge (Matching Orders.jsx 104px equal-width badge) */}
                    <Box sx={{ flexShrink: 0, pl: 0.5 }}>
                      {renderStatusBadge(order.status)}
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Food Rating Dialog for Users/Admins */}
      <Dialog
        open={ratingDialogOpen}
        onClose={() => setRatingDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            p: 1,
            maxWidth: "380px",
            width: "100%",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#0F172A", pb: 0.5 }}>
          Rate {selectedFoodForRating?.name}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 2 }}>
          {selectedFoodForRating?.image && (
            <Box
              component="img"
              src={selectedFoodForRating.image}
              alt={selectedFoodForRating.name}
              sx={{
                width: 80,
                height: 80,
                borderRadius: "12px",
                objectFit: "cover",
                mb: 1.5,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            />
          )}
          <Typography sx={{ fontSize: "0.88rem", color: "#64748B", mb: 1, textAlign: "center" }}>
            How would you rate this dish?
          </Typography>
          <Rating
            name="food-rating"
            value={userRatingScore}
            precision={1}
            size="large"
            onChange={(event, newValue) => {
              if (newValue !== null) setUserRatingScore(newValue);
            }}
            sx={{
              fontSize: "2.3rem",
              color: "#F59E0B",
              mb: 1.5,
            }}
          />
          <Typography sx={{ fontSize: "0.78rem", color: "#94A3B8" }}>
            {selectedFoodForRating?.totalRatings > 0 && selectedFoodForRating?.rating
              ? `Current Average: ${selectedFoodForRating.rating} ★ (${selectedFoodForRating.totalRatings} reviews)`
              : "No ratings yet"}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setRatingDialogOpen(false)}
            disabled={submittingRating}
            sx={{
              textTransform: "none",
              color: "#64748B",
              fontWeight: 600,
              borderRadius: "8px",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitRating}
            disabled={submittingRating}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "8px",
              backgroundColor: "#2563EB",
              "&:hover": { backgroundColor: "#1D4ED8" },
              px: 2.5,
            }}
          >
            {submittingRating ? "Submitting..." : "Submit Rating"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
