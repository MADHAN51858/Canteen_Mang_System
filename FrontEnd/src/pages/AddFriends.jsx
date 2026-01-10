import { useState, useContext, useEffect } from "react";
import { post } from "../utils/api";
import { CartContext } from "../context/CartContext";
import { openRazorpay } from "./Cart";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

export default function UserProfile() {
  const { user, login } = useContext(CartContext);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [orderCounts, setOrderCounts] = useState({ pending: 0, preparing: 0, cancelled: 0, completed: 0 });
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
      setPhoneNo(String(user.phoneNo || ""));
      setRollNo(user.rollNo || "");
      fetchOrderCounts();
    }
  }, [user]);

  function validateEmail(val) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(val).trim());
  }

  function cleanPhoneInput(val) {
    return String(val ?? "").replace(/\D/g, "");
  }

  async function handleAddMoney() {
    setAddError("");
    const amountNum = Number(String(addAmount).replace(/[^0-9.]/g, ""));
    if (!amountNum || amountNum <= 0) {
      setAddError("Enter a valid amount");
      return;
    }

    setAddSaving(true);
    try {
      // Launch Razorpay checkout just like wallet page
      await openRazorpay(amountNum);

      const res = await post("/users/addMoney", { amount: amountNum });
      const newBalance = res?.data?.newBalance;
      if (typeof newBalance === "number") {
        login({ ...user, walletBalance: newBalance });
      }
      setAddMoneyOpen(false);
      setAddAmount("");
    } catch (err) {
      setAddError(err?.message || "Failed to add money");
    } finally {
      setAddSaving(false);
    }
  }

  async function fetchOrderCounts() {
    setOrdersLoading(true);
    try {
      const res = await post("/order/getUserOrderList", {});
      if (res && res.success && Array.isArray(res.data)) {
        const counts = res.data.reduce(
          (acc, order) => {
            const status = String(order.status || "").toLowerCase();
            if (status === "pending") acc.pending += 1;
            else if (status === "preparing") acc.preparing += 1;
            else if (status === "cancelled") acc.cancelled += 1;
            else if (status === "completed") acc.completed += 1;
            return acc;
          },
          { pending: 0, preparing: 0, cancelled: 0, completed: 0 }
        );
        const cancelledFromUser = Number(user?.cancelledCount || 0);
        counts.cancelled += cancelledFromUser;
        setOrderCounts(counts);
      }
    } catch (err) {
      // Ignore errors; keep defaults
    } finally {
      setOrdersLoading(false);
    }
  }

  async function handleSave() {
    setMsg("");
    if (!user || !user._id) return setMsg("You must be logged in");
    if (!username || !email || !phoneNo || !rollNo) return setMsg("All fields are required");

    setSaving(true);
    try {
      // Validate inputs
      const cleanPhone = cleanPhoneInput(phoneNo);
      const emailOk = validateEmail(email);
      const phoneOk = cleanPhone.length === 10;

      setEmailError(emailOk ? "" : "Enter a valid email");
      setPhoneError(phoneOk ? "" : "Phone number must be exactly 10 digits");

      if (!emailOk || !phoneOk) {
        setMsg("Please fix validation errors");
        setSaving(false);
        return;
      }

      // Attempt to persist to backend if an endpoint exists; gracefully fall back to local update
      const res = await post("/users/updateProfile", { username, email: String(email).trim(), phoneNo: Number(cleanPhone), rollNo: String(rollNo).trim() });

      if (res && res.success && res.data && res.data.user) {
        login(res.data.user);
        setMsg("Profile updated");
      } else {
        // Fallback: update only in local context
        const updated = { ...user, username, email: String(email).trim(), phoneNo: Number(cleanPhone), rollNo: String(rollNo).trim() };
        login(updated);
        setMsg(res?.message || "Profile updated locally");
      }
      setEditMode(false);
    } catch (err) {
      // Fallback: update only in local context on error
      const cleanPhone = cleanPhoneInput(phoneNo);
      const updated = { ...user, username, email: String(email).trim(), phoneNo: Number(cleanPhone), rollNo: String(rollNo).trim() };
      login(updated);
      setMsg("Profile updated locally");
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!user) return;
    setUsername(user.username || "");
    setEmail(user.email || "");
    setPhoneNo(String(user.phoneNo || ""));
    setRollNo(user.rollNo || "");
    setMsg("");
    setEditMode(false);
    setEmailError("");
    setPhoneError("");
  }

  const walletBalance = Number(user?.walletBalance || 0);

  return (
    <>
    <Box display="flex" justifyContent="center" sx={{ mt: 4, px: 2 }}>
      <Card sx={{ width: "100%", maxWidth: 480, boxShadow: 4, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            User Profile
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Update your contact details and view wallet balance.
          </Typography>

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Username
              </Typography>
              {editMode ? (
                <TextField
                  fullWidth
                  size="small"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  sx={{ mt: 0.5, minWidth: 200 }}
                />
              ) : (
                <Typography variant="h6" fontWeight={700}>
                  {username || "-"}
                </Typography>
              )}
            </Box>
            <Box textAlign="right">
              <Typography variant="subtitle2" color="text.secondary">
                Wallet Balance
              </Typography>
              <Typography variant="h6" fontWeight={800} color="success.main">
                ₹{walletBalance.toFixed(2)}
              </Typography>
            </Box>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
            {[{
              label: "Pending",
              key: "pending",
              color: "warning.main",
            }, {
              label: "Preparing",
              key: "preparing",
              color: "info.main",
            }, {
              label: "Completed",
              key: "completed",
              color: "success.main",
            }, {
              label: "Cancelled",
              key: "cancelled",
              color: "error.main",
            }].map((stat) => (
              <Box
                key={stat.key}
                sx={{
                  flex: 1,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  {stat.label}
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: stat.color }}>
                  {ordersLoading ? "-" : orderCounts[stat.key] ?? 0}
                </Typography>
              </Box>
            ))}
          </Stack>

        

          <Divider sx={{ mb: 2 }} />

          {editMode ? (
            <>
              <TextField
                fullWidth
                label="Email"
                value={email}
                type="email"
                onChange={(e) => {
                  const v = e.target.value;
                  setEmail(v);
                  setEmailError(validateEmail(v) ? "" : "Enter a valid email");
                }}
                error={Boolean(emailError)}
                helperText={emailError || ""}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Phone Number"
                value={phoneNo}
                type="tel"
                inputMode="numeric"
                onChange={(e) => {
                  const v = cleanPhoneInput(e.target.value);
                  setPhoneNo(v);
                  setPhoneError(v.length === 10 ? "" : "Phone number must be exactly 10 digits");
                }}
                error={Boolean(phoneError)}
                helperText={phoneError || ""}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Roll Number"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving}
                  sx={{ flex: 1, py: 1.1, textTransform: "none", fontWeight: 700 }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleReset}
                  disabled={saving}
                  sx={{ flex: 1, py: 1.1, textTransform: "none", fontWeight: 700 }}
                >
                  Cancel
                </Button>
              </Stack>
            </>
          ) : (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {email || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Phone Number
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {phoneNo || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Roll Number
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {rollNo || "-"}
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1 }}>
                <Button
                  variant="contained"
                  onClick={() => setEditMode(true)}
                  sx={{ flex: 1, py: 1.1, textTransform: "none", fontWeight: 700 }}
                >
                  Edit Profile
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setAddMoneyOpen(true)}
                  sx={{ flex: 1, py: 1.1, textTransform: "none", fontWeight: 700 }}
                >
                  Add Money
                </Button>
              </Stack>
            </Stack>
          )}

          {msg && (
            <Alert
              severity={msg.toLowerCase().includes("fail") ? "error" : "success"}
              sx={{ mt: 2 }}
            >
              {msg}
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>

    <Dialog open={addMoneyOpen} onClose={() => setAddMoneyOpen(false)}>
      <DialogTitle>Add Money to Wallet</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Amount (₹)"
          type="number"
          fullWidth
          value={addAmount}
          onChange={(e) => setAddAmount(e.target.value)}
          error={Boolean(addError)}
          helperText={addError || ""}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAddMoneyOpen(false)} disabled={addSaving}>Cancel</Button>
        <Button onClick={handleAddMoney} variant="contained" disabled={addSaving}>
          {addSaving ? "Adding..." : "Add Money"}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
