// import { Link, useNavigate } from "react-router-dom";
// import { useContext } from "react";
// import { CartContext } from "../context/CartContext";

// export default function Header() {
//   const { cart, clearCart, clearUser } = useContext(CartContext);
//   const navigate = useNavigate();

//   function handleLogout() {

//     clearCart(); // Clears cart
//     clearUser(); // Clears cart
//     localStorage.clear(); // If you're storing any user/session data
//     navigate("/"); // Redirect to login/home
//   }

//   return (
//     <div className="container">
//       <header className="header">
//         <div className="brand">DBIT Canteen - Admin</div>
//         <nav className="nav">
//           <Link to="/admin">Admin</Link>
//           <Link to="/admin/menu">Menu</Link>
//           <Link to="/admin/orders">Orders</Link>
//           <Link
//             to="#"
//             onClick={(e) => {
//               e.preventDefault();
//               handleLogout();
//             }}
//           >
//             Logout
//           </Link>
//         </nav>
//       </header>
//     </div>
//   );
// }











import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { CartContext } from "../context/CartContext";
import { ThemeContext } from "../context/ThemeContext";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Stack,
  IconButton,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

export default function Header() {
  const { clearCart, clearUser } = useContext(CartContext);
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  function handleLogout() {
    clearCart();
    clearUser();
    localStorage.clear();
    navigate("/");
  }

  return (
    <AppBar 
      position="static" 
      elevation={3} 
      sx={{ 
        background: isDark 
          ? "linear-gradient(135deg, rgba(26, 31, 58, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)"
          : "linear-gradient(135deg, #1565c0 0%, #0e40ad 100%)",
        borderBottom: isDark ? "1px solid #334155" : "none",
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
          {/* Brand */}
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ letterSpacing: 0.5, color: isDark ? "#f1f5f9" : "white" }}
          >
            DBIT Canteen – Admin
          </Typography>

          {/* Nav Links */}
          <Stack 
            direction="row" 
            spacing={1}
            sx={{
              "& a, & button": {
                color: isDark ? "#f1f5f9" : "white",
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 600,
                "&:hover": {
                  bgcolor: isDark ? "rgba(66, 165, 245, 0.15)" : "rgba(255, 255, 255, 0.2)",
                },
              },
            }}
          >
            <Button
              component={RouterLink}
              to="/admin"
              sx={{
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: isDark ? "#f1f5f9" : "white",
              }}
            >
              Admin
            </Button>

            <Button
              component={RouterLink}
              to="/admin/menu"
              sx={{
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: isDark ? "#f1f5f9" : "white",
              }}
            >
              Menu
            </Button>

            <Button
              component={RouterLink}
              to="/admin/orders"
              sx={{
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: isDark ? "#f1f5f9" : "white",
              }}
            >
              Orders
            </Button>

            {/* Theme Toggle */}
            <IconButton 
              onClick={toggleTheme}
              sx={{ 
                color: isDark ? "#f1f5f9" : "white",
                ml: 1,
              }}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>

            <Button
              onClick={handleLogout}
              sx={{
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: isDark ? "#f1f5f9" : "white",
                "&:hover": { bgcolor: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.15)" },
              }}
            >
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
