import  { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  Button,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Pagination,
  Skeleton,
  useMediaQuery,
  Tooltip,
  Tabs,
  Tab,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CancelIcon from "@mui/icons-material/Cancel";
import SortIcon from "@mui/icons-material/Sort";
import FilterListIcon from "@mui/icons-material/FilterList";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import ImageIcon from "@mui/icons-material/Image";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { post } from "../utils/api";

/**
 * Orders (C3 - Enterprise Dashboard)
 * - Expects `post` util to exist and perform API POST requests
 * - Endpoints used:
 *    - /order/getUserOrderList  (body { userDetails, status?, page?, limit?, sortBy? })
 *    - /users/getUserId          (body { username })
 *    - /users/cancelOrder        (body { userDetails, orderNumber })
 *
 * Notes:
 * - This is responsive and accessible.
 * - You can wire server-side pagination by replacing client-side logic with server responses.
 */

const PAGE_SIZE = 6; // default page size for cards grid

export default function OrdersDashboard() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState(0); // 0=pending, 1=preparing, 2=completed, 3=cancelled
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest
  const [loading, setLoading] = useState(false);
  const [msgAlert, setMsgAlert] = useState(null); // { severity, text }
  const [selectedOrder, setSelectedOrder] = useState(null); // orderNumber to cancel
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [page, setPage] = useState(1);

  const isSm = useMediaQuery((theme) => theme.breakpoints.down("sm"));

  const statusMap = ["pending", "preparing", "completed", "cancelled"];
  const currentStatus = statusMap[activeTab];

  // Filter orders based on active tab
  const filteredOrders = useMemo(() => {
    let filtered = orders.filter((o) => {
      const status = (o.status || "pending").toLowerCase();
      return status === currentStatus;
    });

    // Sort
    if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else {
      filtered.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }

    return filtered;
  }, [orders, currentStatus, sortBy]);

  // fetchOrders for current logged-in user
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await post("/order/getUserOrderList", {});
      if (res && res.data) {
        setOrders(Array.isArray(res.data) ? res.data : []);
        setMsgAlert(null);
      } else {
        setOrders([]);
        setMsgAlert({ severity: "info", text: res?.message || "No orders found." });
      }
    } catch (err) {
      setOrders([]);
      setMsgAlert({ severity: "error", text: err?.message || "Failed to fetch orders." });
    } finally {
      setLoading(false);
      setPage(1);
    }
  }, []);

  // Auto-fetch orders on mount and when filters change
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // client-side pagination derived
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

  // Open cancel confirmation
  function openCancelDialog(orderNumber) {
    setSelectedOrder(orderNumber);
    setConfirmOpen(true);
  }

  function closeCancelDialog() {
    setSelectedOrder(null);
    setConfirmOpen(false);
  }

  function openQrDialog(order) {
    if (order?.qrcode) {
      setQrData(order.qrcode);
      setQrDialogOpen(true);
    } else {
      setMsgAlert({ severity: "info", text: "QR code not available for this order." });
    }
  }

  function openReceiptDialog(order) {
    const status = (order?.status || "").toLowerCase();
    // For pending or preparing orders, show receipt WITH barcode; otherwise show no-barcode receipt
    let url = "";
    if (status === "pending" || status === "preparing") {
      url = order?.receiptImageUrl || order?.receiptImageurl || order?.receiptImageUrlNoBarcode || "";
    } else {
      url = order?.receiptImageUrlNoBarcode || order?.receiptImageUrl || order?.receiptImageurl || "";
    }
    
    if (url) {
      setReceiptUrl(url);
      setReceiptDialogOpen(true);
    } else {
      setMsgAlert({ severity: "info", text: "Receipt image not available for this order." });
    }
  }

  function closeQrDialog() {
    setQrDialogOpen(false);
    setQrData(null);
  }

  // Cancel order for current user
  async function confirmCancel() {
    if (!selectedOrder) return;
    setLoading(true);
    try {
      const cancelRes = await post("/users/cancelOrder", { orderNumber: selectedOrder });
      if (cancelRes && cancelRes.message) {
        setMsgAlert({ severity: "success", text: cancelRes.message });
      } else {
        setMsgAlert({ severity: "info", text: "Order cancellation completed." });
      }
      // Refresh list
      await fetchOrders();
    } catch (err) {
      setMsgAlert({ severity: "error", text: err?.message || "Cancellation failed." });
    } finally {
      setLoading(false);
      closeCancelDialog();
    }
  }

  // small helper to show status chips
  function statusChip(status) {
    const s = (status || "pending").toLowerCase();
    const color =
      s === "delivered" ? "success" : s === "preparing" ? "warning" : s === "canceled" ? "error" : "primary";
    return <Chip label={s.charAt(0).toUpperCase() + s.slice(1)} color={color} size="small" />;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc" }}>
      <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }}>
        {/* Hero Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{
            mb: 4,
            p: { xs: 2.5, md: 3.5 },
            background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
            borderRadius: 3,
            color: "white",
            boxShadow: "0 12px 40px rgba(30,64,175,0.25)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative background element */}
          <Box
            sx={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 200,
              height: 200,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.05)",
              zIndex: 0,
            }}
          />

          <Stack direction="row" alignItems="center" spacing={2} sx={{ zIndex: 1 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(255,255,255,0.15)",
                border: "2px solid rgba(255,255,255,0.25)",
              }}
            >
              <AssignmentIcon sx={{ fontSize: 36, color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: "1.75rem", sm: "2.5rem" }, color: "white", lineHeight: 1 }}>
                My Orders
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
                Track & manage your orders
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {/* Tabs for Status Filter with Controls */}
        <Box sx={{ mb: 3, bgcolor: "white", borderRadius: 3, p: 2, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => {
                  setActiveTab(newValue);
                  setPage(1);
                  fetchOrders();
                }}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  "& .MuiTab-root": {
                    fontWeight: 600,
                    textTransform: "none",
                    fontSize: "0.95rem",
                  },
                }}
              >
                <Tab label="Pending" />
                <Tab label="Preparing" />
                <Tab label="Completed" />
                <Tab label="Cancelled" />
              </Tabs>
            </Box>
            
            <Stack direction="row" spacing={1.5} sx={{ minWidth: { sm: "300px" } }}>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel id="sort-by-label">Sort</InputLabel>
                <Select 
                  labelId="sort-by-label" 
                  value={sortBy} 
                  label="Sort" 
                  onChange={(e) => setSortBy(e.target.value)}
                  startAdornment={<SortIcon sx={{ ml: 1, mr: -0.5, color: "action.active", fontSize: 20 }} />}
                >
                  <MenuItem value="newest">Newest</MenuItem>
                  <MenuItem value="oldest">Oldest</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                onClick={fetchOrders}
                startIcon={<SearchIcon />}
                disabled={loading}
                aria-label="refresh orders"
                sx={{ minWidth: 110 }}
              >
                {loading ? "..." : "Refresh"}
              </Button>
            </Stack>
          </Stack>
        </Box>

      {/* Message Alert */}
      {msgAlert && (
        <Box sx={{ mb: 2 }}>
          <Alert severity={msgAlert.severity}>{msgAlert.text}</Alert>
        </Box>
      )}

      {/* Orders Grid / Skeleton / Empty */}
      <Box>
        {loading && orders.length === 0 ? (
          // show skeleton grid while initially loading
          <Grid container spacing={2}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="60%" height={28} />
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="rectangular" height={60} sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : filteredOrders.length === 0 ? (
          // Empty state
          <Box sx={{ p: 6, textAlign: "center", bgcolor: "white", borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            <AssignmentIcon sx={{ fontSize: 64, color: "#94a3b8", mb: 2 }} />
            <Typography variant="h5" fontWeight={700} sx={{ color: "#1e293b" }}>No {currentStatus} orders</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              You don't have any orders with this status yet.
            </Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={2}>
              {paginated.map((o) => {
                const status = (o.status || "").toLowerCase();
                const isCompleted = status === "completed";
                const isCancelled = status === "cancelled";

                return (
                  <Grid item xs={12} sm={6} md={4} key={o.orderNumber} width="32%">
                    <Card
                      elevation={0}
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        borderRadius: 3,
                        background: "white",
                        border: "1px solid #e2e8f0",
                        transition: "all 0.3s ease",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        overflow: "hidden",
                        "&:hover": {
                          transform: "translateY(-8px)",
                          boxShadow: "0 16px 40px rgba(0,0,0,0.15)",
                          borderColor: "#1d4ed8",
                        },
                      }}
                      role="article"
                      aria-label={`Order ${o.orderNumber}`}
                    >
                      {/* Status Banner */}
                      <Box
                        sx={{
                          py: 1,
                          px: 2,
                          background: status === "completed" 
                            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                            : status === "preparing"
                            ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                            : status === "cancelled"
                            ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                            : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                          color: "white",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="h6" fontWeight={800} sx={{ fontSize: "1.1rem" }}>
                          #{o.orderNumber}
                        </Typography>
                        <Chip 
                          label={status.charAt(0).toUpperCase() + status.slice(1)} 
                          size="small"
                          sx={{
                            bgcolor: "rgba(255,255,255,0.25)",
                            color: "white",
                            fontWeight: 700,
                            border: "1px solid rgba(255,255,255,0.3)",
                          }}
                        />
                      </Box>

                      <CardContent sx={{ flex: 1, p: 2.5 }}>
                        {/* Order Details Section */}
                        <Stack spacing={2}>
                          {/* Placed By */}
                          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f1f5f9", border: "1px solid #cbd5e1" }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Box>
                                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                  Placed By
                                </Typography>
                                <Typography variant="body1" fontWeight={700} sx={{ color: "#1e293b" }}>
                                  {o.orderedBy || "You"}
                                </Typography>
                              </Box>
                              {o.pre && (
                                <Chip 
                                  label="Pre-Order" 
                                  size="small"
                                  sx={{
                                    bgcolor: "#ede9fe",
                                    color: "#6d28d9",
                                    fontWeight: 700,
                                    border: "1px solid #d8b4fe",
                                  }}
                                  icon={<span style={{ fontSize: "1rem" }}>🕐</span>}
                                />
                              )}
                            </Stack>
                          </Box>

                          {/* Items Detailed List */}
                          <Box 
                            sx={{ 
                              p: 2, 
                              borderRadius: 2, 
                              bgcolor: "#f0f9ff",
                              border: "1px solid #bfdbfe",
                            }}
                          >
                            <Typography variant="caption" sx={{ color: "#0369a1", fontWeight: 700, display: "block", mb: 1 }}>
                              Order Items
                            </Typography>
                            <Stack spacing={0.75}>
                              {(() => {
                                const list = o.items || [];
                                if (!list.length) return <Typography variant="body2" sx={{ color: "#64748b" }}>No items</Typography>;

                                const grouped = {};
                                for (const it of list) {
                                  const label = it.itemname || it.name || it.title || "Item";
                                  const key = it._id || label;
                                  const price = Number(it.price || 0);
                                  if (!grouped[key]) grouped[key] = { label, qty: 0, price };
                                  grouped[key].qty += 1;
                                }

                                return Object.values(grouped).map((g, idx) => (
                                  <Box 
                                    key={idx}
                                    sx={{ 
                                      display: "flex", 
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      py: 0.5,
                                      borderBottom: idx < Object.values(grouped).length - 1 ? "1px dashed #bfdbfe" : "none",
                                    }}
                                  >
                                    <Typography variant="body2" sx={{ color: "#334155", fontWeight: 600, flex: 1 }}>
                                      {g.label}
                                    </Typography>
                                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                      <Chip 
                                        label={`×${g.qty}`} 
                                        size="small"
                                        sx={{
                                          height: "20px",
                                          fontSize: "0.7rem",
                                          fontWeight: 700,
                                          bgcolor: "#dbeafe",
                                          color: "#1e40af",
                                        }}
                                      />
                                      <Typography variant="body2" fontWeight={700} sx={{ color: "#0369a1", minWidth: "50px", textAlign: "right" }}>
                                        ₹{(g.price * g.qty).toFixed(0)}
                                      </Typography>
                                    </Box>
                                  </Box>
                                ));
                              })()}
                            </Stack>
                          </Box>

                          {/* Stats Grid */}
                          <Grid container spacing={1.5} justifyContent="center">
                            <Grid item xs={4}>
                              <Box sx={{ p: 1, borderRadius: 2, bgcolor: "#dcfce7", border: "1px solid #86efac", textAlign: "center" }}>
                                <Typography variant="caption" sx={{ color: "#15803d", fontWeight: 700, display: "block", fontSize: "0.65rem" }}>
                                  ITEMS
                                </Typography>
                                <Typography variant="h6" fontWeight={900} sx={{ color: "#166534", fontSize: "1.25rem" }}>
                                  {o.items?.length || 0}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={4}>
                              <Box sx={{ p: 1, borderRadius: 2, bgcolor: "#fef3c7", border: "1px solid #fcd34d", textAlign: "center" }}>
                                <Typography variant="caption" sx={{ color: "#92400e", fontWeight: 700, display: "block", fontSize: "0.65rem" }}>
                                  TOTAL
                                </Typography>
                                <Typography variant="h6" fontWeight={900} sx={{ color: "#b45309", fontSize: "1.25rem" }}>
                                  ₹{o.total || o.amount || "—"}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={4}>
                              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#fef2f2", border: "1px solid #fecaca", textAlign: "center" }}>
                                <Typography variant="caption" sx={{ color: "#991b1b", fontWeight: 700, display: "block", fontSize: "0.65rem" }}>
                                  ORDER PLACED
                                </Typography>
                                <Typography variant="caption" fontWeight={900} sx={{ color: "#7f1d1d", fontSize: "0.7rem", lineHeight: 1.3 }}>
                                  {new Date(o.createdAt || o.date || Date.now()).toLocaleString("en-IN", { 
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Stack>
                      </CardContent>

                      <CardActions sx={{ p: 2, pt: 0, gap: 1, flexWrap: "wrap" }}>
                        {!isCompleted && !isCancelled && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<QrCode2Icon />}
                            onClick={() => openQrDialog(o)}
                            aria-label={`qr code for ${o.orderNumber}`}
                            disabled={!o.qrcode}
                            sx={{ 
                              flex: 1,
                              minWidth: "45%",
                              fontWeight: 600,
                              borderRadius: 2,
                            }}
                          >
                            QR Code
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ImageIcon />}
                          onClick={() => openReceiptDialog(o)}
                          aria-label={`receipt ${o.orderNumber}`}
                          disabled={!(o.receiptImageUrlNoBarcode || o.receiptImageUrl || o.receiptImageurl)}
                          sx={{ 
                            flex: 1,
                            minWidth: "45%",
                            fontWeight: 600,
                            borderRadius: 2,
                          }}
                        >
                          Receipt
                        </Button>
                        {!isCompleted && !isCancelled && (
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => openCancelDialog(o.orderNumber)}
                            aria-label={`cancel ${o.orderNumber}`}
                            fullWidth
                            sx={{ 
                              fontWeight: 700,
                              borderRadius: 2,
                            }}
                          >
                            Cancel Order
                          </Button>
                        )}
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* Pagination */}
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={Math.ceil(filteredOrders.length / PAGE_SIZE)}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                shape="rounded"
              />
            </Box>
          </>
        )}
      </Box>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={closeQrDialog}>
        <DialogTitle>Order QR Code</DialogTitle>
        <DialogContent sx={{ display: "flex", justifyContent: "center", alignItems: "center", minWidth: 280 }}>
          {qrData ? (
            <Box
              component="img"
              src={qrData.startsWith("data:") ? qrData : `data:image/png;base64,${qrData}`}
              alt="Order QR Code"
              sx={{ width: "100%", maxWidth: 320, borderRadius: 1 }}
            />
          ) : (
            <Typography variant="body2">QR code not available.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeQrDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onClose={() => setReceiptDialogOpen(false)}>
        <DialogTitle>Order Receipt</DialogTitle>
        <DialogContent sx={{ display: "flex", justifyContent: "center", alignItems: "center", minWidth: 320 }}>
          {receiptUrl ? (
            <Box component="img" src={receiptUrl} alt="Order receipt" sx={{ width: "100%", borderRadius: 1 }} />
          ) : (
            <Typography variant="body2">Receipt image not available.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiptDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={closeCancelDialog}>
        <DialogTitle>Confirm Cancellation</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to cancel order <b>#{selectedOrder}</b>?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action will notify the user and mark the order as canceled.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelDialog}>Back</Button>
          <Button color="error" variant="contained" onClick={confirmCancel} startIcon={<CancelIcon />}>
            Confirm Cancel
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
}
