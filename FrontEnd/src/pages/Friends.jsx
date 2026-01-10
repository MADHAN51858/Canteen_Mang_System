
import { useContext, useState, useEffect } from "react";
import { CartContext } from "../context/CartContext";
import { post } from "../utils/api";
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
      return;
    }

    setProcessing(true);

    try {
      await openRazorpay(amountNum);

      // Directly add money to wallet
      const res = await post("/users/addMoney", { amount: amountNum });

      if (res && res.success) {
        // Update balance
        setBalance(res.data.newBalance);
        // Update context
        const updatedUser = { ...user, walletBalance: res.data.newBalance };
        login(updatedUser);
        setAmount("");
        setOpenDialog(false);
      }
    } catch (error) {
      console.error("Add money error:", error);
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
