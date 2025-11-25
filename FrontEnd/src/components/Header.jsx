




import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { ThemeContext } from "../context/ThemeContext";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Button,
  Badge,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

export default function Header() {
  const { cart, clearCart, clearUser } = useContext(CartContext);
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    clearCart();
    clearUser();
    localStorage.clear();
    navigate("/");
  }

  const navItems = [
    { label: "Menu", to: "/student/menu" },
    { label: "Cart", to: "/student/cart", cartCount: cart.length },
    { label: "Orders", to: "/student/orders" },
    { label: "Friends List", to: "/student/get-friends" },
    { label: "Add Friends", to: "/student/add-friends" },
  ];

  return (
    <>
      <AppBar
        position="sticky"
        elevation={4}
        sx={{
          backdropFilter: "blur(12px)",
          background: isDark 
            ? "linear-gradient(135deg, rgba(26, 31, 58, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)"
            : "linear-gradient(135deg, #1565c0 0%, #0e40ad 100%)",
          color: isDark ? "#f1f5f9" : "white",
          borderBottom: isDark ? "1px solid #334155" : "none",
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          {/* Brand */}
          <Typography 
            variant="h6" 
            fontWeight={700} 
            sx={{ cursor: "pointer" }} 
            onClick={() => navigate("/student/menu")}
          >
            DBIT Canteen
          </Typography>

          {/* Desktop Menu */}
          <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1, alignItems: "center", flex: 1, justifyContent: "center" }}>
            {navItems.map((item) => (
              <Button 
                key={item.label} 
                component={Link} 
                to={item.to} 
                sx={{ 
                  textTransform: "none", 
                  fontWeight: 600,
                  color: isDark ? "#f1f5f9" : "white",
                  "&:hover": {
                    bgcolor: isDark ? "rgba(66, 165, 245, 0.15)" : "rgba(255, 255, 255, 0.2)",
                  },
                }}
              >
                {item.label}
                {item.cartCount > 0 && (
                  <Badge badgeContent={item.cartCount} sx={{ ml: 1 }} />
                )}
              </Button>
            ))}
          </Box>

          {/* Theme Toggle + Logout */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton 
              onClick={toggleTheme} 
              sx={{ color: isDark ? "#f1f5f9" : "white" }}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>

            <Button
              onClick={handleLogout}
              variant="outlined"
              sx={{
                color: isDark ? "#f1f5f9" : "white",
                borderColor: isDark ? "#f1f5f9" : "white",
                textTransform: "none",
                fontWeight: 600,
                display: { xs: "none", sm: "flex" },
                "&:hover": {
                  bgcolor: isDark ? "rgba(241, 245, 249, 0.1)" : "rgba(255, 255, 255, 0.2)",
                },
              }}
              startIcon={<LogoutIcon />}
            >
              Logout
            </Button>

            {/* Mobile Menu Button */}
            <IconButton sx={{ display: { xs: "flex", md: "none" }, color: isDark ? "#f1f5f9" : "white" }} onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Box sx={{ width: 250, p: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            DBIT Canteen
          </Typography>

          <List>
            {navItems.map((item) => (
              <ListItemButton 
                key={item.label} 
                component={Link} 
                to={item.to} 
                onClick={() => setMobileOpen(false)}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {item.label}
                      {item.cartCount > 0 && (
                        <ShoppingCartIcon fontSize="small" />
                      )}
                    </Box>
                  }
                />
              </ListItemButton>
            ))}

            <ListItemButton onClick={handleLogout}>
              <LogoutIcon fontSize="small" /> &nbsp; Logout
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </>
  );
}
