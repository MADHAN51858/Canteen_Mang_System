import { useState, useEffect, useContext } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { forgotPassword, resetPassword } from "../utils/api";
import { useSnackbar } from "../hooks/useSnackbar";
import { CartContext } from "../context/CartContext";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1); // 1: Target Input, 2: OTP & New Password
  const [method, setMethod] = useState("email"); // "email" | "phone"
  const [email, setEmail] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [maskedTarget, setMaskedTarget] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();
  const { login } = useContext(CartContext);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const phoneParam = searchParams.get("phone") || searchParams.get("phoneNo");
    const otpParam = searchParams.get("otp");

    if (emailParam) {
      setEmail(emailParam);
      setMethod("email");
    } else if (phoneParam) {
      setPhoneNo(phoneParam);
      setMethod("phone");
    }

    if (otpParam) {
      setOtp(otpParam);
    }
    if ((emailParam || phoneParam) && otpParam) {
      setStep(2);
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
    setErrorMessage("");

    if (method === "email") {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        enqueueSnackbar("Please enter your registered email address", { variant: "error" });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        enqueueSnackbar("Please enter a valid email address", { variant: "error" });
        return;
      }

      setLoading(true);
      try {
        const res = await forgotPassword({ email: cleanEmail });
        if (res?.success) {
          enqueueSnackbar(res.message || "Verification code sent to your email!", { variant: "success" });
          if (res.data?.email) setEmail(res.data.email);
          if (res.data?.maskedTarget) setMaskedTarget(res.data.maskedTarget);
          setStep(2);
          setResendCooldown(60);
        } else {
          const msg = res?.message || "Failed to send reset code";
          setErrorMessage(msg);
          enqueueSnackbar(msg, { variant: "error" });
        }
      } catch (err) {
        const msg = "Network error. Please try again.";
        setErrorMessage(msg);
        enqueueSnackbar(msg, { variant: "error" });
      } finally {
        setLoading(false);
      }
    } else {
      // Phone SMS
      const cleanPhone = phoneNo.replace(/\D/g, "");
      if (!cleanPhone) {
        enqueueSnackbar("Please enter your registered mobile number", { variant: "error" });
        return;
      }
      if (cleanPhone.length < 10) {
        enqueueSnackbar("Please enter a valid 10-digit mobile number", { variant: "error" });
        return;
      }

      setLoading(true);
      try {
        const res = await forgotPassword({ phoneNo: cleanPhone });
        if (res?.success) {
          enqueueSnackbar(res.message || "SMS verification code sent to your mobile!", { variant: "success" });
          if (res.data?.phoneNo) setPhoneNo(String(res.data.phoneNo));
          if (res.data?.maskedTarget) setMaskedTarget(res.data.maskedTarget);
          setStep(2);
          setResendCooldown(60);
        } else {
          const msg = res?.message || "Failed to send SMS verification code";
          setErrorMessage(msg);
          enqueueSnackbar(msg, { variant: "error" });
        }
      } catch (err) {
        const msg = "Network error. Please try again.";
        setErrorMessage(msg);
        enqueueSnackbar(msg, { variant: "error" });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    const targetPayload = {};
    if (method === "phone") {
      const cleanPhone = phoneNo.replace(/\D/g, "");
      if (!cleanPhone) {
        enqueueSnackbar("Please enter your mobile number", { variant: "error" });
        setStep(1);
        return;
      }
      targetPayload.phoneNo = cleanPhone;
    } else {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        enqueueSnackbar("Please enter your registered email address", { variant: "error" });
        setStep(1);
        return;
      }
      targetPayload.email = cleanEmail;
    }

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

    setLoading(true);
    try {
      const res = await resetPassword(targetPayload, otp.trim(), newPassword);
      if (res?.success) {
        enqueueSnackbar("Password reset successfully! Logging you in...", { variant: "success" });
        if (res.data?.user) {
          login(res.data.user);
          const role = String(res.data.user.role || "").toLowerCase();
          if (role === "admin" || role === "staff") {
            navigate("/admin/menu");
          } else {
            navigate("/student/menu");
          }
        } else {
          navigate("/login");
        }
      } else {
        const msg = res?.message || "Password reset failed";
        setErrorMessage(msg);
        enqueueSnackbar(msg, { variant: "error" });
      }
    } catch (err) {
      const msg = "Password reset failed. Please try again.";
      setErrorMessage(msg);
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const targetDisplay =
    maskedTarget ||
    (method === "phone"
      ? (phoneNo ? `+91 ${phoneNo}` : "your mobile")
      : (email || "your registered email"));

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#0E0F11",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, sm: 3 },
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Split Card Container */}
      <Box
        sx={{
          width: "100%",
          maxWidth: "880px",
          minHeight: "540px",
          borderRadius: "22px",
          overflow: "hidden",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.75)",
          border: "1px solid rgba(255, 255, 255, 0.07)",
        }}
      >
        {/* Left Warm Terracotta Panel */}
        <Box
          sx={{
            width: { xs: "100%", md: "46%" },
            background: "#381912",
            p: { xs: 4, sm: 5 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          {/* Top Section */}
          <Box>
            <Typography
              component="h1"
              sx={{
                fontFamily: "'Newsreader', 'Georgia', serif",
                fontSize: { xs: "32px", sm: "38px" },
                fontWeight: 700,
                color: "#FFFFFF",
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
                mb: 2,
              }}
            >
              Forgot your password?
            </Typography>

            <Typography
              sx={{
                fontSize: "15px",
                color: "#D89987",
                lineHeight: 1.55,
                fontWeight: 400,
                maxWidth: "320px",
              }}
            >
              We'll get you back to ordering in a minute.
            </Typography>
          </Box>

          {/* Bottom Security Note */}
          <Box
            sx={{
              mt: { xs: 5, md: 8 },
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "12px",
              p: { xs: 2, sm: 2.2 },
              backdropFilter: "blur(6px)",
            }}
          >
            <Typography
              sx={{
                color: "#F0D3CB",
                fontSize: "14px",
                fontWeight: 500,
                lineHeight: 1.45,
              }}
            >
              {method === "email"
                ? "We'll send a 6-digit verification code to your registered email"
                : "We'll send a 6-digit SMS verification code to your mobile number"}
            </Typography>
          </Box>
        </Box>

        {/* Right Dark Form Panel */}
        <Box
          sx={{
            flex: 1,
            background: "#161719",
            p: { xs: 4, sm: 5 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* Header */}
          <Typography
            component="h2"
            sx={{
              fontFamily: "'Newsreader', 'Georgia', serif",
              fontSize: { xs: "30px", sm: "34px" },
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
              mb: 1,
            }}
          >
            Reset password
          </Typography>

          <Typography
            sx={{
              color: "#888C95",
              fontSize: "14px",
              mb: 3,
              fontWeight: 400,
            }}
          >
            {step === 1
              ? (method === "email"
                  ? "Enter your registered email to get a verification code."
                  : "Enter your registered mobile number to get an SMS code.")
              : (method === "email"
                  ? `Enter the 6-digit code sent to ${targetDisplay}.`
                  : `Enter the 6-digit SMS code sent to ${targetDisplay}.`)}
          </Typography>

          {/* Inline Error Recovery Banner */}
          {errorMessage && (
            <Box
              sx={{
                background: "rgba(200, 74, 42, 0.12)",
                border: "1px solid rgba(200, 74, 42, 0.35)",
                borderRadius: "10px",
                p: 2,
                mb: 3,
                display: "flex",
                flexDirection: "column",
                gap: 1.2,
              }}
            >
              <Typography sx={{ color: "#F0A895", fontSize: "13px", lineHeight: 1.45 }}>
                {errorMessage}
              </Typography>
              {step === 2 && (
                <button
                  type="button"
                  disabled={loading || resendCooldown > 0}
                  onClick={handleSendOtp}
                  style={{
                    alignSelf: "flex-start",
                    background: resendCooldown > 0 ? "rgba(200, 74, 42, 0.4)" : "#C84A2A",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "6px",
                    padding: "7px 14px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: loading || resendCooldown > 0 ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : `⚡ Request New Code via ${method === "phone" ? "SMS" : "Email"}`}
                </button>
              )}
            </Box>
          )}

          {step === 1 ? (
            /* Step 1: Target Input Form */
            <form onSubmit={handleSendOtp}>
              {/* Method Selector Tabs: Email vs Phone SMS */}
              <Box
                sx={{
                  display: "flex",
                  background: "#1E2024",
                  p: "4px",
                  borderRadius: "12px",
                  mb: 3,
                  border: "1px solid #2B2E34",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMethod("email");
                    setErrorMessage("");
                  }}
                  style={{
                    flex: 1,
                    background: method === "email" ? "#C84A2A" : "transparent",
                    color: method === "email" ? "#FFFFFF" : "#888C95",
                    border: "none",
                    borderRadius: "9px",
                    padding: "10px 14px",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    transition: "all 0.2s ease",
                    fontFamily: "inherit",
                  }}
                >
                  <MailOutlineIcon sx={{ fontSize: 17 }} /> Email
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMethod("phone");
                    setErrorMessage("");
                  }}
                  style={{
                    flex: 1,
                    background: method === "phone" ? "#C84A2A" : "transparent",
                    color: method === "phone" ? "#FFFFFF" : "#888C95",
                    border: "none",
                    borderRadius: "9px",
                    padding: "10px 14px",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    transition: "all 0.2s ease",
                    fontFamily: "inherit",
                  }}
                >
                  <PhoneIphoneIcon sx={{ fontSize: 17 }} /> Mobile SMS
                </button>
              </Box>

              {method === "email" ? (
                /* Email Input */
                <Box sx={{ mb: 3 }}>
                  <Typography
                    component="label"
                    htmlFor="forgot-email"
                    sx={{
                      display: "block",
                      color: "#D0D2D7",
                      fontSize: "13.5px",
                      fontWeight: 500,
                      mb: 1,
                    }}
                  >
                    Email address
                  </Typography>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@dbit.in"
                    required
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#1E2024",
                      border: "1px solid #2B2E34",
                      borderRadius: "10px",
                      padding: "13px 16px",
                      color: "#FFFFFF",
                      fontSize: "15px",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                      fontFamily: "inherit",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#C84A2A";
                      e.target.style.boxShadow = "0 0 0 2px rgba(200, 74, 42, 0.25)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#2B2E34";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </Box>
              ) : (
                /* Phone Number Input */
                <Box sx={{ mb: 3 }}>
                  <Typography
                    component="label"
                    htmlFor="forgot-phone"
                    sx={{
                      display: "block",
                      color: "#D0D2D7",
                      fontSize: "13.5px",
                      fontWeight: 500,
                      mb: 1,
                    }}
                  >
                    Mobile number
                  </Typography>
                  <Box sx={{ display: "flex", gap: "8px" }}>
                    <Box
                      sx={{
                        background: "#1E2024",
                        border: "1px solid #2B2E34",
                        borderRadius: "10px",
                        px: 2,
                        display: "flex",
                        alignItems: "center",
                        color: "#D0D2D7",
                        fontSize: "14px",
                        fontWeight: 600,
                      }}
                    >
                      +91
                    </Box>
                    <input
                      id="forgot-phone"
                      type="tel"
                      maxLength={10}
                      value={phoneNo}
                      onChange={(e) => setPhoneNo(e.target.value.replace(/\D/g, ""))}
                      placeholder="9876543210"
                      required
                      style={{
                        flex: 1,
                        boxSizing: "border-box",
                        background: "#1E2024",
                        border: "1px solid #2B2E34",
                        borderRadius: "10px",
                        padding: "13px 16px",
                        color: "#FFFFFF",
                        fontSize: "15px",
                        outline: "none",
                        transition: "border-color 0.2s, box-shadow 0.2s",
                        fontFamily: "inherit",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#C84A2A";
                        e.target.style.boxShadow = "0 0 0 2px rgba(200, 74, 42, 0.25)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#2B2E34";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </Box>
                </Box>
              )}

              {/* Send Code Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  background: loading ? "#963B23" : "#C84A2A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "10px",
                  padding: "14px 20px",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.2s, transform 0.1s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontFamily: "inherit",
                  marginBottom: "24px",
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = "#B83E1F";
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.background = "#C84A2A";
                }}
              >
                {loading ? (
                  <CircularProgress size={20} sx={{ color: "#FFFFFF" }} />
                ) : method === "phone" ? (
                  "Send SMS verification code"
                ) : (
                  "Send verification code"
                )}
              </button>

              {/* Back to sign in */}
              <Box sx={{ textAlign: "center" }}>
                <Link
                  to="/login"
                  style={{
                    color: "#5B8DF6",
                    fontSize: "14px",
                    fontWeight: 500,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
                  onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
                >
                  <ArrowBackIcon sx={{ fontSize: 16 }} /> Back to sign in
                </Link>
              </Box>
            </form>
          ) : (
            /* Step 2: Verification Code & New Password */
            <form onSubmit={handleResetPassword}>
              {method === "email" && !email && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    component="label"
                    htmlFor="forgot-email-step2"
                    sx={{
                      display: "block",
                      color: "#D0D2D7",
                      fontSize: "13.5px",
                      fontWeight: 500,
                      mb: 0.8,
                    }}
                  >
                    Email address
                  </Typography>
                  <input
                    id="forgot-email-step2"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@dbit.in"
                    required
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#1E2024",
                      border: "1px solid #2B2E34",
                      borderRadius: "10px",
                      padding: "13px 16px",
                      color: "#FFFFFF",
                      fontSize: "15px",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                </Box>
              )}

              {method === "phone" && !phoneNo && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    component="label"
                    htmlFor="forgot-phone-step2"
                    sx={{
                      display: "block",
                      color: "#D0D2D7",
                      fontSize: "13.5px",
                      fontWeight: 500,
                      mb: 0.8,
                    }}
                  >
                    Mobile number
                  </Typography>
                  <Box sx={{ display: "flex", gap: "8px" }}>
                    <Box
                      sx={{
                        background: "#1E2024",
                        border: "1px solid #2B2E34",
                        borderRadius: "10px",
                        px: 2,
                        display: "flex",
                        alignItems: "center",
                        color: "#D0D2D7",
                        fontSize: "14px",
                        fontWeight: 600,
                      }}
                    >
                      +91
                    </Box>
                    <input
                      id="forgot-phone-step2"
                      type="tel"
                      maxLength={10}
                      value={phoneNo}
                      onChange={(e) => setPhoneNo(e.target.value.replace(/\D/g, ""))}
                      placeholder="9876543210"
                      required
                      style={{
                        flex: 1,
                        boxSizing: "border-box",
                        background: "#1E2024",
                        border: "1px solid #2B2E34",
                        borderRadius: "10px",
                        padding: "13px 16px",
                        color: "#FFFFFF",
                        fontSize: "15px",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                  </Box>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography
                  component="label"
                  htmlFor="forgot-otp"
                  sx={{
                    display: "block",
                    color: "#D0D2D7",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    mb: 0.8,
                  }}
                >
                  Verification code
                </Typography>
                <input
                  id="forgot-otp"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#1E2024",
                    border: "1px solid #2B2E34",
                    borderRadius: "10px",
                    padding: "13px 16px",
                    color: "#FFFFFF",
                    fontSize: "18px",
                    letterSpacing: "4px",
                    fontWeight: 600,
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#C84A2A";
                    e.target.style.boxShadow = "0 0 0 2px rgba(200, 74, 42, 0.25)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#2B2E34";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography
                  component="label"
                  htmlFor="forgot-newpass"
                  sx={{
                    display: "block",
                    color: "#D0D2D7",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    mb: 0.8,
                  }}
                >
                  New password
                </Typography>
                <Box sx={{ position: "relative" }}>
                  <input
                    id="forgot-newpass"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a new password"
                    required
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#1E2024",
                      border: "1px solid #2B2E34",
                      borderRadius: "10px",
                      padding: "13px 44px 13px 16px",
                      color: "#FFFFFF",
                      fontSize: "15px",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                      fontFamily: "inherit",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#C84A2A";
                      e.target.style.boxShadow = "0 0 0 2px rgba(200, 74, 42, 0.25)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#2B2E34";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <IconButton
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    sx={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#727680",
                      "&:hover": { color: "#D0D2D7" },
                    }}
                    size="small"
                  >
                    {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </Box>
              </Box>

              {/* Reset Password Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  background: loading ? "#963B23" : "#C84A2A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "10px",
                  padding: "14px 20px",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.2s, transform 0.1s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontFamily: "inherit",
                  marginBottom: "16px",
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = "#B83E1F";
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.background = "#C84A2A";
                }}
              >
                {loading ? <CircularProgress size={20} sx={{ color: "#FFFFFF" }} /> : "Reset password & sign in"}
              </button>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#888C95",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "inherit",
                  }}
                >
                  ← Change {method === "phone" ? "mobile number" : "email"}
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={handleSendOtp}
                  style={{
                    background: "none",
                    border: "none",
                    color: resendCooldown > 0 ? "#555860" : "#5B8DF6",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    cursor: resendCooldown > 0 ? "default" : "pointer",
                    padding: 0,
                    fontFamily: "inherit",
                  }}
                >
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
                </button>
              </Box>

              <Box sx={{ textAlign: "center", mt: 3 }}>
                <Link
                  to="/login"
                  style={{
                    color: "#5B8DF6",
                    fontSize: "14px",
                    fontWeight: 500,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
                  onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
                >
                  <ArrowBackIcon sx={{ fontSize: 16 }} /> Back to sign in
                </Link>
              </Box>
            </form>
          )}
        </Box>
      </Box>
    </Box>
  );
}
