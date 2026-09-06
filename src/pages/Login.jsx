import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { post } from "../utils/api";
import { CartContext } from "../context/CartContext";
import { useSnackbar } from "../hooks/useSnackbar";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

export default function Login() {
  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(CartContext);
  const { enqueueSnackbar } = useSnackbar();

  async function handleLogin(e) {
    if (e) e.preventDefault();
    if (!credential.trim()) {
      enqueueSnackbar("Please enter your roll number or email", { variant: "error" });
      return;
    }
    if (!password) {
      enqueueSnackbar("Please enter your password", { variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await post("/users/login", {
        rollNo: credential.trim(),
        email: credential.trim(),
        username: credential.trim(),
        password,
      });

      if (res?.success && res?.data?.user) {
        const user = res.data.user;
        login(user);
        enqueueSnackbar(`Welcome back, ${user.username}!`, { variant: "success" });
        const role = String(user.role || "").toLowerCase();
        if (role === "admin" || role === "staff") {
          navigate("/admin/menu");
        } else {
          navigate("/student/menu");
        }
      } else {
        const errorMsg = res?.message || "Login failed. Please check your credentials.";
        enqueueSnackbar(errorMsg, { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar("Login failed. Please try again.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

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
            {/* Golden Circle Dot */}
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#F6B867",
                mb: 4,
                boxShadow: "0 4px 14px rgba(246, 184, 103, 0.35)",
              }}
            />

            {/* Serif Title */}
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
              DBIT canteen
            </Typography>

            {/* Subtitle */}
            <Typography
              sx={{
                fontSize: "15px",
                color: "#D89987",
                lineHeight: 1.55,
                fontWeight: 400,
                maxWidth: "320px",
              }}
            >
              Order ahead, skip the line. Ready between classes.
            </Typography>
          </Box>

        
        </Box>

        {/* Right Dark Form Panel */}
        <Box
          component="form"
          onSubmit={handleLogin}
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
            Welcome back
          </Typography>
          <Typography
            sx={{
              color: "#888C95",
              fontSize: "14px",
              mb: 3.5,
              fontWeight: 400,
            }}
          >
            Sign in with your roll number to order.
          </Typography>

          {/* Roll Number or Email */}
          <Box sx={{ mb: 2.2 }}>
            <Typography
              component="label"
              htmlFor="login-credential"
              sx={{
                display: "block",
                color: "#D0D2D7",
                fontSize: "13.5px",
                fontWeight: 500,
                mb: 1,
              }}
            >
              Roll number or email
            </Typography>
            <input
              id="login-credential"
              type="text"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder="DBIT2024CS041"
              autoComplete="username"
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

          {/* Password */}
          <Box sx={{ mb: 1 }}>
            <Typography
              component="label"
              htmlFor="login-password"
              sx={{
                display: "block",
                color: "#D0D2D7",
                fontSize: "13.5px",
                fontWeight: 500,
                mb: 1,
              }}
            >
              Password
            </Typography>
            <Box sx={{ position: "relative" }}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
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

          {/* Forgot Password Link */}
          <Box sx={{ textAlign: "right", mb: 3 }}>
            <Link
              to="/forgot-password"
              style={{
                color: "#5B8DF6",
                fontSize: "13.5px",
                fontWeight: 500,
                textDecoration: "none",
              }}
              onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
            >
              Forgot password?
            </Link>
          </Box>

          {/* Sign in Button */}
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
              marginBottom: "20px",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = "#B83E1F";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = "#C84A2A";
            }}
          >
            {loading ? <CircularProgress size={20} sx={{ color: "#FFFFFF" }} /> : "Sign in"}
          </button>

          {/* Register Link */}
          <Typography
            sx={{
              textAlign: "center",
              color: "#B2B5BC",
              fontSize: "14px",
            }}
          >
            New here?{" "}
            <Link
              to="/register"
              style={{
                color: "#5B8DF6",
                fontWeight: 500,
                textDecoration: "underline",
              }}
            >
              Register with your roll number
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
