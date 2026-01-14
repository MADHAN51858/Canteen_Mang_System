import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { post } from "../utils/api";
import { CartContext } from "../context/CartContext";
import { useToast } from "../hooks/useToast";

import {
  Box,
  TextField,
  Typography,
  Button,
  Paper,
  InputAdornment,
  Container,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";

export default function Login() {
  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(CartContext);
  const { showToast } = useToast();

  async function handleLogin() {
    // setLoading(true);
    try {
      // Send credential as both username and email; backend will check with $or
      const res = await post("/users/login", { 
        username: credential, 
        email: credential, 
        password 
      });
      console.log("Login response:", res);
      if (res?.success && res?.data?.user) {
        const user = res.data.user;
        console.log("User logged in:", user);
        login(user);
        const rollValue = String(user.role || "").toLowerCase();
        console.log("User role:", rollValue);
        if (rollValue === "admin" || rollValue === "staff") {
          navigate("/admin/menu");
        } else {
          navigate("/student/menu");
        }
      } else {
        const errorMsg = res.message || "Login failed";
        showToast(errorMsg, "error");
        console.error("Login failed:", res);
      }
    } catch (e) {
      console.error("Login error:", e);
      showToast("Login failed. Please try again.", "error");
    } finally {
      // setLoading(false);
    }
  }

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
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                mb: 1,
                color: "#1a1a1a",
              }}
            >
              Sign In
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#666666",
              }}
            >
              Login to DBIT Canteen
            </Typography>
          </Box>

          {/* Username or Email */}
          <TextField
            label="Username or Email"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            autoComplete="off"
            placeholder="Enter your username or email"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon sx={{ color: "#999999", mr: 0.5, fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2.5,
              "& .MuiOutlinedInput-root": {
                background: "#fafafa",
                borderRadius: 1,
                "& fieldset": {
                  borderColor: "#e0e0e0",
                },
                "&:hover fieldset": {
                  borderColor: "#cccccc",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#1976d2",
                },
              },
              "& .MuiOutlinedInput-input": {
                color: "#1a1a1a",
                caretColor: "#1976d2",
              },
            }}
          />

          {/* Password */}
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            autoComplete="new-password"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ color: "#999999", mr: 0.5, fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": {
                background: "#fafafa",
                borderRadius: 1,
                "& fieldset": {
                  borderColor: "#e0e0e0",
                },
                "&:hover fieldset": {
                  borderColor: "#cccccc",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#1976d2",
                },
              },
              "& .MuiOutlinedInput-input": {
                color: "#1a1a1a",
                caretColor: "#1976d2",
              },
            }}
          />

          {/* Login Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleLogin}
            sx={{
              py: 1.2,
              fontSize: "0.95rem",
              fontWeight: 600,
              borderRadius: 1,
              textTransform: "none",
              transition: "all 0.2s",
              background: "#1976d2",
              "&:hover": {
                background: "#1565c0",
              },
              "&:disabled": {
                background: "#cccccc",
              },
            }}
          >
            Sign In
          </Button>

          {/* Register Link */}
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Typography variant="body2" sx={{ color: "#666666" }}>
              Don't have an account?{" "}
              <Link
                to="/"
                style={{
                  textDecoration: "none",
                  color: "#1976d2",
                  fontWeight: 600,
                }}
              >
                Register here
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
