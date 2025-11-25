// OrdersAdmin.jsx
import React, { useState, useEffect, useCallback , useContext } from "react";
import { CartContext } from "../context/CartContext";
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchIcon from "@mui/icons-material/Search";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import { post } from "../utils/api"; // your API util

// Server endpoints used:
// - POST /order/getOrderList        -> returns array of orders
// - POST /users/getUserId           -> get user details (body: { username })
// - POST /order/cancelOrder         -> cancel order (body: { orderedBy, orderNumber })

export default function OrdersAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCancel, setSelectedCancel] = useState(null); // orderNumber
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });
  const [pageSize, setPageSize] = useState(10);
    const { user } = useContext(CartContext);
  

  // Basic fetch - adapt if you want server-side pagination
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await post("/order/getOrderList");
      if (res && Array.isArray(res.data)) {
        // normalize rows - ensure id field for DataGrid
        const normalized = res.data.map((o) => ({
          id: o.orderNumber,
          orderNumber: o.orderNumber,
          orderedBy: o.orderedBy || (o.user && o.user.username) || "—",
          itemsCount: o.items ? o.items.length : 0,
          total: o.total || o.amount || "—",
          status: (o.status || "pending").toLowerCase(),
          // createdAt: o.createdAt || o.date || null,
          // raw: o,
        }));
        setRows(normalized);
      } else {
        setRows([]);
        setSnack({ open: true, severity: "info", message: res?.message || "No orders found" });
      }
    } catch (err) {
      setRows([]);
      setSnack({ open: true, severity: "error", message: err?.message || "Failed to fetch orders" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Cancel flow: ask user id then cancel
  const handleConfirmCancel = async () => {
    if (!selectedCancel) return;
    setLoading(true);
    try {
      // get user details (if your backend needs structured userDetails)
      // here we use orderedBy from the row
      const row = rows.find((r) => r.orderNumber === selectedCancel);
      const username = row?.orderedBy;
      const uidRes = await post("/users/getUserId", { username });
      if (!(uidRes && uidRes.data)) {
        setSnack({ open: true, severity: "error", message: uidRes?.message || "Unable to fetch user details" });
        setLoading(false);
        setSelectedCancel(null);
        return;
      }
      const userDetails = uidRes.data;
      // call cancel endpoint (your backend path might be /order/cancelOrder)
      const cancelRes = await post("/users/cancelOrder", { userDetails, orderNumber: selectedCancel , cancelBy : user.username });
      setSnack({ open: true, severity: "success", message: cancelRes?.message || "Order canceled" });
      // refresh
      await fetchOrders();
    } catch (err) {
      setSnack({ open: true, severity: "error", message: err?.message || "Cancellation failed" });
    } finally {
      setLoading(false);
      setSelectedCancel(null);
    }
  };

  const getStatusChip = (status) => {
    const s = (status || "pending").toLowerCase();
    const label = s.charAt(0).toUpperCase() + s.slice(1);
    if (s === "delivered") return <Chip label={label} color="success" size="small" />;
    if (s === "preparing") return <Chip label={label} color="warning" size="small" />;
    if (s === "canceled") return <Chip label={label} color="error" size="small" />;
    return <Chip label={label} color="primary" size="small" />;
  };

  // Columns
  const columns = [
    { field: "orderNumber", headerName: "Order #", flex: 1, minWidth: 140, sortable: true },
    { field: "orderedBy", headerName: "Ordered By", flex: 1, minWidth: 160, sortable: true },
    { field: "itemsCount", headerName: "Items", width: 100, type: "number", align: "center", headerAlign: "center" },
    { field: "total", headerName: "Total", width: 120, valueFormatter: (p) => (p.value ? `₹${p.value}` : "—") },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => getStatusChip(params.value),
      sortable: true,
    },
    {
      field: "createdAt",
      headerName: "Created",
      width: 200,
      // valueGetter: (params) => {
      //   // const v = params.row.createdAt;
      //   return v ? new Date(v).toLocaleString() : "";
      // },
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          icon={
            <Tooltip title="Cancel order">
              <CancelIcon color={params.row.status === "canceled" ? "disabled" : "error"} />
            </Tooltip>
          }
          label="Cancel"
          disabled={params.row.status === "canceled"}
          onClick={() => setSelectedCancel(params.row.orderNumber)}
          showInMenu={false}
          key="cancel"
        />,
      ],
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 6 }}>
      <AppBar position="sticky" color="inherit" sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Admin — Orders
          </Typography>

          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            onClick={fetchOrders}
            disabled={loading}
            aria-label="refresh orders"
          >
            Refresh
          </Button>

          <IconButton onClick={fetchOrders} color="inherit" aria-label="refresh">
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper elevation={0} sx={{ height: "72vh", display: "flex", flexDirection: "column", p: 1 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => setPageSize(newSize)}
            rowsPerPageOptions={[5, 10, 20, 50]}
            pagination
            autoHeight={false}
            disableSelectionOnClick
            sx={{
              border: "none",
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "action.hover",
              },
            }}
          />
        </Paper>
      </Container>

      {/* Cancel confirmation */}
      <Dialog open={!!selectedCancel} onClose={() => setSelectedCancel(null)}>
        <DialogTitle>Confirm Cancel Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel order <strong>#{selectedCancel}</strong>? This will mark the order as
            canceled and notify the user.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedCancel(null)}>Back</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<CancelIcon />}
            onClick={handleConfirmCancel}
            disabled={loading}
          >
            Confirm Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
