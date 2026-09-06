import { useState, useEffect, useCallback, useMemo, useContext } from "react";
import { CartContext } from "../context/CartContext";
import { useSnackbar } from "../hooks/useSnackbar";
import { post } from "../utils/api";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Avatar,
  Stack,
  Tooltip,
  TablePagination,
  Skeleton,
  CircularProgress,
  TableSortLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import ReceiptIcon from "@mui/icons-material/Receipt";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import SoupKitchenRoundedIcon from "@mui/icons-material/SoupKitchenRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

// Barcode scanner keyboard listener
function listenToKeyboardInput(callback) {
  let buffer = "";
  const timeoutDuration = 100;
  let timeout;

  const handleKeydown = (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    if (e.key === "Enter") {
      if (buffer.trim()) {
        callback(buffer.trim());
      }
      buffer = "";
      clearTimeout(timeout);
    } else if (e.key.length === 1) {
      buffer += e.key;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        buffer = "";
      }, timeoutDuration);
    }
  };

  window.addEventListener("keydown", handleKeydown);
  return () => {
    window.removeEventListener("keydown", handleKeydown);
    clearTimeout(timeout);
  };
}

// Generate mathematical cubic Bezier sparkline path from real data points
function generateSparklinePaths(dataPoints = []) {
  const points = Array.isArray(dataPoints) ? dataPoints.map((v) => Number(v) || 0) : [];

  // If no data or all values are 0, return a clean flat baseline at y=38
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

  // Map to SVG coordinates (viewBox: 0 0 100 46; y range between 10 and 38)
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

// Sparkline Summary Card Component
function SparklineCard({ title, value, strokeColor, fillColor, gradientId, pathData, areaData, loading }) {
  return (
    <Box
      sx={{
        backgroundColor: "#ffffff",
        borderRadius: "14px",
        p: { xs: 2, sm: 2.2 },
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
          <Typography sx={{ color: "#0f172a", fontSize: { xs: "1.35rem", sm: "1.55rem" }, fontWeight: 800, lineHeight: 1.1 }}>
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

// Created Date Formatter (e.g. "Aug 1, 2024")
function formatCreatedDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

export default function Orders() {
  const { user } = useContext(CartContext);
  const { enqueueSnackbar } = useSnackbar();

  const rawRole = String(user?.role || "student").toLowerCase();
  const isAdminOrStaff = rawRole.includes("admin") || rawRole.includes("staff");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'pending' | 'preparing' | 'completed' | 'canceled'
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Sorting state for table header click sorting
  const [orderBy, setOrderBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Real graph statistics fetched from DB aggregation
  const [graphData, setGraphData] = useState({
    pending: { count: 0, trend: [] },
    preparing: { count: 0, trend: [] },
    completed: { count: 0, trend: [] },
    cancelled: { count: 0, trend: [] },
  });
  const [graphLoading, setGraphLoading] = useState(false);

  // Dialog states
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [selectedOrderPopup, setSelectedOrderPopup] = useState(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedCancelOrder, setSelectedCancelOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch real order graph statistics for admin view
  const fetchGraphCards = useCallback(async (isSilent = false) => {
    if (!isAdminOrStaff) return;
    if (!isSilent) setGraphLoading(true);
    try {
      const res = await post("/order/getOrderGraphCards", {});
      if (res && res.data) {
        setGraphData(res.data);
      }
    } catch (err) {
      if (!isSilent) console.error("Failed to load real order graph cards:", err);
    } finally {
      if (!isSilent) setGraphLoading(false);
    }
  }, [isAdminOrStaff]);

  // Fetch orders based on role (supports silent background polling)
  const fetchOrders = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const endpoint = isAdminOrStaff ? "/order/getOrderList" : "/order/getUserOrderList";
        const res = await post(endpoint, {});
        if (res && res.data && Array.isArray(res.data)) {
          setOrders(res.data);
        }
        if (isAdminOrStaff) {
          fetchGraphCards(isSilent);
        }
      } catch (err) {
        if (!isSilent) {
          setOrders([]);
          enqueueSnackbar(err?.message || "Failed to fetch orders", { variant: "error" });
        }
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [isAdminOrStaff, fetchGraphCards, enqueueSnackbar]
  );

  // Initial fetch and 2-second background polling without page reload
  useEffect(() => {
    // Initial fetch (shows skeleton/loading state)
    fetchOrders(false);

    // Silent background poll every 2 seconds
    const intervalId = setInterval(() => {
      fetchOrders(true);
    }, 2000);

    return () => clearInterval(intervalId);
  }, [fetchOrders]);

  // Barcode scanner listener for admin/staff
  const processBarcode = useCallback(
    async (barcode) => {
      if (!isAdminOrStaff) return;
      if (!barcode.trim()) {
        enqueueSnackbar("Empty barcode received", { variant: "warning" });
        return;
      }
      try {
        const res = await post("/order/markCompleteByBarcode", { barcode });
        if (res && res.data) {
          const updatedOrderNumber = res.data.orderNumber;
          setOrders((prev) =>
            prev.map((o) =>
              String(o.orderNumber).toLowerCase() === String(updatedOrderNumber).toLowerCase()
                ? { ...o, status: "completed" }
                : o
            )
          );
          fetchGraphCards(true);
          enqueueSnackbar(`Order ${updatedOrderNumber} marked as fulfilled!`, { variant: "success" });
        } else {
          enqueueSnackbar(res?.message || "Barcode not found", { variant: "warning" });
        }
      } catch (err) {
        enqueueSnackbar(`Barcode processing failed: ${err?.message || "Unknown error"}`, { variant: "error" });
      }
    },
    [isAdminOrStaff, fetchGraphCards, enqueueSnackbar]
  );

  useEffect(() => {
    if (!isAdminOrStaff) return;
    const cleanup = listenToKeyboardInput(processBarcode);
    return cleanup;
  }, [isAdminOrStaff, processBarcode]);

  // Real SVG sparkline paths computed dynamically from DB trend arrays
  const pendingSvg = useMemo(() => generateSparklinePaths(graphData.pending?.trend ?? graphData.unfulfilled?.trend), [graphData.pending?.trend, graphData.unfulfilled?.trend]);
  const preparingSvg = useMemo(() => generateSparklinePaths(graphData.preparing?.trend ?? graphData.pendingReceipt?.trend), [graphData.preparing?.trend, graphData.pendingReceipt?.trend]);
  const completedSvg = useMemo(() => generateSparklinePaths(graphData.completed?.trend ?? graphData.fulfilled?.trend), [graphData.completed?.trend, graphData.fulfilled?.trend]);
  const cancelledSvg = useMemo(() => generateSparklinePaths(graphData.cancelled?.trend), [graphData.cancelled?.trend]);

  // Filter orders according to active tab and search query
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Filter by Tab: All orders | Pending | Preparing | Completed | Canceled
    if (activeTab === "pending") {
      result = result.filter((o) => String(o.status || "").toLowerCase() === "pending");
    } else if (activeTab === "preparing") {
      result = result.filter((o) => String(o.status || "").toLowerCase() === "preparing");
    } else if (activeTab === "completed") {
      result = result.filter((o) => {
        const s = String(o.status || "").toLowerCase();
        return s === "completed" || s === "fulfilled";
      });
    } else if (activeTab === "canceled") {
      result = result.filter((o) => {
        const s = String(o.status || "").toLowerCase();
        return s === "cancelled" || s === "canceled";
      });
    }
    // activeTab === 'all' retains all orders

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((o) => {
        const orderNum = String(o.orderNumber || "").toLowerCase();
        const customer = String(o.orderedBy || o.user?.username || "").toLowerCase();
        const rollNo = String(o.user?.rollNo || "").toLowerCase();
        return orderNum.includes(q) || customer.includes(q) || rollNo.includes(q);
      });
    }

    return result;
  }, [orders, activeTab, searchQuery]);

  // Sort orders according to orderBy & order direction on header click
  const sortedOrders = useMemo(() => {
    if (!orderBy) return filteredOrders;
    return [...filteredOrders].sort((a, b) => {
      let aVal, bVal;
      if (orderBy === "customer") {
        aVal = (a.user?.username || a.orderedBy || "").toLowerCase();
        bVal = (b.user?.username || b.orderedBy || "").toLowerCase();
        return order === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else if (orderBy === "orderNumber") {
        aVal = String(a.orderNumber || "").toLowerCase();
        bVal = String(b.orderNumber || "").toLowerCase();
        return order === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else if (orderBy === "orderType") {
        aVal = a.pre ? 1 : 0;
        bVal = b.pre ? 1 : 0;
        return order === "asc" ? aVal - bVal : bVal - aVal;
      } else if (orderBy === "items") {
        aVal = a.items ? a.items.length : 0;
        bVal = b.items ? b.items.length : 0;
        return order === "asc" ? aVal - bVal : bVal - aVal;
      } else if (orderBy === "total") {
        aVal = Number(a.totalprice || a.total || a.amount || 0);
        bVal = Number(b.totalprice || b.total || b.amount || 0);
        return order === "asc" ? aVal - bVal : bVal - aVal;
      } else if (orderBy === "status") {
        aVal = String(a.status || "").toLowerCase();
        bVal = String(b.status || "").toLowerCase();
        return order === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else if (orderBy === "createdAt") {
        aVal = new Date(a.createdAt || 0).getTime();
        bVal = new Date(b.createdAt || 0).getTime();
        return order === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [filteredOrders, orderBy, order]);

  // Pagination slice
  const paginatedOrders = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedOrders.slice(start, start + rowsPerPage);
  }, [sortedOrders, page, rowsPerPage]);

  // Actions
  const handleAcceptPreparing = async (orderNumber) => {
    setActionLoading(true);
    try {
      const res = await post("/order/markPreparing", { orderNumber });
      if (res && res.data) {
        setOrders((prev) =>
          prev.map((o) =>
            String(o.orderNumber).toLowerCase() === String(orderNumber).toLowerCase()
              ? { ...o, status: "preparing" }
              : o
          )
        );
        fetchGraphCards(true);
        enqueueSnackbar(`Order ${orderNumber} is now preparing`, { variant: "success" });
      }
    } catch (err) {
      enqueueSnackbar(err?.message || "Failed to update order to preparing", { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCompleted = async (orderNumber) => {
    setActionLoading(true);
    try {
      const res = await post("/order/markCompleteByBarcode", { barcode: orderNumber });
      if (res && res.data) {
        setOrders((prev) =>
          prev.map((o) =>
            String(o.orderNumber).toLowerCase() === String(orderNumber).toLowerCase()
              ? { ...o, status: "completed" }
              : o
          )
        );
        fetchGraphCards(true);
        enqueueSnackbar(`Order ${orderNumber} marked as fulfilled!`, { variant: "success" });
      } else {
        enqueueSnackbar(res?.message || "Failed to complete order", { variant: "warning" });
      }
    } catch (err) {
      enqueueSnackbar(err?.message || "Failed to mark order as completed", { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const openCancelModal = (order) => {
    setSelectedCancelOrder(order);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedCancelOrder) return;
    setActionLoading(true);
    try {
      const username = selectedCancelOrder.orderedBy || user.username;
      const uidRes = await post("/users/getUserId", { username });
      const userDetails = uidRes?.data;
      const res = await post("/users/cancelOrder", {
        userDetails,
        orderNumber: selectedCancelOrder.orderNumber,
        cancelBy: user.username,
      });
      if (res && res.success) {
        enqueueSnackbar(res.message || "Order cancelled successfully", { variant: "success" });
        await fetchOrders(true);
        fetchGraphCards(true);
      } else {
        enqueueSnackbar(res?.message || "Failed to cancel order", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err?.message || "Error cancelling order", { variant: "error" });
    } finally {
      setActionLoading(false);
      setCancelDialogOpen(false);
      setSelectedCancelOrder(null);
    }
  };

  // Open Order Popup on click of Order ID
  const handleOpenOrderPopup = (order) => {
    setSelectedOrderPopup(order);
    setCopiedOrderId(false);
    const url =
      order.receiptImageUrl ||
      order.receiptImageurl ||
      order.receiptImageUrlNoBarcode ||
      "";
    setReceiptUrl(url);
    setReceiptOpen(true);
  };

  // Copy Order ID Handler with feedback
  const handleCopyOrderId = async (orderId) => {
    if (!orderId) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(orderId);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = orderId;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedOrderId(true);
      enqueueSnackbar(`Order ID "${orderId.toUpperCase()}" copied to clipboard!`, { variant: "success" });
      setTimeout(() => setCopiedOrderId(false), 2500);
    } catch (err) {
      enqueueSnackbar("Failed to copy order ID", { variant: "error" });
    }
  };

  const openQr = (order) => {
    if (order.qrcode) {
      setQrData(order.qrcode);
      setQrOpen(true);
    } else {
      enqueueSnackbar("QR code not generated for this order.", { variant: "info" });
    }
  };

  // Helper to render Order Type Badge with consistent, equal width (104px)
  const renderOrderTypeBadge = (order) => {
    const isPre = Boolean(order.pre);
    const label = isPre ? "Pre-Order" : "Ordered Now";
    const bg = isPre ? "#8b5cf6" : "#059669"; // purple for Pre-Order, emerald for Ordered Now

    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          color: "#ffffff",
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
  };

  // Helper to render Order Status Badge (Pending, Preparing, Completed, Canceled) with exact same width (104px)
  const renderStatusBadge = (statusStr) => {
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
    } else if (s === "completed" || s === "fulfilled") {
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
  };

  const tableGridCols = "minmax(200px, 1fr) 130px 125px 90px 110px 120px 120px 100px";

  return (
    <Box
      sx={{
        backgroundColor: "#f8fafc",
        height: "100vh",
        p: { xs: 2, sm: 2.5, md: 3 },
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
          gap: { xs: 1.5, sm: 2 },
          minHeight: 0,
        }}
      >
        {/* 1. TOP 4 GRAPH CARDS (Visible to Admin/Staff View - Dynamically calculated from MongoDB) */}
        {isAdminOrStaff && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(1, 1fr)", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
              gap: 2,
              flexShrink: 0,
            }}
          >
            <SparklineCard
              title="Pending"
              value={Number(graphData.pending?.count ?? graphData.unfulfilled?.count ?? 0).toLocaleString("en-US")}
              strokeColor="#f59e0b"
              fillColor="#f59e0b"
              gradientId="gradAmber"
              pathData={pendingSvg.pathData}
              areaData={pendingSvg.areaData}
              loading={graphLoading}
            />
            <SparklineCard
              title="Preparing"
              value={Number(graphData.preparing?.count ?? graphData.pendingReceipt?.count ?? 0).toLocaleString("en-US")}
              strokeColor="#3b82f6"
              fillColor="#3b82f6"
              gradientId="gradBlue"
              pathData={preparingSvg.pathData}
              areaData={preparingSvg.areaData}
              loading={graphLoading}
            />
            <SparklineCard
              title="Completed"
              value={Number(graphData.completed?.count ?? graphData.fulfilled?.count ?? 0).toLocaleString("en-US")}
              strokeColor="#10b981"
              fillColor="#10b981"
              gradientId="gradGreen"
              pathData={completedSvg.pathData}
              areaData={completedSvg.areaData}
              loading={graphLoading}
            />
            <SparklineCard
              title="Cancelled"
              value={Number(graphData.cancelled?.count || 0).toLocaleString("en-US")}
              strokeColor="#ef4444"
              fillColor="#ef4444"
              gradientId="gradRed"
              pathData={cancelledSvg.pathData}
              areaData={cancelledSvg.areaData}
              loading={graphLoading}
            />
          </Box>
        )}

        {/* 2. HORIZONTAL TAB NAVIGATION & SEARCH */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e2e8f0",
            pb: 0.2,
            flexWrap: "wrap",
            gap: 2,
            flexShrink: 0,
          }}
        >
          {/* Tabs */}
          <Stack direction="row" spacing={{ xs: 2.5, sm: 4 }} alignItems="center" sx={{ overflowX: "auto" }}>
            {[
              { id: "all", label: "All orders" },
              { id: "pending", label: "Pending" },
              { id: "preparing", label: "Preparing" },
              { id: "completed", label: "Completed" },
              { id: "canceled", label: "Canceled" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Typography
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(0);
                  }}
                  sx={{
                    fontSize: "0.95rem",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#2563eb" : "#64748b",
                    cursor: "pointer",
                    py: 1.2,
                    position: "relative",
                    whiteSpace: "nowrap",
                    transition: "color 0.15s ease",
                    "&:hover": {
                      color: "#1d4ed8",
                    },
                    "&::after": isActive
                      ? {
                          content: '""',
                          position: "absolute",
                          bottom: -1,
                          left: 0,
                          right: 0,
                          height: "2.5px",
                          backgroundColor: "#2563eb",
                          borderRadius: "2px 2px 0 0",
                        }
                      : {},
                  }}
                >
                  {tab.label}
                </Typography>
              );
            })}
          </Stack>

          {/* Search bar on the right */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              size="small"
              placeholder="Search orders, customers..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: { xs: "100%", sm: 260 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  fontSize: "0.88rem",
                  border: "1px solid #e2e8f0",
                  "&:hover": { borderColor: "#cbd5e1" },
                  "&.Mui-focused": {
                    borderColor: "#3b82f6",
                    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                  },
                  "& fieldset": { border: "none" },
                },
              }}
            />
            <Tooltip title="Refresh orders">
              <IconButton
                onClick={() => fetchOrders(false)}
                disabled={loading}
                sx={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  p: 1,
                  color: "#64748b",
                  "&:hover": { backgroundColor: "#f1f5f9" },
                }}
              >
                <RefreshRoundedIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* 3. FULL SCREEN VIEW TABLE CARD (Total moved after Items, click-to-sort headers) */}
        <Box
          sx={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* Table Container with Fixed Header and Scrollable Body */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflowX: "auto",
            }}
          >
            <Box
              sx={{
                minWidth: 1020,
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Fixed Table Header - Clickable sorting on columns */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: tableGridCols,
                  columnGap: 2,
                  alignItems: "center",
                  px: 2.5,
                  py: 2,
                  bgcolor: "#ffffff",
                  borderBottom: "2px solid #e2e8f0",
                  flexShrink: 0,
                  userSelect: "none",
                }}
              >
                <Box>
                  <TableSortLabel
                    active={orderBy === "customer"}
                    direction={orderBy === "customer" ? order : "asc"}
                    onClick={() => handleRequestSort("customer")}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      color: "#64748b",
                      "&.Mui-active": { color: "#0f172a" },
                      "& .MuiTableSortLabel-icon": { color: "#2563eb !important" },
                    }}
                  >
                    Customer
                  </TableSortLabel>
                </Box>
                <Box>
                  <TableSortLabel
                    active={orderBy === "orderNumber"}
                    direction={orderBy === "orderNumber" ? order : "asc"}
                    onClick={() => handleRequestSort("orderNumber")}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      color: "#64748b",
                      "&.Mui-active": { color: "#0f172a" },
                      "& .MuiTableSortLabel-icon": { color: "#2563eb !important" },
                    }}
                  >
                    Order ID
                  </TableSortLabel>
                </Box>
                <Box>
                  <TableSortLabel
                    active={orderBy === "orderType"}
                    direction={orderBy === "orderType" ? order : "asc"}
                    onClick={() => handleRequestSort("orderType")}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      color: "#64748b",
                      "&.Mui-active": { color: "#0f172a" },
                      "& .MuiTableSortLabel-icon": { color: "#2563eb !important" },
                    }}
                  >
                    Order Type
                  </TableSortLabel>
                </Box>
                <Box>
                  <TableSortLabel
                    active={orderBy === "items"}
                    direction={orderBy === "items" ? order : "asc"}
                    onClick={() => handleRequestSort("items")}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      color: "#64748b",
                      "&.Mui-active": { color: "#0f172a" },
                      "& .MuiTableSortLabel-icon": { color: "#2563eb !important" },
                    }}
                  >
                    Items
                  </TableSortLabel>
                </Box>
                <Box>
                  <TableSortLabel
                    active={orderBy === "total"}
                    direction={orderBy === "total" ? order : "asc"}
                    onClick={() => handleRequestSort("total")}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      color: "#64748b",
                      "&.Mui-active": { color: "#0f172a" },
                      "& .MuiTableSortLabel-icon": { color: "#2563eb !important" },
                    }}
                  >
                    Total
                  </TableSortLabel>
                </Box>
                <Box>
                  <TableSortLabel
                    active={orderBy === "status"}
                    direction={orderBy === "status" ? order : "asc"}
                    onClick={() => handleRequestSort("status")}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      color: "#64748b",
                      "&.Mui-active": { color: "#0f172a" },
                      "& .MuiTableSortLabel-icon": { color: "#2563eb !important" },
                    }}
                  >
                    Status
                  </TableSortLabel>
                </Box>
                <Box>
                  <TableSortLabel
                    active={orderBy === "createdAt"}
                    direction={orderBy === "createdAt" ? order : "asc"}
                    onClick={() => handleRequestSort("createdAt")}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      color: "#64748b",
                      "&.Mui-active": { color: "#0f172a" },
                      "& .MuiTableSortLabel-icon": { color: "#2563eb !important" },
                    }}
                  >
                    Created
                  </TableSortLabel>
                </Box>
                <Box sx={{ textAlign: "right", color: "#64748b", fontSize: "0.84rem", fontWeight: 700 }}>
                  Actions
                </Box>
              </Box>

              {/* Scrollable Table Rows */}
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  overflowX: "hidden",
                  "&::-webkit-scrollbar": {
                    width: "6px",
                    height: "6px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background: "transparent",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "#cbd5e1",
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-thumb:hover": {
                    backgroundColor: "#94a3b8",
                  },
                }}
              >
                {loading ? (
                  <Box sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <Stack key={idx} direction="row" spacing={2} alignItems="center" sx={{ py: 0.5 }}>
                          <Skeleton variant="circular" width={36} height={36} />
                          <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" width="30%" height={18} />
                            <Skeleton variant="text" width="20%" height={14} />
                          </Box>
                          <Skeleton variant="text" width={110} height={22} />
                          <Skeleton variant="text" width={90} height={22} />
                          <Skeleton variant="text" width={90} height={22} />
                          <Skeleton variant="text" width={90} height={22} />
                          <Skeleton variant="text" width={60} height={22} />
                          <Skeleton variant="text" width={70} height={22} />
                          <Skeleton variant="rounded" width={80} height={26} />
                          <Skeleton variant="text" width={80} height={22} />
                          <Skeleton variant="rounded" width={80} height={28} />
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                ) : paginatedOrders.length === 0 ? (
                  <Box sx={{ p: 8, textAlign: "center" }}>
                    <Typography sx={{ color: "#0f172a", fontSize: "1.15rem", fontWeight: 700, mb: 1 }}>
                      No orders found
                    </Typography>
                    <Typography sx={{ color: "#64748b", fontSize: "0.88rem" }}>
                      {searchQuery ? "No orders match your search criteria." : "There are currently no orders in this view."}
                    </Typography>
                  </Box>
                ) : (
                  paginatedOrders.map((order) => {
                    const orderIdFormatted = String(order.orderNumber || "").toUpperCase();
                    const customerName = order.user?.username || order.orderedBy || "User";
                    const userAvatar = order.user?.avatar || "";
                    const totalAmount = Number(order.totalprice || order.total || order.amount || 0);
                    const itemCount = order.items ? order.items.length : 0;
                    const itemsListStr = Array.isArray(order.items) && order.items.length > 0
                      ? order.items.map((it) => it.itemname || "Item").join(", ")
                      : `${itemCount} items`;
                    const createdDateDisplay = formatCreatedDate(order.createdAt);
                    const orderStatus = String(order.status || "").toLowerCase();

                    return (
                      <Box
                        key={order._id || order.orderNumber}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: tableGridCols,
                          columnGap: 2,
                          alignItems: "center",
                          px: 2.5,
                          py: 1.4,
                          borderBottom: "1px solid #f1f5f9",
                          bgcolor: "transparent",
                          transition: "background-color 0.15s ease",
                          "&:hover": {
                            backgroundColor: "#f8fafc",
                          },
                        }}
                      >
                        {/* 1. Customer Avatar & Name (FIRST COLUMN) */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar
                            src={userAvatar}
                            alt={customerName}
                            sx={{
                              width: 34,
                              height: 34,
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              backgroundColor: userAvatar ? "transparent" : "#2563eb",
                              color: "#ffffff",
                              p: userAvatar ? 0.5 : 0,
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {!userAvatar && customerName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", textTransform: "capitalize" }}>
                              {customerName}
                            </Typography>
                            {order.user?.rollNo && (
                              <Typography sx={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: 500 }}>
                                {order.user.rollNo}
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        {/* 3. Order ID (SECOND COLUMN) */}
                        <Box>
                          <Tooltip title="Click to view details and copy Order ID">
                            <Typography
                              onClick={() => handleOpenOrderPopup(order)}
                              sx={{
                                color: "#2563eb",
                                fontWeight: 700,
                                fontSize: "0.92rem",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                "&:hover": { textDecoration: "underline", color: "#1d4ed8" },
                              }}
                            >
                              {orderIdFormatted}
                            </Typography>
                          </Tooltip>
                        </Box>

                        {/* 4. Order Type */}
                        <Box>
                          {renderOrderTypeBadge(order)}
                        </Box>

                        {/* 5. Items (MOVED BEFORE TOTAL) */}
                        <Tooltip title={itemsListStr} arrow>
                          <Box sx={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                          </Box>
                        </Tooltip>

                        {/* 6. Total (MOVED AFTER ITEMS) */}
                        <Box sx={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
                          ₹{totalAmount.toFixed(2)}
                        </Box>

                        {/* 7. Status */}
                        <Box>
                          {renderStatusBadge(order.status)}
                        </Box>

                        {/* 8. Created Date */}
                        <Box sx={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 500 }}>
                          {createdDateDisplay}
                        </Box>

                        {/* 8. Actions */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 0.8,
                          }}
                        >
                          <Tooltip title="View Order Details & Receipt">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenOrderPopup(order)}
                              sx={{ color: "#64748b", "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" } }}
                            >
                              <ReceiptIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {!isAdminOrStaff && order.qrcode && (
                            <Tooltip title="Show Claim QR Code">
                              <IconButton
                                size="small"
                                onClick={() => openQr(order)}
                                sx={{ color: "#64748b", "&:hover": { color: "#10b981", bgcolor: "#ecfdf5" } }}
                              >
                                <QrCode2Icon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {isAdminOrStaff && orderStatus === "pending" && (
                            <Tooltip title="Mark as Preparing">
                              <IconButton
                                size="small"
                                onClick={() => handleAcceptPreparing(order.orderNumber)}
                                disabled={actionLoading}
                                sx={{ color: "#d97706", "&:hover": { color: "#b45309", bgcolor: "#fef3c7" } }}
                              >
                                <SoupKitchenRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {isAdminOrStaff && orderStatus === "preparing" && (
                            <Tooltip title="Mark as Fulfilled / Completed">
                              <IconButton
                                size="small"
                                onClick={() => handleMarkCompleted(order.orderNumber)}
                                disabled={actionLoading}
                                sx={{ color: "#16a34a", "&:hover": { color: "#15803d", bgcolor: "#dcfce7" } }}
                              >
                                <CheckCircleRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {(isAdminOrStaff || orderStatus === "pending") &&
                            orderStatus !== "cancelled" &&
                            orderStatus !== "completed" && (
                              <Tooltip title="Cancel Order">
                                <IconButton
                                  size="small"
                                  onClick={() => openCancelModal(order)}
                                  disabled={actionLoading}
                                  sx={{ color: "#ef4444", "&:hover": { color: "#dc2626", bgcolor: "#fee2e2" } }}
                                >
                                  <CancelRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </Box>

          {/* Fixed Pagination Bar docked at the bottom of the card */}
          <Box
            sx={{
              px: 2,
              py: 0.5,
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              bgcolor: "#ffffff",
              flexShrink: 0,
            }}
          >
            <TablePagination
              component="div"
              count={filteredOrders.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              sx={{
                color: "#64748b",
                "& .MuiTablePagination-select": { fontWeight: 600 },
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* 4. ORDER DETAILS & RECEIPT POPUP (With Copy Order ID option) */}
      <Dialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px", p: 1 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Order Details
          </Typography>
          <IconButton onClick={() => setReceiptOpen(false)} size="small">
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ py: 2 }}>
          {selectedOrderPopup && (
            <Box sx={{ mb: 2.5 }}>
              {/* Prominent Copy Order ID Card */}
              <Box
                sx={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "12px",
                  p: 2,
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      color: "#1e293b",
                      fontFamily: "monospace",
                      letterSpacing: 0.5,
                      mt: 0.2,
                    }}
                  >
                    {String(selectedOrderPopup.orderNumber || "").toUpperCase()}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleCopyOrderId(selectedOrderPopup.orderNumber)}
                  startIcon={copiedOrderId ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    fontWeight: 700,
                    borderColor: copiedOrderId ? "#10b981" : "#2563eb",
                    color: copiedOrderId ? "#10b981" : "#2563eb",
                    backgroundColor: copiedOrderId ? "#ecfdf5" : "#eff6ff",
                    "&:hover": {
                      backgroundColor: copiedOrderId ? "#d1fae5" : "#dbeafe",
                      borderColor: copiedOrderId ? "#10b981" : "#1d4ed8",
                    },
                  }}
                >
                  {copiedOrderId ? "Copied!" : "Copy Order ID"}
                </Button>
              </Box>
            </Box>
          )}

          {/* Receipt Image if present */}
          {receiptUrl ? (
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#64748b", mb: 1, textAlign: "left" }}>
                Receipt Image:
              </Typography>
              <Box
                component="img"
                src={receiptUrl}
                alt="Order Receipt"
                sx={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: "10px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  border: "1px solid #e2e8f0",
                }}
              />
            </Box>
          ) : (
            <></>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: "flex-end" }}>
          <Button
            onClick={() => setReceiptOpen(false)}
            variant="contained"
            sx={{ borderRadius: "8px", bgcolor: "#0088ff" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* 5. QR CODE DIALOG (Student food claim) */}
      <Dialog
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px", p: 1 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800 }}>
          Claim QR Code
          <IconButton onClick={() => setQrOpen(false)} size="small">
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center", py: 3 }}>
          {qrData ? (
            <Box>
              <Box
                component="img"
                src={qrData}
                alt="Order QR Code"
                sx={{
                  width: 220,
                  height: 220,
                  borderRadius: "12px",
                  p: 1.5,
                  border: "2px dashed #cbd5e1",
                }}
              />
              <Typography sx={{ color: "#64748b", fontSize: "0.85rem", mt: 2 }}>
                Show this QR code at the canteen pick-up counter to collect your order.
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>
              QR Code not available.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setQrOpen(false)} variant="contained" sx={{ borderRadius: "8px" }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* 6. CANCEL CONFIRMATION DIALOG */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => !actionLoading && setCancelDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px", p: 1.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#b91c1c" }}>
          Cancel Order
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#334155", fontSize: "0.92rem", mb: 1 }}>
            Are you sure you want to cancel order <strong>{selectedCancelOrder?.orderNumber}</strong>?
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.84rem" }}>
            The order amount (₹{selectedCancelOrder?.totalprice || selectedCancelOrder?.total || 0}) will be refunded back to the user's wallet.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setCancelDialogOpen(false)}
            disabled={actionLoading}
            sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}
          >
            Go Back
          </Button>
          <Button
            onClick={handleConfirmCancel}
            variant="contained"
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              backgroundColor: "#ef4444",
              "&:hover": { backgroundColor: "#dc2626" },
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "8px",
            }}
          >
            {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
