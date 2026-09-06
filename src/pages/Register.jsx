import { useState, useContext, useRef } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { post, postForm } from "../utils/api";
import { CartContext } from "../context/CartContext";
import { useSnackbar } from "../hooks/useSnackbar";
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
  Grid,
  useTheme,
  useMediaQuery,
  IconButton,
  Avatar,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    rollNo: "",
    phoneNo: "",
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(CartContext);
  const { enqueueSnackbar } = useSnackbar();

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      enqueueSnackbar("Please select a valid image file", { variant: "error" });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    enqueueSnackbar("Avatar selected!", { variant: "info" });
  };

  async function handleRegister() {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", form.username.trim());
      formData.append("password", form.password);
      formData.append("rollNo", form.rollNo.trim());
      if (form.email && form.email.trim()) {
        formData.append("email", form.email.trim());
      }
      if (form.phoneNo && String(form.phoneNo).trim()) {
        formData.append("phoneNo", String(form.phoneNo).trim());
      }
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await postForm("/users/register", formData);

      if (res.success) {
        const userData = res.data || {};
        enqueueSnackbar("Registered successfully with profile photo!", { variant: "success" });
        login(userData);
        const role = String(userData.role || "student").toLowerCase();
        const target = role === "admin" ? "/admin/menu" : "/student/menu";
        navigate(target);
      } else {
        const errorMsg = res.message || "Registration failed. Please try again.";
        enqueueSnackbar(errorMsg, { variant: "error" });
      }
    } catch (e) {
      enqueueSnackbar("Registration failed. Please try again.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (key, val) => setForm({ ...form, [key]: val });

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
      <Container maxWidth="sm">
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
              Create Account
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#666666",
              }}
            >
              Join DBIT Canteen to start ordering
            </Typography>
          </Box>

          <FormContent
            form={form}
            loading={loading}
            avatarPreview={avatarPreview}
            handleAvatarSelect={handleAvatarSelect}
            handleChange={handleChange}
            handleRegister={handleRegister}
          />
        </Paper>
      </Container>
    </Box>
  );
}

function FormContent({ form, loading, avatarPreview, handleAvatarSelect, handleChange, handleRegister }) {
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef(null);

  return (
    <>
      {/* Profile Photo Upload */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
        <Box sx={{ position: "relative" }}>
          <Avatar
            src={avatarPreview}
            sx={{
              width: 86,
              height: 86,
              bgcolor: "#1976d2",
              fontSize: 34,
              fontWeight: 700,
              border: "3px solid #e0e0e0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            }}
          >
            {form.username ? form.username[0].toUpperCase() : <PersonIcon sx={{ fontSize: 48 }} />}
          </Avatar>
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            sx={{
              position: "absolute",
              bottom: -4,
              right: -4,
              bgcolor: "#1976d2",
              color: "white",
              p: 0.8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              "&:hover": { bgcolor: "#1565c0" },
            }}
            size="small"
            title="Upload Profile Photo"
          >
            <PhotoCameraIcon sx={{ fontSize: 17 }} />
          </IconButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleAvatarSelect}
          />
        </Box>
        <Typography variant="caption" sx={{ color: "#666666", mt: 1, fontWeight: 500 }}>
          {avatarPreview ? "Photo selected (ready to upload)" : "Add Profile Photo (Optional)"}
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
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon sx={{ color: "#999999", mr: 0.5, fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
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
                 {/* Roll No */}
        <TextField
          label="Roll No"
          value={form.rollNo}
          onChange={(e) => handleChange("rollNo", e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <BadgeIcon sx={{ color: "#999999", mr: 0.5, fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
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

        {/* Email */}
        <TextField
          label="Email (Optional)"
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon sx={{ color: "#999999", mr: 0.5, fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
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
   

        {/* Phone */}
        <TextField
          label="Phone (Optional)"
          value={form.phoneNo}
          onChange={(e) => handleChange("phoneNo", e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PhoneIcon sx={{ color: "#999999", mr: 0.5, fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
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
          type={showPassword ? "text" : "password"}
          value={form.password}
          onChange={(e) => handleChange("password", e.target.value)}
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

    

        {/* Register Button */}
        <Button
          variant="contained"
          size="medium"
          onClick={handleRegister}
          disabled={loading}
          fullWidth
          sx={{
            py: 1.2,
            fontSize: "0.95rem",
            fontWeight: 600,
            borderRadius: 1,
            textTransform: "none",
            transition: "all 0.2s",
            marginTop: 1,
            background: "#1976d2",
            "&:hover:not(:disabled)": {
              background: "#1565c0",
            },
            "&:disabled": {
              background: "#cccccc",
            },
          }}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </Button>

        {/* Login Link */}
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "#666666" }}>
            Already have an account?{" "}
            <Link
              component={RouterLink}
              to="/login"
              underline="none"
              sx={{
                color: "#1976d2",
                fontWeight: 600,
                transition: "all 0.2s",
                "&:hover": {
                  color: "#1565c0",
                },
              }}
            >
              Sign in
            </Link>
          </Typography>
        </Box>
      </Stack>
    </>
  );
}
