import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { postForm } from "../utils/api";
import { CartContext } from "../context/CartContext";
import { useSnackbar } from "../hooks/useSnackbar";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Collapse,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";

export default function Register() {
  const [rollNo, setRollNo] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Optional fields
  const [showOptional, setShowOptional] = useState(false);
  const [email, setEmail] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
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
  };

  async function handleRegister(e) {
    if (e) e.preventDefault();

    if (!rollNo.trim()) {
      enqueueSnackbar("Please enter your roll number", { variant: "error" });
      return;
    }
    if (!fullName.trim()) {
      enqueueSnackbar("Please enter your full name", { variant: "error" });
      return;
    }
    if (!password) {
      enqueueSnackbar("Please enter a password", { variant: "error" });
      return;
    }
    if (password.length < 6) {
      enqueueSnackbar("Password must be at least 6 characters long", { variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("rollNo", rollNo.trim());
      formData.append("username", fullName.trim());
      formData.append("password", password);

      if (email && email.trim()) {
        formData.append("email", email.trim());
      }
      if (phoneNo && phoneNo.trim()) {
        formData.append("phoneNo", phoneNo.trim());
      }
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await postForm("/users/register", formData);

      if (res?.success) {
        const userData = res.data || {};
        enqueueSnackbar("Account created successfully!", { variant: "success" });
        login(userData);
        const role = String(userData.role || "student").toLowerCase();
        if (role === "admin" || role === "staff") {
          navigate("/admin/menu");
        } else {
          navigate("/student/menu");
        }
      } else {
        const errorMsg = res?.message || "Registration failed. Please try again.";
        enqueueSnackbar(errorMsg, { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar("Registration failed. Please try again.", { variant: "error" });
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
              Join DBIT canteen
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
              Set up your account with your roll number, order in seconds next time.
            </Typography>
          </Box>

     
        </Box>

        {/* Right Dark Form Panel */}
        <Box
          component="form"
          onSubmit={handleRegister}
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
            Create your account
          </Typography>
          <Typography
            sx={{
              color: "#888C95",
              fontSize: "14px",
              mb: 3,
              fontWeight: 400,
            }}
          >
            Roll number is all you need to get started.
          </Typography>

          {/* Roll Number */}
          <Box sx={{ mb: 2 }}>
            <Typography
              component="label"
              htmlFor="register-rollno"
              sx={{
                display: "block",
                color: "#D0D2D7",
                fontSize: "13.5px",
                fontWeight: 500,
                mb: 0.8,
              }}
            >
              Roll number
            </Typography>
            <input
              id="register-rollno"
              type="text"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              placeholder="DBIT2024CS041"
              autoComplete="off"
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

          {/* Full Name */}
          <Box sx={{ mb: 2 }}>
            <Typography
              component="label"
              htmlFor="register-fullname"
              sx={{
                display: "block",
                color: "#D0D2D7",
                fontSize: "13.5px",
                fontWeight: 500,
                mb: 0.8,
              }}
            >
              Full name
            </Typography>
            <input
              id="register-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Aditi Sharma"
              autoComplete="name"
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
          <Box sx={{ mb: 1.5 }}>
            <Typography
              component="label"
              htmlFor="register-password"
              sx={{
                display: "block",
                color: "#D0D2D7",
                fontSize: "13.5px",
                fontWeight: 500,
                mb: 0.8,
              }}
            >
              Password
            </Typography>
            <Box sx={{ position: "relative" }}>
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
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

          {/* + Add email or phone (optional) link */}
          <Box sx={{ mb: 2.5 }}>
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#5B8DF6",
                fontSize: "13.5px",
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              {showOptional ? "− Hide optional details" : "+ Add email or phone (optional)"}
            </button>

            {/* Collapsible Optional Fields */}
            <Collapse in={showOptional}>
              <Box
                sx={{
                  mt: 1.5,
                  p: 2,
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                <div>
                  <Typography sx={{ color: "#A5A8B0", fontSize: "12.5px", fontWeight: 500, mb: 0.5 }}>
                    Email (for password reset & receipts)
                  </Typography>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@dbit.in"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#1E2024",
                      border: "1px solid #2B2E34",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      color: "#FFFFFF",
                      fontSize: "14px",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                <div>
                  <Typography sx={{ color: "#A5A8B0", fontSize: "12.5px", fontWeight: 500, mb: 0.5 }}>
                    Phone number
                  </Typography>
                  <input
                    type="tel"
                    value={phoneNo}
                    onChange={(e) => setPhoneNo(e.target.value)}
                    placeholder="9876543210"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#1E2024",
                      border: "1px solid #2B2E34",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      color: "#FFFFFF",
                      fontSize: "14px",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                {/* Profile Photo */}
                <div>
                  <Typography sx={{ color: "#A5A8B0", fontSize: "12.5px", fontWeight: 500, mb: 0.5 }}>
                    Profile Photo
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    {avatarPreview && (
                      <Box
                        component="img"
                        src={avatarPreview}
                        alt="Preview"
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "1px solid #C84A2A",
                        }}
                      />
                    )}
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 12px",
                        background: "#2A2D33",
                        borderRadius: "8px",
                        color: "#D0D2D7",
                        fontSize: "12.5px",
                        cursor: "pointer",
                      }}
                    >
                      <PhotoCameraIcon sx={{ fontSize: 16 }} />
                      {avatarFile ? "Change Photo" : "Upload Photo"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        style={{ display: "none" }}
                      />
                    </label>
                  </Box>
                </div>
              </Box>
            </Collapse>
          </Box>

          {/* Create account Button */}
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
            {loading ? <CircularProgress size={20} sx={{ color: "#FFFFFF" }} /> : "Create account"}
          </button>

          {/* Sign In Link */}
          <Typography
            sx={{
              textAlign: "center",
              color: "#B2B5BC",
              fontSize: "14px",
            }}
          >
            Already registered?{" "}
            <Link
              to="/login"
              style={{
                color: "#5B8DF6",
                fontWeight: 500,
                textDecoration: "underline",
              }}
            >
              Sign in
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
