// OrdersAdmin.jsx
import { useState, useEffect, useCallback , useContext } from "react";
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
  TextField,
  Tabs,
  Tab,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CancelIcon from "@mui/icons-material/Cancel";
import ImageIcon from "@mui/icons-material/Image";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import { post } from "../utils/api"; // your API util

// Barcode listener utility
function listenToKeyboardInput(callback) {
  let buffer = "";
  const timeoutDuration = 100; // ms between characters (adjust if needed)
  let timeout;

  const handleKeydown = (e) => {
    // Only capture if focus is not in an input field
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

  // Return cleanup function
  return () => {
    window.removeEventListener("keydown", handleKeydown);
    clearTimeout(timeout);
  };
}

// Server endpoints used:
// - POST /order/getOrderList        -> returns array of orders
// - POST /users/getUserId           -> get user details (body: { username })
// - POST /order/cancelOrder         -> cancel order (body: { orderedBy, orderNumber })
// - POST /order/markCompleteByBarcode -> mark order as completed (body: { barcode })

export default function OrdersAdmin() {
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCancel, setSelectedCancel] = useState(null); // orderNumber
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });
  const [pageSize, setPageSize] = useState(10);
  const [scannerActive, setScannerActive] = useState(true);
  const { user } = useContext(CartContext);
  const [activeTab, setActiveTab] = useState("pre");

  const filterRowsByTab = useCallback(
    (list, tab) => list.filter((order) => {
      const status = String(order.status || "").toLowerCase();
      const isCancelled = status === "cancelled" || status === "canceled";
      const isCompleted = status === "completed";

      if (tab === "pre") return order.pre === true && !isCancelled && !isCompleted; // pre-orders, exclude cancelled and completed
      if (tab === "normal") return isCancelled && order.pre === true; // only cancelled pre-orders
      if (tab === "completed") return isCompleted && order.pre === true; // only completed pre-orders
      return true;
    }),
    []
  );
  

  // Basic fetch - adapt if you want server-side pagination
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await post("/order/getOrderList");
      if (res && Array.isArray(res.data)) {
        // normalize rows - ensure id field for DataGrid
        const normalized = res.data
          .map((o) => ({
            id: o.orderNumber,
            orderNumber: o.orderNumber,
            orderedBy: o.orderedBy || (o.user && o.user.username) || "—",
            itemsCount: o.items ? o.items.length : 0,
            total: o.totalprice || o.total || o.amount || "—",
            status: (o.status || "pending").toLowerCase(),
            pre: o.pre || false,
            receiptImageUrl: o.receiptImageUrl || o.receiptImageurl || "",
            receiptImageUrlNoBarcode: o.receiptImageUrlNoBarcode || "",
            // raw: o,
          }))
          ;
        setAllRows(normalized);
        setRows(filterRowsByTab(normalized, activeTab));
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
  }, [activeTab, filterRowsByTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle barcode processing
  const processBarcode = useCallback(async (barcode) => {
    if (!barcode.trim()) {
      setSnack({ open: true, severity: "warning", message: "Empty barcode received" });
      return;
    }

    console.log("Processing barcode:", barcode);

    try {
      const res = await post("/order/markCompleteByBarcode", { barcode });
      console.log("API response:", res);
      
      if (res && res.data) {
        // Update the row with the new status
        const updatedOrderNumber = res.data.orderNumber;
        setAllRows((prev) => prev.map((row) =>
          row.orderNumber === updatedOrderNumber || row.id === updatedOrderNumber
            ? { ...row, status: "completed" }
            : row
        ));
        setRows((prev) => filterRowsByTab(
          prev.map((row) =>
            row.orderNumber === updatedOrderNumber || row.id === updatedOrderNumber
              ? { ...row, status: "completed" }
              : row
          ),
          activeTab
        ));
        setSnack({ open: true, severity: "success", message: `Order ${updatedOrderNumber} marked as completed` });
      } else {
        setSnack({ open: true, severity: "warning", message: res?.message || "Barcode not found" });
      }
    } catch (err) {
      console.error("Barcode processing error:", err);
      setSnack({ open: true, severity: "error", message: `Failed: ${err?.message || "Unknown error"}` });
    }
  }, [filterRowsByTab, activeTab]);

  // Barcode scanner useEffect
  useEffect(() => {
    const cleanup = listenToKeyboardInput((barcode) => {
      processBarcode(barcode);
    });

    return cleanup;
  }, [processBarcode]);

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

  // Accept order -> set status to preparing
  const handleAccept = async (orderNumber) => {
    setLoading(true);
    try {
      const res = await post("/order/markPreparing", { orderNumber });
      if (res && res.data) {
        const updatedStatus = (res.data.status || "preparing").toLowerCase();
        setAllRows((prev) => prev.map((r) => (r.orderNumber === orderNumber ? { ...r, status: updatedStatus } : r)));
        setRows((prev) => filterRowsByTab(
          prev.map((r) => (r.orderNumber === orderNumber ? { ...r, status: updatedStatus } : r)),
          activeTab
        ));
        setSnack({ open: true, severity: "success", message: `Order ${orderNumber} is now preparing` });
      }
    } catch (err) {
      setSnack({ open: true, severity: "error", message: err?.message || "Failed to accept order" });
    } finally {

      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    const s = (status || "pending").toLowerCase();
    const label = s.charAt(0).toUpperCase() + s.slice(1);
    if (s === "delivered") return <Chip label={label} color="success" size="small" />;
    if (s === "preparing") return <Chip label={label} color="warning" size="small" />;
    if (s === "canceled") return <Chip label={label} color="error" size="small" />;
    if (s === "completed") return <Chip label={label} color="success" size="small" />;
    return <Chip label={label} color="primary" size="small" />;
  };

  // Columns
  const columns = [
    { field: "orderNumber", headerName: "Order Id", flex: 1, minWidth: 140, sortable: true },
    { field: "orderedBy", headerName: "Ordered By", flex: 1, minWidth: 160, sortable: true },
    { field: "itemsCount", headerName: "Items", width: 100, type: "number", align: "center", headerAlign: "center" },
    { 
      field: "total", 
      headerName: "Total", 
      width: 120, 
      valueFormatter: (params) => {
        const value = params.value ?? params;
        return (value !== "—" && value !== null && value !== undefined) ? `₹${value}` : "—";
      }
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => getStatusChip(params.value),
      sortable: true,
    },
    {
      field: "bill",
      headerName: "Bill",
      width: 140,
      renderCell: (params) => (
        <Button
          variant="outlined"
          size="small"
          startIcon={<ImageIcon />}
          disabled={!params.row.receiptImageUrlNoBarcode}
          onClick={() => {
            setReceiptUrl(params.row.receiptImageUrlNoBarcode);
            setReceiptOpen(true);
          }}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          Bill
        </Button>
      ),
      sortable: false,
      filterable: false,
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 180,
      getActions: (params) => [
        <GridActionsCellItem
          icon={
            <Tooltip title="Accept order">
              <CheckCircleIcon color={params.row.status === "pending" ? "success" : "disabled"} />
            </Tooltip>
          }
          label="Accept"
          disabled={params.row.status !== "pending"}
          onClick={() => handleAccept(params.row.orderNumber)}
          showInMenu={false}
          key="accept"
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Cancel order">
              <CancelIcon color={(params.row.status === "cancelled" || params.row.status === "completed") ? "disabled" : "error"} />
            </Tooltip>
          }
          label="Cancel"
          disabled={params.row.status === "cancelled" || params.row.status === "completed"}
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

          <Tabs
            value={activeTab}
            onChange={(_, val) => {
              setActiveTab(val);
              setRows(filterRowsByTab(allRows, val));
            }}
            textColor="primary"
            indicatorColor="primary"
            sx={{ minHeight: 36, height: 36 }}
          >
            <Tab value="pre" label="Pre-orders" sx={{ minHeight: 36, height: 36 }} />
            <Tab value="normal" label="Cancelled orders" sx={{ minHeight: 36, height: 36 }} />
            <Tab value="completed" label="Completed orders" sx={{ minHeight: 36, height: 36 }} />
          </Tabs>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={scannerActive ? "🔴 Scanner Active" : "⚫ Scanner Off"} 
              color={scannerActive ? "success" : "default"} 
              variant="outlined"
              size="small"
            />
          </Box>
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

      {/* Receipt dialog */}
      <Dialog open={receiptOpen} onClose={() => setReceiptOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Order Receipt</DialogTitle>
        <DialogContent sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          {receiptUrl ? (
            <Box component="img" src={receiptUrl} alt="Order receipt" sx={{ width: "100%", borderRadius: 1 }} />
          ) : (
            <DialogContentText>No receipt image available for this order.</DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiptOpen(false)}>Close</Button>
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
