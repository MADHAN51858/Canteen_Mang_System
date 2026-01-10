// Register.jsx
import { useState, useContext } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { post } from "../utils/api";
import { CartContext } from "../context/CartContext";
import { useToast } from "../hooks/useToast";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  Stack,
  Container,
  Divider,
  InputAdornment,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    rollNo: "",
    phoneNo: "",
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(CartContext);
  const { showToast } = useToast();

  async function handleRegister() {
    setLoading(true);
    try {
      const { role, ...payload } = form;
      const res = await post("/users/register", payload);

      if (res.success) {
        const userData = res.data || {};
        showToast("Registered successfully!", "success");
        // store user so headers know which one to render
        login(userData);
        const role = String(userData.role || "student").toLowerCase();
        const target = role === "admin" ? "/admin/menu" : "/student/menu";
        navigate(target);
      } else {
        // Extract clean error message from response
        const errorMsg = res.message || "Registration failed. Please try again.";
        showToast(errorMsg, "error");
      }
    } catch (e) {
      showToast("Registration failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (key, val) => setForm({ ...form, [key]: val });

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        p: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography variant="h4" fontWeight={800} sx={{ color: "primary.main", mb: 1 }}>
              Join DBIT Canteen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your account to order delicious food
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Stack spacing={2.5}>
            {/* Username */}
            <TextField
              label="Username"
              value={form.username}
              onChange={(e) => handleChange("username", e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon fontSize="small" sx={{ color: "primary.main", mr: 0.5 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  transition: "all 0.3s",
                  "&:focus-within": {
                    boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.light}33`,
                  },
                },
              }}
            />

            {/* Email */}
            <TextField
              label="Email Address"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon fontSize="small" sx={{ color: "primary.main", mr: 0.5 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "&:focus-within": {
                    boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.light}33`,
                  },
                },
              }}
            />

            {/* Password */}
            <TextField
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" sx={{ color: "primary.main", mr: 0.5 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "&:focus-within": {
                    boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.light}33`,
                  },
                },
              }}
            />

            <Divider sx={{ my: 1 }} />

            {/* Roll No */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Roll No / ID"
                value={form.rollNo}
                onChange={(e) => handleChange("rollNo", e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon fontSize="small" sx={{ color: "primary.main", mr: 0.5 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />
            </Stack>

            {/* Phone */}
            <TextField
              label="Phone Number"
              value={form.phoneNo}
              onChange={(e) => handleChange("phoneNo", e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon fontSize="small" sx={{ color: "primary.main", mr: 0.5 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            />

            {/* Register Button */}
            <Button
              variant="contained"
              size="large"
              onClick={handleRegister}
              disabled={loading}
              fullWidth
              sx={{
                py: 1.3,
                fontSize: "1rem",
                fontWeight: 700,
                borderRadius: 2,
                textTransform: "none",
                transition: "all 0.3s",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: (theme) => `0 8px 16px ${theme.palette.primary.main}33`,
                },
              }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>

            {/* Login Link */}
            <Typography variant="body2" textAlign="center" sx={{ mt: 2 }}>
              Already have an account?{" "}
              <Link
                component={RouterLink}
                to="/login"
                underline="none"
                sx={{
                  fontWeight: 700,
                  color: "primary.main",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                Login Here
              </Link>
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
