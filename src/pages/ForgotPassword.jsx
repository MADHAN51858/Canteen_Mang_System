import { useState, useEffect, useContext } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { forgotPassword, resetPassword } from "../utils/api";
import { useSnackbar } from "../hooks/useSnackbar";
import { CartContext } from "../context/CartContext";

import {
  Box,
  TextField,
  Typography,
  Button,
  Paper,
  InputAdornment,
  Container,
  IconButton,
  CircularProgress,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import PinIcon from "@mui/icons-material/Pin";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();
  const { login } = useContext(CartContext);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const otpParam = searchParams.get("otp");

    if (emailParam) {
      setEmail(emailParam);
    }
    if (otpParam) {
      setOtp(otpParam);
    }
    if (emailParam && otpParam) {
      setStep(2);
      enqueueSnackbar("Verification code verified from link. Enter your new password.", { variant: "info" });
    }
  }, [searchParams]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      enqueueSnackbar("Please enter your registered email or username", { variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      if (res?.success) {
        enqueueSnackbar(res.message || "Verification code sent to your email!", { variant: "success" });
        if (res.data?.email) {
          setEmail(res.data.email);
        }
        setStep(2);
        setResendCooldown(60);
      } else {
        enqueueSnackbar(res?.message || "Failed to send reset code", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar("Network error. Please try again.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!otp.trim()) {
      enqueueSnackbar("Please enter the 6-digit verification code", { variant: "error" });
      return;
    }
    if (!newPassword) {
      enqueueSnackbar("Please enter a new password", { variant: "error" });
      return;
    }
    if (newPassword.length < 6) {
      enqueueSnackbar("Password must be at least 6 characters long", { variant: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      enqueueSnackbar("Passwords do not match", { variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(email.trim(), otp.trim(), newPassword);
      if (res?.success && res?.data?.user) {
        const user = res.data.user;
        login(user);
        enqueueSnackbar("Password reset successfully! Logged in.", { variant: "success" });
        const rollValue = String(user.role || "").toLowerCase();
        if (rollValue === "admin" || rollValue === "staff") {
          navigate("/admin/menu");
        } else {
          navigate("/student/menu");
        }
      } else {
        enqueueSnackbar(res?.message || "Failed to reset password. Check your code.", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar("Failed to reset password. Please try again.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: { xs: 4, md: 0 },
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={1}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 2,
            background: "#ffffff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{
                mb: 1,
                color: "#1a1a1a",
              }}
            >
              {step === 1 ? "Forgot Password" : "Reset Password"}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#666666",
              }}
            >
              {step === 1
                ? "Enter your registered email or username to receive a verification code"
                : `Enter the verification code sent to ${email}`}
            </Typography>
          </Box>

          {/* STEP 1: Enter Email / Username */}
          {step === 1 ? (
            <Box component="form" onSubmit={handleSendOtp}>
              <TextField
                label="Email or Username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                autoComplete="email"
                placeholder="Enter email or username"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: "#999999", mr: 0.5, fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    background: "#fafafa",
                    borderRadius: 1,
                    "& fieldset": { borderColor: "#e0e0e0" },
                    "&:hover fieldset": { borderColor: "#cccccc" },
                    "&.Mui-focused fieldset": { borderColor: "#1976d2" },
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{
                  py: 1.2,
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  borderRadius: 1,
                  textTransform: "none",
                  background: "#1976d2",
                  "&:hover": { background: "#1565c0" },
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Send Verification Code"}
              </Button>
            </Box>
          ) : (
            /* STEP 2: Enter OTP and New Password */
            <Box component="form" onSubmit={handleResetPassword}>
              <TextField
                label="6-Digit Verification Code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                placeholder="e.g. 123456"
                inputProps={{ maxLength: 6 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PinIcon sx={{ color: "#999999", mr: 0.5, fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    background: "#fafafa",
                    borderRadius: 1,
                    "& fieldset": { borderColor: "#e0e0e0" },
                    "&:hover fieldset": { borderColor: "#cccccc" },
                    "&.Mui-focused fieldset": { borderColor: "#1976d2" },
                  },
                }}
              />

              <TextField
                label="New Password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                autoComplete="new-password"
                placeholder="Minimum 6 characters"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: "#999999", mr: 0.5, fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: "#999999" }}
                      >
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    background: "#fafafa",
                    borderRadius: 1,
                    "& fieldset": { borderColor: "#e0e0e0" },
                    "&:hover fieldset": { borderColor: "#cccccc" },
                    "&.Mui-focused fieldset": { borderColor: "#1976d2" },
                  },
                }}
              />

              <TextField
                label="Confirm New Password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                autoComplete="new-password"
                placeholder="Re-enter new password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: "#999999", mr: 0.5, fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 2.5,
                  "& .MuiOutlinedInput-root": {
                    background: "#fafafa",
                    borderRadius: 1,
                    "& fieldset": { borderColor: "#e0e0e0" },
                    "&:hover fieldset": { borderColor: "#cccccc" },
                    "&.Mui-focused fieldset": { borderColor: "#1976d2" },
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{
                  py: 1.2,
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  borderRadius: 1,
                  textTransform: "none",
                  background: "#1976d2",
                  "&:hover": { background: "#1565c0" },
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Reset Password"}
              </Button>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                <Button
                  size="small"
                  onClick={() => setStep(1)}
                  sx={{ textTransform: "none", color: "#666" }}
                >
                  Change Email
                </Button>
                <Button
                  size="small"
                  disabled={resendCooldown > 0 || loading}
                  onClick={() => handleSendOtp()}
                  sx={{ textTransform: "none", color: "#1976d2", fontWeight: 600 }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </Button>
              </Box>
            </Box>
          )}

          {/* Back to Login Link */}
          <Box sx={{ textAlign: "center", mt: 3, pt: 2, borderTop: "1px solid #f0f0f0" }}>
            <Link
              to="/login"
              style={{
                textDecoration: "none",
                color: "#1976d2",
                fontWeight: 600,
                fontSize: "0.9rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ArrowBackIcon fontSize="small" /> Back to Sign In
            </Link>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
