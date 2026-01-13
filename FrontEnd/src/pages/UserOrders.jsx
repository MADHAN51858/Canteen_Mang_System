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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant={isSm ? "h5" : "h4"} fontWeight={700}>
            My Orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage your orders by status
          </Typography>
        </Box>
      </Stack>

      {/* Tabs for Status Filter */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => {
            setActiveTab(newValue);
            setPage(1);
            fetchOrders();
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Pending" />
          <Tab label="Preparing" />
          <Tab label="Completed" />
          <Tab label="Cancelled" />
        </Tabs>
      </Box>

      {/* Filter Bar */}
      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6} sm={8}>
            <FormControl fullWidth size="small">
              <InputLabel id="sort-by-label">
                <SortIcon sx={{ mr: 0.5 }} /> Sort
              </InputLabel>
              <Select labelId="sort-by-label" value={sortBy} label="Sort" onChange={(e) => setSortBy(e.target.value)}>
                <MenuItem value="newest">Newest</MenuItem>
                <MenuItem value="oldest">Oldest</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={4} sx={{ textAlign: { xs: "left", sm: "right" } }}>
            <Button
              variant="contained"
              onClick={fetchOrders}
              startIcon={<SearchIcon />}
              disabled={loading}
              aria-label="refresh orders"
              fullWidth
            >
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </Grid>
        </Grid>
      </Card>

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
          <Card sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6">No {currentStatus} orders</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
              You don't have any orders with this status yet.
            </Typography>
          </Card>
        ) : (
          <>
            <Grid container spacing={2}>
              {paginated.map((o) => {
                const status = (o.status || "").toLowerCase();
                const isCompleted = status === "completed";
                const isCancelled = status === "cancelled";

                return (
                  <Grid item xs={12} sm={6} md={4} key={o.orderNumber}>
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        transition: "transform .18s ease, box-shadow .18s ease",
                        "&:hover": {
                          transform: "translateY(-6px)",
                          boxShadow: (theme) => theme.shadows[6],
                        },
                      }}
                      role="article"
                      aria-label={`Order ${o.orderNumber}`}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            #{o.orderNumber}
                          </Typography>
                          {statusChip(o.status)}
                        </Stack>

                      <Typography variant="body2" color="text.secondary">
                        Placed By: <b>{o.orderedBy || "You"}</b>
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                        <Chip label={`${o.items?.length || 0} items`} size="small" />
                        <Chip label={`Total ₹${o.total || o.amount || "—"}`} size="small" />
                        {o.pre && <Chip label="Pre-Order" size="small" color="secondary" />}
                        <Chip label={`Created: ${new Date(o.createdAt || o.date || Date.now()).toLocaleString()}`} size="small" />
                      </Stack>

                      {/* optional short items preview */}
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {(() => {
                            const list = o.items || [];
                            if (!list.length) return "No items listed";

                            const grouped = {};
                            for (const it of list) {
                              const label = it.itemname || it.name || it.title || "Item";
                              const key = it._id || label;
                              if (!grouped[key]) grouped[key] = { label, qty: 0 };
                              grouped[key].qty += 1;
                            }

                            return Object.values(grouped)
                              .slice(0, 3)
                              .map((g) => `${g.label} x${g.qty}`)
                              .join(", ");
                          })()}
                        </Typography>
                      </Box>
                    </CardContent>

                      <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                        <Box>
                          <Tooltip title="More info">
                            <IconButton size="small" aria-label="order info">
                              <InfoOutlinedIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>

                        <Stack direction="row" spacing={1}>
                          {!isCompleted && !isCancelled && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<QrCode2Icon />}
                              onClick={() => openQrDialog(o)}
                              aria-label={`qr code for ${o.orderNumber}`}
                              disabled={!o.qrcode}
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
                          >
                            Receipt
                          </Button>
                          {!isCompleted && !isCancelled && (
                            <Button
                              size="small"
                              color="error"
                              startIcon={<CancelIcon />}
                              onClick={() => openCancelDialog(o.orderNumber)}
                              aria-label={`cancel ${o.orderNumber}`}
                            >
                              Cancel
                            </Button>
                          )}
                        </Stack>
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
  );
}
