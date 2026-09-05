import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    Grid,
    Card,
    CardContent,
    Chip,
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
  const navigate = useNavigate();
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

          <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, zIndex: 1 }}>
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
              <ShoppingBagIcon sx={{ fontSize: 36, color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: "1.75rem", sm: "2.5rem" }, color: "white", lineHeight: 1 }}>
                Shopping Cart
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
                Review & checkout your items
              </Typography>
            </Box>
          </Stack>

          <Chip
            label={`${cart.length} items`}
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              color: "white",
              fontWeight: 800,
              fontSize: "1rem",
              px: 2,
              py: 2.5,
              height: "auto",
              border: "2px solid rgba(255,255,255,0.3)",
              zIndex: 1,
            }}
          />
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            {/* User info moved into Order Summary */}


            {cart.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  position: "sticky",
                  top: 20,
                  p: 3,
                  borderRadius: 3,
                  bgcolor: "white",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                <Typography variant="h5" fontWeight={700} sx={{ mb: 3, color: "#1e293b" }}>
                  Order Summary
                </Typography>

                {user && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Ordering as
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: "#1e293b" }}>
                      {user.username}
                    </Typography>
                  </Box>
                )}

                <Stack spacing={2}>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                          Pre-order
                        </Typography>
                      </Box>
                      <Switch
                        checked={isPre}
                        onChange={(e) => setIsPre(e.target.checked)}
                        disabled={cart.length === 0}
                        color="primary"
                      />
                    </Stack>
                  </Box>

                  <Divider />

                  <Box sx={{ p: 2.5, borderRadius: 2, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body1" fontWeight={700}>
                        Total Amount &nbsp;  &nbsp; <br />
                        <Typography component="h6" variant="caption" sx={{ fontWeight: 500 }}>
                          (incl. taxes)
                        </Typography>
                      </Typography>
                      <Typography variant="h4" fontWeight={900}>
                        ₹{total}.00
                      </Typography>
                    </Stack>
                  </Box>

                  <Stack spacing={1.5} sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      disabled={cart.length === 0 || loading}
                      onClick={handlePlaceOrderClick}
                      sx={{
                        py: 1.5,
                        fontWeight: 700,
                        textTransform: "none",
                        fontSize: "1.05rem",
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
                      color="error"
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
                </Stack>
              </Paper>
            )}
          </Grid>

          <Grid item xs={12} md={8}>
            {cart.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  py: 8,
                  px: 4,
                  textAlign: "center",
                  background: "linear-gradient(135deg, #f8fafc 0%, #f0f9ff 100%)",
                  borderRadius: 3,
                  border: "2px dashed #cbd5e1",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 400,
                }}
              >
                <Box
                  sx={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    bgcolor: "rgba(100, 116, 139, 0.1)",
                    display: "grid",
                    placeItems: "center",
                    mb: 3,
                  }}
                >
                  <ShoppingBagIcon
                    sx={{ fontSize: 56, color: "#64748b" }}
                  />
                </Box>
                <Typography variant="h4" fontWeight={900} sx={{ color: "#1e293b", mb: 1 }}>
                  Your cart is empty
                </Typography>
                <Typography variant="body1" sx={{ color: "#64748b", mb: 4, maxWidth: 300 }}>
                  Looks like you haven't added any items yet. Explore our menu and add your favorite dishes!
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate("/student/menu")}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontWeight: 700,
                    textTransform: "none",
                    fontSize: "1rem",
                    borderRadius: 2,
                    background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
                    cursor: "pointer",
                  }}
                >
                  Continue Shopping
                </Button>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {cart.map((i, idx) => (
                  <Grid item xs={12} sm={6} md={6} key={`${i._id || "item"}-${idx}`}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: "white",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        },
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" fontWeight={700} sx={{ color: "#1e293b", mb: 0.5 }}>
                            {i.itemname}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#10b981", fontWeight: 700, mb: 1 }}>
                            ₹{i.price} × {i.quantity || 1} = ₹{(i.price || 0) * (i.quantity || 1)}
                          </Typography>

                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => decreaseQuantity(i._id)}
                              sx={{
                                bgcolor: "#f1f5f9",
                                border: "1px solid #cbd5e1",
                                "&:hover": { bgcolor: "#e2e8f0" },
                                width: 32,
                                height: 32,
                              }}
                            >
                              <Box component="span" sx={{ fontSize: "1.2rem", fontWeight: 700 }}>−</Box>
                            </IconButton>
                            <Box
                              sx={{
                                minWidth: 40,
                                textAlign: "center",
                                fontWeight: 700,
                                fontSize: "1rem",
                                bgcolor: "#f0f9ff",
                                border: "1px solid #bfdbfe",
                                borderRadius: 1,
                                py: 0.5,
                              }}
                            >
                              {i.quantity || 1}
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => increaseQuantity(i._id)}
                              sx={{
                                bgcolor: "#f1f5f9",
                                border: "1px solid #cbd5e1",
                                "&:hover": { bgcolor: "#e2e8f0" },
                                width: 32,
                                height: 32,
                              }}
                              disabled={(i.quantity || 1) >= Number(i.stock ?? Infinity)}
                            >
                              <Box component="span" sx={{ fontSize: "1.2rem", fontWeight: 700 }}>+</Box>
                            </IconButton>
                          </Box>
                        </Box>

                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => removeFromCart(i._id)}
                          sx={{
                            bgcolor: "#fee2e2",
                            border: "1px solid #fecaca",
                            "&:hover": { bgcolor: "#fecaca" },
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>
        </Grid>

        {msg && (
          <Alert
            severity={
              msg.toLowerCase().includes("fail") ||
              msg.toLowerCase().includes("empty")
                ? "error"
                : "success"
            }
            sx={{ mt: 3, borderRadius: 2 }}
          >
            {msg}
          </Alert>
        )}
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
