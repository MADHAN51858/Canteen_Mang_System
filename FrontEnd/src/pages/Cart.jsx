import { useContext, useState } from "react";
import { CartContext } from "../context/CartContext";
import { placeOrder, post } from "../utils/api";

import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Container,
  Stack,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControl,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";

export async function openRazorpay(amount) {
  // Load Razorpay script if not loaded
  if (!window.Razorpay) {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(script);
    await new Promise((resolve) => {
      script.onload = resolve;
    });
  }

  // Step 2: open Razorpay checkout popup (dummy gateway - no order_id)
  return new Promise((resolve, reject) => {
    const options = {
      key: "rzp_test_RgiPSqw18Sa2P8",
      amount: amount * 100, // Convert to paise
      currency: "INR",
      name: "Food Ordering App",
      description: "Order Payment",
      // NO order_id for dummy gateway

      handler: function (response) {
        console.log(response);
        resolve(response);
      },

      theme: {
        color: "#F37254",
      },
      modal: {
        ondismiss: function () {
          resolve(); // Allow order to proceed even if dismissed
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (err) {
      console.warn("Razorpay payment failed:", err);
      resolve(); // Allow order to proceed even on failure
    });
    rzp.open();
  });
}

export default function Cart() {
  const { cart, removeFromCart, clearCart, user, increaseQuantity, decreaseQuantity, login } = useContext(CartContext);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPre, setIsPre] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("wallet");

  const total = cart.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const walletBalance = Number(user?.walletBalance || 0);

  function handlePlaceOrderClick() {
    if (!user) return setMsg("Please login to place order");
    if (cart.length === 0) return setMsg("Cart is empty");
    setPaymentDialogOpen(true);
  }

  async function confirmPayment() {
    setPaymentDialogOpen(false);
    setLoading(true);
    const userOrder = cart.flatMap((i) => 
      Array((i.quantity || 1)).fill(i.itemname)
    );

    try {
      if (paymentMethod === "wallet") {
        // Check wallet balance
        if (walletBalance < total) {
          setMsg(`Insufficient wallet balance. Available: ₹${walletBalance}, Required: ₹${total}`);
          setLoading(false);
          return;
        }

        // Deduct from wallet
        const deductRes = await post("/users/deductFromWallet", { amount: total });
        if (!deductRes || !deductRes.success) {
          setMsg(deductRes?.message || "Failed to deduct from wallet");
          setLoading(false);
          return;
        }

        // Update user context with new balance
        if (deductRes.data && deductRes.data.newBalance !== undefined) {
          const updatedUser = { ...user, walletBalance: deductRes.data.newBalance };
          login(updatedUser);
        }

        // Place order
        await placeOrder(userOrder, isPre);
        clearCart();
        setIsPre(false);
        setMsg(`Order placed successfully! ₹${total} deducted from wallet.`);
      } else {
        // Razorpay payment
        await openRazorpay(total);
        await placeOrder(userOrder, isPre);
        clearCart();
        setIsPre(false);
        setMsg("Order placed successfully!");
      }
    } catch (err) {
      setMsg(err?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        p: { xs: 2, sm: 3, md: 4 },
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={3}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            position: "relative",
          }}
        >
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <ShoppingBagIcon sx={{ fontSize: 28, color: "primary.main" }} />
            <Typography variant="h4" fontWeight={700}>
              Shopping Cart
            </Typography>
            <Box
              sx={{
                ml: "auto",
                px: 2,
                py: 0.5,
                bgcolor: "primary.light",
                color: "white",
                borderRadius: 2,
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              {cart.length} items
            </Box>
          </Stack>

          <Divider sx={{ mb: 3 }} />

          {/* Show logged-in user */}
          {user && (
            <Box sx={{ mb: 2, p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Ordering as:
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {user.username}
              </Typography>
            </Box>
          )}

          {/* Pre-order Switch */}
          <FormControlLabel
            control={
              <Switch
                checked={isPre}
                onChange={(e) => setIsPre(e.target.checked)}
                disabled={cart.length === 0}
                color="primary"
              />
            }
            label={
              <Typography variant="body1" fontWeight={500}>
                Pre-order
              </Typography>
            }
            sx={{ mb: 3 }}
          />

          {/* Cart Items */}
          {cart.length === 0 ? (
            <Box
              sx={{
                py: 4,
                textAlign: "center",
                bgcolor: "action.hover",
                borderRadius: 2,
                mb: 2,
              }}
            >
              <ShoppingBagIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
              />
              <Typography variant="h6" color="text.secondary">
                Your cart is empty
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add items from the menu to get started!
              </Typography>
            </Box>
          ) : (
            <>
              <Paper
                variant="outlined"
                sx={{
                  mb: 2,
                  bgcolor: "background.paper",
                  borderRadius: 2,
                }}
              >
                <List sx={{ p: 0 }}>
                  {cart.map((i, idx) => (
                    <Box key={`${i._id || "item"}-${idx}`}>
                      <ListItem
                        secondaryAction={
                          <IconButton
                            edge="end"
                            color="error"
                            onClick={() => removeFromCart(i._id)}
                            sx={{ transition: "all 0.2s" }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        }
                        sx={{
                          py: 1.5,
                          "&:hover": {
                            bgcolor: "action.hover",
                          },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography
                              fontWeight={600}
                              sx={{ fontSize: "1rem" }}
                            >
                              {i.itemname}
                            </Typography>
                          }
                          secondary={
                            <Box component="div" sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                              <Box component="span" sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.875rem' }}>
                                ₹{i.price} × {i.quantity || 1} = ₹{(i.price || 0) * (i.quantity || 1)}
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => decreaseQuantity(i._id)}
                                  sx={{ 
                                    bgcolor: 'action.hover',
                                    '&:hover': { bgcolor: 'action.selected' },
                                    width: 28,
                                    height: 28
                                  }}
                                >
                                  <Box component="span" sx={{ fontSize: '1.2rem', fontWeight: 700 }}>−</Box>
                                </IconButton>
                                <Box component="span" sx={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>
                                  {i.quantity || 1}
                                </Box>
                                <IconButton
                                  size="small"
                                  onClick={() => increaseQuantity(i._id)}
                                  sx={{ 
                                    bgcolor: 'action.hover',
                                    '&:hover': { bgcolor: 'action.selected' },
                                    width: 28,
                                    height: 28
                                  }}
                                  disabled={(i.quantity || 1) >= Number(i.stock ?? Infinity)}
                                >
                                  <Box component="span" sx={{ fontSize: '1.2rem', fontWeight: 700 }}>+</Box>
                                </IconButton>
                              </Box>
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                      </ListItem>
                      {idx < cart.length - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              </Paper>

              <Divider sx={{ my: 2 }} />

              {/* Total */}
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  mb: 2,
                  p: 2,
                  bgcolor: "primary.light",
                  borderRadius: 2,
                  color: "white",
                }}
              >
                <Typography variant="h6" fontWeight={700}>
                  Total Amount
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  ₹{total}
                </Typography>
              </Stack>
            </>
          )}

          {/* Alert */}
          {msg && (
            <Alert
              severity={
                msg.toLowerCase().includes("fail") ||
                msg.toLowerCase().includes("empty")
                  ? "error"
                  : "success"
              }
              sx={{ mb: 2, borderRadius: 2 }}
            >
              {msg}
            </Alert>
          )}

          {/* Action Buttons */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={cart.length === 0 || loading}
              onClick={handlePlaceOrderClick}
              sx={{
                py: 1.2,
                fontWeight: 700,
                textTransform: "none",
                fontSize: "1rem",
                borderRadius: 2,
              }}
            >
              {loading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={20} sx={{ color: "white" }} />
                  Placing order...
                </Box>
              ) : (
                "Place Order"
              )}
            </Button>

            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                clearCart();
                setMsg("");
              }}
              disabled={cart.length === 0}
              sx={{
                py: 1.2,
                fontWeight: 700,
                textTransform: "none",
                fontSize: "1rem",
                borderRadius: 2,
              }}
            >
              Clear Cart
            </Button>
          </Stack>
        </Paper>
      </Container>

      {/* Payment Method Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => !loading && setPaymentDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Select Payment Method</DialogTitle>
        <DialogContent>
          <FormControl component="fieldset" fullWidth sx={{ mt: 1 }}>
            <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.5,
                  mb: 1,
                  border: "1px solid",
                  borderColor: paymentMethod === "wallet" ? "primary.main" : "divider",
                  borderRadius: 2,
                  bgcolor: paymentMethod === "wallet" ? "action.hover" : "transparent",
                  cursor: "pointer",
                }}
                onClick={() => setPaymentMethod("wallet")}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Radio value="wallet" />
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Wallet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Balance: ₹{walletBalance.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.5,
                  border: "1px solid",
                  borderColor: paymentMethod === "razorpay" ? "primary.main" : "divider",
                  borderRadius: 2,
                  bgcolor: paymentMethod === "razorpay" ? "action.hover" : "transparent",
                  cursor: "pointer",
                }}
                onClick={() => setPaymentMethod("razorpay")}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Radio value="razorpay" />
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Razorpay
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pay with card/UPI/netbanking
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </RadioGroup>
          </FormControl>

          {paymentMethod === "wallet" && walletBalance < total && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Insufficient balance. Add ₹{(total - walletBalance).toFixed(2)} more to your wallet.
            </Alert>
          )}

          <Box sx={{ mt: 2, p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" fontWeight={600}>
                Order Total:
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                ₹{total}
              </Typography>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={confirmPayment} 
            disabled={loading || (paymentMethod === "wallet" && walletBalance < total)}
          >
            {loading ? "Processing..." : "Confirm Payment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
