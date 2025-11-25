import { useContext, useState } from "react";
import { CartContext } from "../context/CartContext";
import { placeOrder } from "../utils/api";

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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";

export default function Cart() {
  const { cart, removeFromCart, clearCart, user } = useContext(CartContext);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const total = cart.reduce((s, i) => s + (i.price || 0), 0);

  async function openRazorpay(amount) {
    // Step 1: get order from backend
    const res = await fetch("http://localhost:3000/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });

    const order = await res.json();

    // Step 2: open Razorpay checkout popup
    const options = {
      key: "rzp_test_RgiPSqw18Sa2P8", // your key
      amount: order.amount,
      currency: "INR",
      name: "Food Ordering App",
      description: "Order Payment",
      order_id: order.id,

      handler: function (response) {
        alert("Payment Successful!");

        console.log(response);
      },

      theme: {
        color: "#F37254",
      },
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }

  async function handlePlaceOrder(total) {
    if (!name) return setMsg("Please provide username or rollNo");
    setLoading(true);
    const userOrder = cart.map((i) => i.itemname);
    try {
       await openRazorpay(total);

         await placeOrder(name, userOrder ,user.username);
        clearCart();
        setName("");
    } catch (err) {
      setMsg("Failed to place order");
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

          {/* User Input */}
          <TextField
            fullWidth
            label="Username or Roll No"
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 3 }}
            disabled={cart.length === 0}
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
                    <Box key={`${i._id || 'item'}-${idx}`}>
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
                            <Typography
                              variant="body2"
                              color="success.main"
                              sx={{ fontWeight: 600, mt: 0.5 }}
                            >
                              ₹{i.price}
                            </Typography>
                          }
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
              // onClick={handlePlaceOrder}
              onClick={() => handlePlaceOrder(total)}
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
    </Box>
  );
}
