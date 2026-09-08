import { useContext, useState, useEffect } from "react";
import { CartContext } from "../context/CartContext";
import { post, createWalletOrder, verifyWalletPayment } from "../utils/api";
import { useSnackbar } from "../hooks/useSnackbar";
import {
  Box,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { openRazorpay } from "./Cart";

export default function Friends() {
  const { user, login } = useContext(CartContext);
  const { enqueueSnackbar } = useSnackbar();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function fetchCurrentUser() {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:3000/users/getMe', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data && data.success && data.data && data.data.user) {
          const currentUser = data.data.user;
          setBalance(Number(currentUser.walletBalance || 0));
          // Update context with latest user data
          login(currentUser);
        } else {
          setBalance(0);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setBalance(0);
      }
      setLoading(false);
    }
    fetchCurrentUser();
  }, []);

  async function handleAddMoney() {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      enqueueSnackbar("Please enter a valid amount", { variant: "error" });
      return;
    }

    setProcessing(true);

    try {
      // 1. Create Razorpay order on backend
      const orderRes = await createWalletOrder(amountNum);
      if (!orderRes || !orderRes.success || !orderRes.data?.orderId) {
        throw new Error(orderRes?.message || "Failed to initialize wallet recharge");
      }

      const razorpayOrderId = orderRes.data.orderId;
      const keyId = orderRes.data.keyId;

      // 2. Open Razorpay Checkout modal
      let paymentResponse;
      try {
        paymentResponse = await openRazorpay({
          orderId: razorpayOrderId,
          keyId,
          amount: amountNum,
          name: "Wallet Top-up",
          description: `Add ₹${amountNum} to Wallet`,
          prefill: {
            name: user?.username || "",
            email: user?.email || "",
            contact: user?.phoneNo ? String(user.phoneNo) : "",
          },
        });
      } catch (modalErr) {
        const isCancelled = modalErr?.message?.toLowerCase().includes("cancel");
        if (isCancelled) {
          enqueueSnackbar("Recharge cancelled", { variant: "info" });
        } else {
          enqueueSnackbar(modalErr?.description || modalErr?.message || "Payment was not completed", { variant: "error" });
        }
        setProcessing(false);
        return;
      }

      // 3. Verify payment on backend
      const res = await verifyWalletPayment({
        razorpayOrderId: paymentResponse?.razorpay_order_id || razorpayOrderId,
        razorpayPaymentId: paymentResponse?.razorpay_payment_id || "",
        razorpaySignature: paymentResponse?.razorpay_signature || "",
        amount: amountNum,
      });

      if (res && res.success) {
        const newBal = res.data.newBalance;
        setBalance(newBal);
        const updatedUser = { ...user, walletBalance: newBal };
        login(updatedUser);
        setAmount("");
        setOpenDialog(false);
        enqueueSnackbar(`₹${amountNum} added to wallet successfully!`, { variant: "success" });
      } else {
        enqueueSnackbar(res?.message || "Failed to add money", { variant: "error" });
      }
    } catch (error) {
      console.error("Add money error:", error);
      enqueueSnackbar(error?.message || "Payment or top-up failed. Please try again.", { variant: "error" });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f4f6f8",
        p: { xs: 2, sm: 3 },
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 500,
          borderRadius: 3,
        }}
      >
        <Typography variant="h4" fontWeight={600} textAlign="center" mb={2}>
          Wallet
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
          View your current wallet balance
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle1" color="text.secondary">
              Current Balance
            </Typography>
            <Typography variant="h3" fontWeight={700}>
              ₹{(balance ?? 0).toFixed(2)}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{ mt: 2, textTransform: "none", fontWeight: 600 }}
            >
              Add Money
            </Button>
          </Box>
        )}
      </Paper>

      {/* Add Money Dialog */}
      <Dialog open={openDialog} onClose={() => !processing && setOpenDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Money to Wallet</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Amount (₹)"
            type="number"
            fullWidth
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={processing}
            inputProps={{ min: 1, step: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleAddMoney}
            variant="contained"
            disabled={processing || !amount}
          >
            {processing ? "Processing..." : "Proceed to Pay"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
