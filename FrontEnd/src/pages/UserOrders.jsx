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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CancelIcon from "@mui/icons-material/Cancel";
import SortIcon from "@mui/icons-material/Sort";
import FilterListIcon from "@mui/icons-material/FilterList";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
  const [username, setUsername] = useState("");
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | preparing | delivered | canceled
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest
  const [loading, setLoading] = useState(false);
  const [msgAlert, setMsgAlert] = useState(null); // { severity, text }
  const [selectedOrder, setSelectedOrder] = useState(null); // orderNumber to cancel
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [page, setPage] = useState(1);

  const isSm = useMediaQuery((theme) => theme.breakpoints.down("sm"));

  // fetchOrders uses the real API. Keep userDetails in body as username for your server.
  const fetchOrders = useCallback(async () => {
    if (!username) {
      setOrders([]);
      setMsgAlert({ severity: "info", text: "Enter username or roll no to fetch orders." });
      return;
    }
    setLoading(true);
    try {
      const body = {
        userDetails: username,
        status: statusFilter === "all" ? undefined : statusFilter,
        sortBy,
      };
      const res = await post("/order/getUserOrderList", body);
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
  }, [username, statusFilter, sortBy]);

  // Debounced search helper (simple debounce)
  useEffect(() => {
    const id = setTimeout(() => {
      // only auto fetch on non-empty username; otherwise show prompt
      if (username) fetchOrders();
    }, 650);
    return () => clearTimeout(id);
  }, [username, statusFilter, sortBy, fetchOrders]);

  // client-side pagination derived
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, page]);

  // Open cancel confirmation
  function openCancelDialog(orderNumber) {
    setSelectedOrder(orderNumber);
    setConfirmOpen(true);
  }

  function closeCancelDialog() {
    setSelectedOrder(null);
    setConfirmOpen(false);
  }

  // Cancel flow: fetch user id -> cancel -> refresh (optimistic minor update)
  async function confirmCancel() {
    if (!selectedOrder) return;
    setLoading(true);
    try {
      // step 1: get user details (as your original flow)
      const uidRes = await post("/users/getUserId", { username });
      if (!(uidRes && uidRes.data)) {
        setMsgAlert({ severity: "error", text: uidRes?.message || "Unable to fetch user details." });
        return;
      }
      const userDetails = uidRes.data;
      // step 2: cancel on server
      const cancelRes = await post("/users/cancelOrder", { userDetails, orderNumber: selectedOrder ,cancelBy : userDetails});
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
            Orders Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage user orders — filter, sort and cancel orders with confirmations.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip icon={<InfoOutlinedIcon />} label="Enterprise View" variant="outlined" />
        </Stack>
      </Stack>

      {/* Filter Bar */}
      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <TextField
              placeholder="Search by username or roll no"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: "action.active" }} />,
                "aria-label": "username search",
              }}
            />
          </Grid>

          <Grid item xs={6} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="filter-status-label">
                <FilterListIcon sx={{ mr: 0.5 }} /> Status
              </InputLabel>
              <Select
                labelId="filter-status-label"
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="preparing">Preparing</MenuItem>
                <MenuItem value="delivered">Delivered</MenuItem>
                <MenuItem value="canceled">Canceled</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={2}>
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

          <Grid item xs={12} sm={2} sx={{ textAlign: { xs: "left", sm: "right" } }}>
            <Button
              variant="contained"
              onClick={fetchOrders}
              startIcon={<SearchIcon />}
              disabled={loading || !username}
              aria-label="fetch orders"
            >
              {loading ? "Loading..." : "Fetch"}
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
        ) : orders.length === 0 ? (
          // Empty state
          <Card sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6">No orders found</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
              Try searching with a different username or change the status filter.
            </Typography>
            <Button variant="outlined" onClick={() => { setUsername(""); setStatusFilter("all"); setSortBy("newest"); }}>
              Reset filters
            </Button>
          </Card>
        ) : (
          <>
            <Grid container spacing={2}>
              {paginated.map((o) => (
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
                        Placed By: <b>{username}</b>
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                        <Chip label={`${o.items?.length || 0} items`} size="small" />
                        <Chip label={`Total ₹${o.total || o.amount || "—"}`} size="small" />
                        <Chip label={`Created: ${new Date(o.createdAt || o.date || Date.now()).toLocaleString()}`} size="small" />
                      </Stack>

                      {/* optional short items preview */}
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {o.items && o.items.length > 0
                            ? o.items.slice(0, 3).map((it) => `${it.name} x${it.qty || 1}`).join(", ")
                            : "No items listed"}
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
                        <Button
                          size="small"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => openCancelDialog(o.orderNumber)}
                          aria-label={`cancel ${o.orderNumber}`}
                          disabled={(o.status || "").toLowerCase() === "canceled"}
                        >
                          Cancel
                        </Button>
                      </Stack>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={Math.ceil(orders.length / PAGE_SIZE)}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                shape="rounded"
              />
            </Box>
          </>
        )}
      </Box>

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
