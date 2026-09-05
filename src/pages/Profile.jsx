import { useState, useContext, useEffect, useRef } from "react";
import { post, postForm } from "../utils/api";
import { CartContext } from "../context/CartContext";
import { openRazorpay } from "./Cart";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
  IconButton,
  CircularProgress,
  Badge,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
} from "@mui/material";

// Icons
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import LocalPhoneOutlinedIcon from "@mui/icons-material/LocalPhoneOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import SoupKitchenRoundedIcon from "@mui/icons-material/SoupKitchenRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import cashWalletSvg from "../assets/cashWallet.svg";

// Date formatting helper: e.g. 06 Jan 2026
function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "N/A";
  }
}

export default function UserProfile() {
  const { user, login } = useContext(CartContext);
  const fileInputRef = useRef(null);

  // Profile editable form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Order statistics state
  const [orderCounts, setOrderCounts] = useState({
    pending: 0,
    preparing: 0,
    cancelled: 0,
    completed: 0,
  });

  // Wallet Add Money state
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // Quick Action Dialogs
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifOrder, setNotifOrder] = useState(true);
  const [notifWallet, setNotifWallet] = useState(true);
  const [notifPromo, setNotifPromo] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "madhu");
      setEmail(user.email || "madhanku635@gmail.com");
      setPhoneNo(String(user.phoneNo || "2552252222"));
      setRollNo(user.rollNo || "dscftrdtghtfdyhtr");
      setAvatarPreview(user.avatar || "");
      fetchOrderCounts();
    }
  }, [user]);

  async function fetchOrderCounts() {
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
    } catch {
      // Ignore errors; keep default counts
    }
  }

  // Handle avatar selection in the editable view
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg("Please select a valid image file");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setMsg("");
  };

  // Save changes directly from the left editable form
  const handleSaveChanges = async () => {
    setMsg("");
    if (!username || !email || !phoneNo || !rollNo) {
      setMsg("All fields are required");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("email", email.trim());
      formData.append("phoneNo", phoneNo.replace(/\D/g, ""));
      formData.append("rollNo", rollNo.trim());
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await postForm("/users/updateProfile", formData);
      if (res && res.success && res.data && res.data.user) {
        login(res.data.user);
        setUsername(res.data.user.username);
        setEmail(res.data.user.email);
        setPhoneNo(String(res.data.user.phoneNo));
        setRollNo(res.data.user.rollNo);
        if (res.data.user.avatar) {
          setAvatarPreview(res.data.user.avatar);
        }
        setAvatarFile(null);
        setMsg("Profile updated successfully!");
      } else {
        setMsg(res?.message || "Failed to update profile");
      }
    } catch (err) {
      setMsg(err?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Handle Add Money to Wallet (Razorpay)
  async function handleAddMoney(customAmount) {
    setAddError("");
    const amountVal = customAmount !== undefined ? customAmount : addAmount;
    const amountNum = Number(String(amountVal).replace(/[^0-9.]/g, ""));
    if (!amountNum || amountNum <= 0) {
      setAddError("Please enter a valid amount");
      return;
    }

    setAddSaving(true);
    try {
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

  const walletBalance = Number(user?.walletBalance ?? 1780);
  const rawRole = String(user?.role || "student").toLowerCase();
  const roleDisplay = rawRole.includes("admin")
    ? "Admin"
    : rawRole.includes("staff")
      ? "Staff"
      : "Student";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        p: { xs: 2, sm: 3, md: 4 },
        boxSizing: "border-box",
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
   
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3.5,
          alignItems: "stretch",
          width: "100%",
          boxSizing: "border-box",
        }}
      >

        <Box
          sx={{
            flex: { xs: "1 1 auto", md: "1 1 0%" },
            width: { xs: "100%", md: "50%" },
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }}
        >
          {/* 1. EDITABLE PROFILE FORM CARD */}
          <Box
            sx={{
              flex: 1,
              width: "100%",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              boxShadow: "none",
              border: "1px solid #e2e8f0",
              p: { xs: 3, sm: 4 },
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "border-color 0.2s ease",
              "&:hover": {
                boxShadow: "none",
                borderColor: "#cbd5e1",
              },
            }}
          >
            {/* Header: Profile Overview */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                pb: 3.5,
                width: "100%",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              {/* Circular Avatar */}
              <Box sx={{ position: "relative", flexShrink: 0 }}>
                <Avatar
                  src={avatarPreview || user?.avatar}
                  alt={username}
                  sx={{
                    width: { xs: 90, sm: 104 },
                    height: { xs: 90, sm: 104 },
                    p: 1.5,
                    border: "3px solid #d9d9d9ff",
                    boxShadow: "none",
                    fontSize: "2.4rem",
                    fontWeight: 800,
                    background: (avatarPreview || user?.avatar) ? "transparent" : "linear-gradient(135deg, #2563eb, #4f46e5)",
                    color: "#ffffff",
                  }}
                >
                  {!(avatarPreview || user?.avatar) && (username ? username[0].toUpperCase() : "M")}
                </Avatar>

                {/* Camera upload badge */}
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
                  size="small"
                  sx={{
                    position: "absolute",
                    bottom: -2,
                    right: -2,
                    backgroundColor: "#9b9c9dff",
                    color: "#ffffff",
                    width: 34,
                    height: 34,
                    border: "2px solid #ffffff",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "#1d4ed8",
                      transform: "scale(1.08)",
                    },
                  }}
                  title="Upload profile photo"
                >
                  <PhotoCameraRoundedIcon sx={{ fontSize: 17 }} />
                </IconButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAvatarChange}
                />
              </Box>

              {/* User Role & Information */}
              <Box sx={{ display: "flex", flexDirection: "column",  textAlign: "left" }}>
                <Typography sx={{ fontWeight: 600, fontSize: "1.25rem", color: "#0f172a", letterSpacing: -0.3, textTransform: "capitalize" }}>
                  {username || user?.username || "User"}
                </Typography>

                <Typography sx={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500, mt: 0.3 }}>
                  {email || user?.email || "User"}
                </Typography>

                <Chip
                  label={`${roleDisplay} Account`}
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    borderRadius: "6px",
                    px: 0.8,
                    py: 1.8,
                    mt: 0.8,
                    backgroundColor: roleDisplay === "Admin" ? "#ede9fe" : roleDisplay === "Staff" ? "#dcfce7" : "#eff6ff",
                    color: roleDisplay === "Admin" ? "#6d28d9" : roleDisplay === "Staff" ? "#15803d" : "#2563eb",
                    border: roleDisplay === "Admin" ? "1px solid #6d28d9" : roleDisplay === "Staff" ? "1px solid #15803d" : "1px solid #2563eb",
                  }}
                />
              </Box>
            </Box>

            {/* Editable Form Inputs */}
            <Stack spacing={2.8} sx={{ mt: 3, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              {/* Username Field */}
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.86rem", color: "#1e293b", mb: 0.8, display: "flex", alignItems: "center", gap: 0.8 }}>
                  <PersonOutlineRoundedIcon sx={{ fontSize: 17, color: "#9333ea" }} />
                  Username
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      backgroundColor: "#fbfcfd",
                      transition: "all 0.2s ease",
                      border: "1px solid #e2e8f0",
                      "&:hover": { borderColor: "#cbd5e1" },
                      "&.Mui-focused": {
                        borderColor: "#3b82f6",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.12)",
                      },
                      "& fieldset": { border: "none" },
                    },
                    "& .MuiOutlinedInput-input": { padding: "13px 16px", fontSize: "0.92rem", fontWeight: 500, color: "#0f172a" },
                  }}
                />
              </Box>

              {/* Roll Number Field */}
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.86rem", color: "#1e293b", mb: 0.8, display: "flex", alignItems: "center", gap: 0.8 }}>
                  <BadgeOutlinedIcon sx={{ fontSize: 17, color: "#d97706" }} />
                  Roll Number
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Enter your roll number"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      backgroundColor: "#fbfcfd",
                      transition: "all 0.2s ease",
                      border: "1px solid #e2e8f0",
                      "&:hover": { borderColor: "#cbd5e1" },
                      "&.Mui-focused": {
                        borderColor: "#3b82f6",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.12)",
                      },
                      "& fieldset": { border: "none" },
                    },
                    "& .MuiOutlinedInput-input": { padding: "13px 16px", fontSize: "0.92rem", fontWeight: 500, color: "#0f172a" },
                  }}
                />
              </Box>

              {/* Phone Number Field */}
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.86rem", color: "#1e293b", mb: 0.8, display: "flex", alignItems: "center", gap: 0.8 }}>
                  <LocalPhoneOutlinedIcon sx={{ fontSize: 17, color: "#16a34a" }} />
                  Phone Number
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Enter 10-digit phone number"
                  value={phoneNo}
                  onChange={(e) => setPhoneNo(e.target.value)}
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      backgroundColor: "#fbfcfd",
                      transition: "all 0.2s ease",
                      border: "1px solid #e2e8f0",
                      "&:hover": { borderColor: "#cbd5e1" },
                      "&.Mui-focused": {
                        borderColor: "#3b82f6",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.12)",
                      },
                      "& fieldset": { border: "none" },
                    },
                    "& .MuiOutlinedInput-input": { padding: "13px 16px", fontSize: "0.92rem", fontWeight: 500, color: "#0f172a" },
                  }}
                />
              </Box>

              {/* Email Address Field */}
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.86rem", color: "#1e293b", mb: 0.8, display: "flex", alignItems: "center", gap: 0.8 }}>
                  <MailOutlineRoundedIcon sx={{ fontSize: 17, color: "#0284c7" }} />
                  Email Address
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      backgroundColor: "#fbfcfd",
                      transition: "all 0.2s ease",
                      border: "1px solid #e2e8f0",
                      "&:hover": { borderColor: "#cbd5e1" },
                      "&.Mui-focused": {
                        borderColor: "#3b82f6",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.12)",
                      },
                      "& fieldset": { border: "none" },
                    },
                    "& .MuiOutlinedInput-input": { padding: "13px 16px", fontSize: "0.92rem", fontWeight: 500, color: "#0f172a" },
                  }}
                />
              </Box>

              <Box sx={{ backgroundColor: "#f8fafc", p: 2, borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ fontSize: "0.84rem", fontWeight: 600 }}>
                  Registration on
                </Typography>
                <Typography sx={{ color: "#0f172a", fontSize: "0.88rem", fontWeight: 700 }}>
                  {formatDate(user?.createdAt)}
                </Typography>
              </Box>

              {/* Alert Message */}
              {msg && (
                <Alert
                  severity={msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error") ? "error" : "success"}
                  sx={{ borderRadius: "12px", fontWeight: 600 }}
                >
                  {msg}
                </Alert>
              )}

              {/* Save Changes Button */}
              <Box sx={{ mt: "auto", pt: 1 }}>
                <Button
                  onClick={handleSaveChanges}
                  variant="contained"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
                  sx={{
                    width: "100%",
                    background: "#0088ff",
                    color: "#ffffff",
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    borderRadius: "14px",
                    boxShadow:"none",
                    py: 1.4,
                    px: 4.5,
                    "&:hover": {
                      background: "#0475d8ff",
                    },
                  }}
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Box>

        <Box
          sx={{
            flex: { xs: "1 1 auto", md: "1 1 0%" },
            width: { xs: "100%", md: "50%" },
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }}
        >
          <Stack
            spacing={3.5}
            sx={{
              height: "100%",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            {/* 1. WALLET BALANCE CARD (Blue Fintech Card matching reference) */}
            <Box
              sx={{
                position: "relative",
                overflow: "hidden",
                flex: { xs: "none", md: "1 1 0%" },
                minHeight: { xs: "auto", md: 210 },
                width: "100%",
                backgroundColor: "#0084ff",
                borderRadius: "12px",
                boxShadow: "none",
                p: { xs: 2.8, sm: 3.5 },
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                "&:hover": {
                  boxShadow: "none",
                },
              }}
            >
              <Box sx={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
                <Box>
                  <Typography
                    sx={{
                      fontWeight: 500,
                      fontSize: { xs: "1.15rem", sm: "1.3rem" },
                      color: "#ffffff",
                      letterSpacing: -0.2,
                      mb: 0.8,
                    }}
                  >
                    Wallet Balance
                  </Typography>

                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: "2.1rem", sm: "2.55rem" },
                      color: "#ffffff",
                      letterSpacing: -0.6,
                      lineHeight: 1.1,
                      my: 0,
                    }}
                  >
                    ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>

                <Box sx={{ mt: "auto", pt: { xs: 2, sm: 2.5 } }}>
                  <Button
                    onClick={() => {
                      setAddAmount("");
                      setAddMoneyOpen(true);
                    }}
                    variant="outlined"
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.16)",
                      border: "1px solid rgba(255, 255, 255, 0.45)",
                      color: "#ffffff",
                      textTransform: "none",
                      fontWeight: 500,
                      fontSize: "0.86rem",
                      borderRadius: "8px",
                      px: 2.4,
                      py: 0.65,
                      boxShadow: "none",
                      backdropFilter: "blur(4px)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.28)",
                        borderColor: "#ffffff",
                        boxShadow: "none",
                      },
                    }}
                  >
                    Add Funds
                  </Button>
                </Box>
              </Box>

              <Box
                component="img"
                src={cashWalletSvg}
                alt="Cash Wallet"
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  height: "100%",
                  width: "auto",
                  objectFit: "contain",
                  objectPosition: "bottom right",
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              />
            </Box>

            {/* 2. ORDER STATISTICS CARD */}
            <Box
              sx={{
                flex: { xs: "none", md: "1 1 0%" },
                minHeight: { xs: "auto", md: 210 },
                width: "100%",
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                boxShadow: "none",
                border: "1px solid #e2e8f0",
                p: { xs: 2.8, sm: 3.5 },
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "border-color 0.2s ease",
                "&:hover": {
                  boxShadow: "none",
                  borderColor: "#cbd5e1",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: "8px",
                      backgroundColor: "#e0f2fe",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0284c7",
                    }}
                  >
                    <BarChartRoundedIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a" }}>
                      Order Statistics
                    </Typography>
                    <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>
                      Lifetime activity summary
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
                  gap: 1.5,
                  mt: "auto",
                  width: "100%",
                }}
              >
                {/* 1. Pending */}
                <Box
                  sx={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #fef3c7",
                    borderRadius: "10px",
                    p: "14px 10px 18px",
                    position: "relative",
                    boxShadow: "none",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: "none",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.8 }}>
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: "6px",
                        backgroundColor: "#fef3c7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#f59e0b",
                      }}
                    >
                      <AccessTimeRoundedIcon sx={{ fontSize: 15 }} />
                    </Box>
                    <Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>
                      Pending
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: "1.65rem", fontWeight: 900, color: "#0f172a", pl: 0.4, mb: 0.4 }}>
                    {orderCounts.pending}
                  </Typography>
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 8,
                      left: 14,
                      right: 14,
                      height: "3px",
                      backgroundColor: "#f59e0b",
                      borderRadius: "2px",
                    }}
                  />
                </Box>

                {/* 2. Preparing */}
                <Box
                  sx={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e0f2fe",
                    borderRadius: "10px",
                    p: "14px 10px 18px",
                    position: "relative",
                    boxShadow: "none",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: "none",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.8 }}>
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: "6px",
                        backgroundColor: "#e0f2fe",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#3b82f6",
                      }}
                    >
                      <SoupKitchenRoundedIcon sx={{ fontSize: 15 }} />
                    </Box>
                    <Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>
                      Preparing
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: "1.65rem", fontWeight: 900, color: "#0f172a", pl: 0.4, mb: 0.4 }}>
                    {orderCounts.preparing}
                  </Typography>
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 8,
                      left: 14,
                      right: 14,
                      height: "3px",
                      backgroundColor: "#3b82f6",
                      borderRadius: "2px",
                    }}
                  />
                </Box>

                {/* 3. Completed */}
                <Box
                  sx={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #dcfce7",
                    borderRadius: "10px",
                    p: "14px 10px 18px",
                    position: "relative",
                    boxShadow: "none",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: "none",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.8 }}>
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: "6px",
                        backgroundColor: "#dcfce7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#10b981",
                      }}
                    >
                      <CheckCircleRoundedIcon sx={{ fontSize: 15 }} />
                    </Box>
                    <Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>
                      Completed
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: "1.65rem", fontWeight: 900, color: "#0f172a", pl: 0.4, mb: 0.4 }}>
                    {orderCounts.completed}
                  </Typography>
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 8,
                      left: 14,
                      right: 14,
                      height: "3px",
                      backgroundColor: "#10b981",
                      borderRadius: "2px",
                    }}
                  />
                </Box>

                {/* 4. Cancelled */}
                <Box
                  sx={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #fee2e2",
                    borderRadius: "10px",
                    p: "14px 10px 18px",
                    position: "relative",
                    boxShadow: "none",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: "none",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.8 }}>
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: "6px",
                        backgroundColor: "#fee2e2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ef4444",
                      }}
                    >
                      <CancelRoundedIcon sx={{ fontSize: 15 }} />
                    </Box>
                    <Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>
                      Cancelled
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: "1.65rem", fontWeight: 900, color: "#0f172a", pl: 0.4, mb: 0.4 }}>
                    {orderCounts.cancelled}
                  </Typography>
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 8,
                      left: 14,
                      right: 14,
                      height: "3px",
                      backgroundColor: "#ef4444",
                      borderRadius: "2px",
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* 3. QUICK ACTIONS CARD */}
            <Box
              sx={{
                flex: { xs: "none", md: "1 1 0%" },
                minHeight: { xs: "auto", md: 210 },
                width: "100%",
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                boxShadow: "none",
                border: "1px solid #e2e8f0",
                p: { xs: 2.8, sm: 3.5 },
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "border-color 0.2s ease",
                "&:hover": {
                  boxShadow: "none",
                  borderColor: "#cbd5e1",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: "8px",
                      backgroundColor: "#fef3c7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#d97706",
                    }}
                  >
                    <BoltRoundedIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a" }}>
                      Quick Actions
                    </Typography>
                    <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>
                      Security and preferences
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                  gap: 2,
                  mt: "auto",
                  width: "100%",
                }}
              >
                {/* Change Password Card */}
                <Box
                  onClick={() => {
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordMsg("");
                    setPasswordOpen(true);
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: { xs: 1.8, sm: 2.2 },
                    minHeight: 68,
                    boxSizing: "border-box",
                    borderRadius: "10px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #ede9fe",
                    cursor: "pointer",
                    boxShadow: "none",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "#f5f3ff",
                      borderColor: "#ddd6fe",
                      boxShadow: "none",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: "8px",
                        backgroundColor: "#f3e8ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#7c3aed",
                      }}
                    >
                      <LockOutlinedIcon sx={{ fontSize: 19 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>
                        Change Password
                      </Typography>
                      <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>
                        Update login credentials
                      </Typography>
                    </Box>
                  </Box>
                  <ChevronRightRoundedIcon sx={{ color: "#a78bfa", fontSize: 20 }} />
                </Box>

                {/* Notification Settings Card */}
                <Box
                  onClick={() => setNotifOpen(true)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: { xs: 1.8, sm: 2.2 },
                    minHeight: 68,
                    boxSizing: "border-box",
                    borderRadius: "10px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e0f2fe",
                    cursor: "pointer",
                    boxShadow: "none",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "#eff6ff",
                      borderColor: "#bfdbfe",
                      boxShadow: "none",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: "8px",
                        backgroundColor: "#e0f2fe",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#2563eb",
                      }}
                    >
                      <NotificationsNoneOutlinedIcon sx={{ fontSize: 19 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>
                        Notifications
                      </Typography>
                      <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>
                        Order & wallet alerts
                      </Typography>
                    </Box>
                  </Box>
                  <ChevronRightRoundedIcon sx={{ color: "#93c5fd", fontSize: 20 }} />
                </Box>
              </Box>
            </Box>
          </Stack>
        </Box>
      </Box>


      {/* A. ADD MONEY DIALOG */}
      <Dialog
        open={addMoneyOpen}
        onClose={() => setAddMoneyOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "20px", p: 1.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.25rem", pb: 0.5 }}>
          Add Money to Wallet
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mb: 2.5 }}>
            Top up your canteen balance instantly via Razorpay.
          </Typography>

          {/* Quick preset amount chips */}
          <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
            {[100, 200, 500, 1000].map((amt) => (
              <Chip
                key={amt}
                label={`₹${amt}`}
                onClick={() => setAddAmount(String(amt))}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  bgcolor: addAmount === String(amt) ? "#ede9fe" : "#f8fafc",
                  color: addAmount === String(amt) ? "#6d28d9" : "#334155",
                  borderColor: addAmount === String(amt) ? "#8b5cf6" : "#e2e8f0",
                  borderWidth: 1,
                  borderStyle: "solid",
                  "&:hover": { bgcolor: "#ede9fe" },
                }}
              />
            ))}
          </Stack>

          <TextField
            autoFocus
            label="Amount (₹)"
            type="number"
            fullWidth
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            error={Boolean(addError)}
            helperText={addError || ""}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "14px",
                "&.Mui-focused fieldset": { borderColor: "#6366f1" },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setAddMoneyOpen(false)} sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}>
            Cancel
          </Button>
          <Button
            onClick={() => handleAddMoney()}
            variant="contained"
            disabled={addSaving}
            sx={{
              background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "10px",
              px: 3,
              py: 1,
            }}
          >
            {addSaving ? "Processing..." : "Pay via Razorpay"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* B. CHANGE PASSWORD DIALOG */}
      <Dialog
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "20px", p: 1.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.25rem", pb: 0.5 }}>
          Change Password
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mb: 2 }}>
            Enter your new password to secure your account.
          </Typography>

          {passwordMsg && (
            <Alert severity={passwordMsg.includes("success") ? "success" : "info"} sx={{ mb: 2, borderRadius: "10px" }}>
              {passwordMsg}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="New Password"
              type="password"
              fullWidth
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <TextField
              label="Confirm New Password"
              type="password"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setPasswordOpen(false)} sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!newPassword || newPassword !== confirmPassword) {
                setPasswordMsg("Passwords do not match or cannot be empty.");
                return;
              }
              setPasswordMsg("Password updated successfully!");
              setTimeout(() => setPasswordOpen(false), 1200);
            }}
            variant="contained"
            sx={{
              backgroundColor: "#7c3aed",
              "&:hover": { backgroundColor: "#6d28d9" },
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "10px",
              px: 3,
              py: 1,
            }}
          >
            Update Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* C. NOTIFICATION SETTINGS DIALOG */}
      <Dialog
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "20px", p: 1.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.25rem", pb: 0.5 }}>
          Notification Settings
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mb: 2 }}>
            Customize the alerts you receive on your account.
          </Typography>

          <Stack spacing={1.8}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, bgcolor: "#f8fafc", borderRadius: "12px" }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>
                  Order Updates
                </Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>
                  Status changes for preparation & delivery
                </Typography>
              </Box>
              <Switch checked={notifOrder} onChange={(e) => setNotifOrder(e.target.checked)} color="primary" />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, bgcolor: "#f8fafc", borderRadius: "12px" }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>
                  Wallet & Payments
                </Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>
                  Top-up and debit notifications
                </Typography>
              </Box>
              <Switch checked={notifWallet} onChange={(e) => setNotifWallet(e.target.checked)} color="primary" />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, bgcolor: "#f8fafc", borderRadius: "12px" }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>
                  Promotions & Deals
                </Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>
                  Daily specials and meal discounts
                </Typography>
              </Box>
              <Switch checked={notifPromo} onChange={(e) => setNotifPromo(e.target.checked)} color="primary" />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setNotifOpen(false)} variant="contained" sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px", px: 3.5, py: 0.9 }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
