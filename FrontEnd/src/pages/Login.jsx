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
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(CartContext);
  const { showToast } = useToast();

  async function handleLogin() {
    // setLoading(true);
    try {
      const res = await post("/users/login", { username, password });
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
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "#f4f6f8",
        p: 2,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: 4,
          borderRadius: 3,
        }}
      >
        <Typography variant="h4" fontWeight={600} textAlign="center" mb={2}>
          Login
        </Typography>

        <TextField
          label="Username or Email"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label="Password"
          fullWidth
          margin="normal"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 3, py: 1.3, fontSize: 16, borderRadius: 2 }}
          onClick={handleLogin}
        >
          Login
        </Button>

        <Box textAlign="center" mt={2}>
          <Link
            to="/"
            style={{
              textDecoration: "none",
              fontSize: 14,
              color: "#1976d2",
            }}
          >
            Don’t have an account? Register
          </Link>
        </Box>
      </Paper>
    </Box>
  );
}
