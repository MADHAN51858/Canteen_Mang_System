import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { post } from "../utils/api";
import { CartContext } from "../context/CartContext";

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
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(CartContext);

  async function handleLogin() {
    // setLoading(true);
    setMsg("");
    try {
      const res = await post("/users/login", { username, password });
      if (res?.success && res?.data?.user) {
        const user = res.data.user;
        login(user);
        const rollValue = String(user.role || "").toLowerCase();
        if (rollValue.includes("admin")) navigate("/admin");
        else navigate("/student/menu");
      } else {
        setMsg(res.message || "Login failed");
      }
    } catch (e) {
      setMsg("Login failed. Please try again.");
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

        {msg && (
          <Typography color="error" fontSize={14} mt={1}>
            {msg}
          </Typography>
        )}

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
