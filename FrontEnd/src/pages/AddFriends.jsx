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
  Container,
  Paper,
  Grid,
  Skeleton,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
      setPhoneNo(String(user.phoneNo || ""));
      setRollNo(user.rollNo || "");
      fetchOrderCounts();
      // Simulate loading delay
      setTimeout(() => setLoading(false), 500);
    } else {
      setLoading(false);
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
          {/* Decorative background element */}
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

          <Stack direction="row" alignItems="center" spacing={2} sx={{ zIndex: 1 }}>
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
              <PersonIcon sx={{ fontSize: 36, color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: "1.75rem", sm: "2.5rem" }, color: "white", lineHeight: 1 }}>
                My Profile
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
                Manage your account & wallet
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {loading ? (
          <Grid container spacing={3}>
            {/* Wallet Skeleton */}
            <Grid item xs={12} sm={6} lg={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  boxShadow: "0 8px 24px rgba(16,185,129,0.25)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: "rgba(255,255,255,0.2)" }} />
                    <Skeleton variant="text" width={140} height={24} sx={{ bgcolor: "rgba(255,255,255,0.25)" }} />
                  </Stack>
                  <Skeleton variant="text" width={180} height={56} sx={{ bgcolor: "rgba(255,255,255,0.25)" }} />
                  <Skeleton variant="rectangular" width="100%" height={36} sx={{ borderRadius: 1, bgcolor: "rgba(255,255,255,0.25)" }} />
                </Stack>
              </Paper>
            </Grid>

            {/* Profile Details Skeleton */}
            <Grid item xs={12} sm={6} lg={9}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: "white",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Skeleton variant="text" width={180} height={32} />
                  <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 1 }} />
                </Stack>

                <Grid container spacing={3}>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <Grid item xs={12} sm={idx < 2 ? 6 : 12} key={idx}>
                      <Box
                        sx={{
                          p: 2.5,
                          borderRadius: 2,
                          bgcolor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <Skeleton variant="text" width={100} height={16} sx={{ mb: 1 }} />
                        <Skeleton variant="text" width={idx < 2 ? "60%" : "80%"} height={28} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>

            {/* Order Statistics Skeleton */}
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: "white",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                <Skeleton variant="text" width={180} height={32} sx={{ mb: 3 }} />
                <Grid container spacing={2}>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <Grid item xs={12} sm={6} md={3} key={idx}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          p: 3,
                          borderRadius: 2,
                          bgcolor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <Skeleton variant="text" width={100} height={20} sx={{ mb: 1 }} />
                        <Skeleton variant="text" width={60} height={48} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={3} alignItems="center">
            {/* Wallet Card */}
            <Grid item xs={12} sm={6} lg={3}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                boxShadow: "0 8px 24px rgba(16,185,129,0.25)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AccountBalanceWalletIcon sx={{ fontSize: 32 }} />
                  <Typography variant="h6" fontWeight={700}>
                    Wallet Balance
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight={900} sx={{ fontSize: "2.5rem" }}>
                  ₹{walletBalance.toFixed(2)}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setAddMoneyOpen(true)}
                  sx={{
                    bgcolor: "white",
                    color: "#059669",
                    fontWeight: 700,
                    textTransform: "none",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.9)",
                    },
                  }}
                >
                  Add Money
                </Button>
              </Stack>
            </Paper>
          </Grid>

          {/* Profile Details Card */}
          <Grid item xs={12} sm={6} lg={9}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                background: "white",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: "#1e293b" }}>
                  Profile Information
                </Typography>
                {!editMode && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => setEditMode(true)}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      borderRadius: 2,
                    }}
                  >
                    Edit
                  </Button>
                )}
              </Stack>

              {editMode ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3.5,
                    borderRadius: 2,
                    bgcolor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: "#1e293b" }}>
                    Edit Your Profile
                  </Typography>

                  <Grid container spacing={2.5} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        variant="outlined"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "white",
                            transition: "all 0.2s ease",
                            "&:hover fieldset": {
                              borderColor: "#3b82f6",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#1d4ed8",
                              borderWidth: 2,
                            },
                          },
                          "& .MuiOutlinedInput-input": {
                            padding: "12px 14px",
                            fontWeight: 600,
                          },
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Roll Number"
                        value={rollNo}
                        onChange={(e) => setRollNo(e.target.value)}
                        variant="outlined"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "white",
                            transition: "all 0.2s ease",
                            "&:hover fieldset": {
                              borderColor: "#3b82f6",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#1d4ed8",
                              borderWidth: 2,
                            },
                          },
                          "& .MuiOutlinedInput-input": {
                            padding: "12px 14px",
                            fontWeight: 600,
                          },
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
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
                        variant="outlined"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "white",
                            transition: "all 0.2s ease",
                            "&:hover fieldset": {
                              borderColor: "#3b82f6",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#1d4ed8",
                              borderWidth: 2,
                            },
                            "&.Mui-error fieldset": {
                              borderColor: "#ef4444",
                            },
                          },
                          "& .MuiOutlinedInput-input": {
                            padding: "12px 14px",
                            fontWeight: 600,
                          },
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
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
                        variant="outlined"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "white",
                            transition: "all 0.2s ease",
                            "&:hover fieldset": {
                              borderColor: "#3b82f6",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#1d4ed8",
                              borderWidth: 2,
                            },
                            "&.Mui-error fieldset": {
                              borderColor: "#ef4444",
                            },
                          },
                          "& .MuiOutlinedInput-input": {
                            padding: "12px 14px",
                            fontWeight: 600,
                          },
                        }}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ mb: 3 }} />

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={saving}
                      sx={{
                        flex: 1,
                        py: 1.5,
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "1rem",
                        borderRadius: 2,
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      }}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleReset}
                      disabled={saving}
                      sx={{
                        flex: 1,
                        py: 1.5,
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "1rem",
                        borderRadius: 2,
                        border: "2px solid #e2e8f0",
                        color: "#64748b",
                        "&:hover": {
                          bgcolor: "#f1f5f9",
                          borderColor: "#cbd5e1",
                        },
                      }}
                    >
                      Cancel
                    </Button>
                  </Stack>
                </Paper>
              ) : (
                <Grid container spacing={3}  alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: "#f0f9ff",
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "#0369a1", fontWeight: 700, display: "block", mb: 0.5 }}>
                        Username
                      </Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ color: "#1e293b" }}>
                        {username || "-"}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: "#fef3c7",
                        border: "1px solid #fcd34d",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "#92400e", fontWeight: 700, display: "block", mb: 0.5 }}>
                        Roll Number
                      </Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ color: "#1e293b" }}>
                        {rollNo || "-"}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: "#dcfce7",
                        border: "1px solid #86efac",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "#15803d", fontWeight: 700, display: "block", mb: 0.5 }}>
                        Email
                      </Typography>
                      <Typography variant="body1" fontWeight={600} sx={{ color: "#1e293b", wordBreak: "break-all" }}>
                        {email || "-"}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: "#ede9fe",
                        border: "1px solid #d8b4fe",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "#6d28d9", fontWeight: 700, display: "block", mb: 0.5 }}>
                        Phone Number
                      </Typography>
                      <Typography variant="body1" fontWeight={600} sx={{ color: "#1e293b" }}>
                        {phoneNo || "-"}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}

              {msg && (
                <Alert
                  severity={msg.toLowerCase().includes("fail") ? "error" : "success"}
                  sx={{ mt: 3 }}
                >
                  {msg}
                </Alert>
              )}
            </Paper>
          </Grid>

          {/* Order Statistics - Full Width Below */}
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                background: "white",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <Typography variant="h5" fontWeight={700} sx={{ mb: 3, color: "#1e293b" }}>
                Order Statistics
              </Typography>
              <Grid container spacing={2}>
                {[{
                  label: "Pending",
                  key: "pending",
                  color: "#f59e0b",
                  bg: "#fef3c7",
                }, {
                  label: "Preparing",
                  key: "preparing",
                  color: "#3b82f6",
                  bg: "#dbeafe",
                }, {
                  label: "Completed",
                  key: "completed",
                  color: "#10b981",
                  bg: "#d1fae5",
                }, {
                  label: "Cancelled",
                  key: "cancelled",
                  color: "#ef4444",
                  bg: "#fee2e2",
                }].map((stat) => (
                  <Grid item xs={12} sm={6} md={3} key={stat.key}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        p: 3,
                        borderRadius: 2,
                        bgcolor: stat.bg,
                        border: "1px solid",
                        borderColor: stat.color + "40",
                        textAlign: "center",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                        },
                      }}
                    >
                      <Typography variant="body2" fontWeight={700} sx={{ color: "#64748b", mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {stat.label}
                      </Typography>
                      <Typography variant="h3" fontWeight={900} sx={{ color: stat.color }}>
                        {ordersLoading ? "-" : orderCounts[stat.key] ?? 0}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
        )}
      </Container>

      {/* Add Money Dialog */}
      <Dialog open={addMoneyOpen} onClose={() => setAddMoneyOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Money to Wallet</DialogTitle>
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
    </Box>
  );
}
