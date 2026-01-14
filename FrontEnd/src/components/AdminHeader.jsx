
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { CartContext } from "../context/CartContext";
import { ThemeContext } from "../context/ThemeContext";
import { logout as apiLogout } from "../utils/api";
import {
  Drawer,
  Box,
  Typography,
  Button,
  Stack,
  IconButton,
  Divider,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PeopleIcon from "@mui/icons-material/People";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

const DRAWER_WIDTH = 280;
const COLLAPSED_WIDTH = 0; // Fully hidden when collapsed

let drawerOpenState = true;
let drawerOpenListeners = [];

function notifyDrawerChange(isOpen) {
  drawerOpenState = isOpen;
  drawerOpenListeners.forEach(listener => listener(isOpen));
}

export function useDrawerState() {
  const [open, setOpen] = useState(drawerOpenState);
  
  useEffect(() => {
    const listener = (isOpen) => setOpen(isOpen);
    drawerOpenListeners.push(listener);
    return () => {
      drawerOpenListeners = drawerOpenListeners.filter(l => l !== listener);
    };
  }, []);
  
  return open;
}

export default function AdminSidebar() {
  const [open, setOpen] = useState(true);
  
  const handleToggle = () => {
    const newState = !open;
    setOpen(newState);
    notifyDrawerChange(newState);
  };
  const { clearCart, clearUser } = useContext(CartContext);
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  async function handleLogout() {
    await apiLogout();
    clearCart();
    clearUser();
    localStorage.clear();
    navigate("/login");
  }

  const menuItems = [
    { label: "Dashboard", to: "/admin/dashboard", icon: <DashboardIcon /> },
    { label: "Product Entry", to: "/product-entry", icon: <ShoppingCartIcon /> },
    { label: "Menu", to: "/admin/menu", icon: <RestaurantMenuIcon /> },
    { label: "Orders", to: "/admin/orders", icon: <AssignmentIcon /> },
    { label: "Users", to: "/admin/users", icon: <PeopleIcon /> },
  ];

  return (
    <>
      {/* Toggle Button */}
      <IconButton
        onClick={handleToggle}
        sx={{
          position: "fixed",
          left: open ? DRAWER_WIDTH - 50 : 10,
          top: 10,
          zIndex: 1300,
          background: "#1976d2",
          color: "white",
          transition: "left 0.3s ease",
          "&:hover": {
            background: "#1565c0",
          },
        }}
      >
        <ChevronLeftIcon 
          sx={{ 
            transform: open ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform 0.3s ease"
          }} 
        />
      </IconButton>

      <Drawer
        variant="persistent"
        open={open}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            background: "#1976d2",
            color: "white",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Header/Brand */}
        <Box sx={{ p: 3, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: "1.1rem", letterSpacing: 0.5 }}>
          DBIT Canteen
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
          Admin Panel
        </Typography>
      </Box>

      {/* Navigation Items */}
      <Stack spacing={1} sx={{ flex: 1, p: 2 }}>
        {menuItems.map((item) => (
          <Button
            key={item.to}
            component={RouterLink}
            to={item.to}
            startIcon={item.icon}
            sx={{
              justifyContent: "flex-start",
              textTransform: "none",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "white",
              p: 1.5,
              borderRadius: 1,
              "&:hover": {
                background: "rgba(255,255,255,0.15)",
              },
            }}
          >
            {item.label}
          </Button>
        ))}
      </Stack>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

      {/* Footer - Theme & Logout */}
      <Stack spacing={1} sx={{ p: 2 }}>
        <IconButton
          onClick={toggleTheme}
          sx={{
            color: "white",
            justifyContent: "flex-start",
            p: 1.5,
            borderRadius: 1,
            "&:hover": { background: "rgba(255,255,255,0.15)" },
          }}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>

        <Button
          onClick={handleLogout}
          startIcon={<LogoutIcon />}
          sx={{
            justifyContent: "flex-start",
            textTransform: "none",
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "white",
            p: 1.5,
            borderRadius: 1,
            "&:hover": { background: "rgba(239, 68, 68, 0.3)" },
          }}
        >
          Logout
        </Button>
      </Stack>
    </Drawer>
    </>
  );
}

export { DRAWER_WIDTH, COLLAPSED_WIDTH };
