import { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Badge,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import LogoutIcon from "@mui/icons-material/Logout";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PersonIcon from "@mui/icons-material/Person";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

const DRAWER_WIDTH = 280;
const COLLAPSED_WIDTH = 72; // Show icons when collapsed

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

export default function Header() {
  const [open, setOpen] = useState(true);
  const { cart, clearCart, clearUser } = useContext(CartContext);
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleToggle = () => {
    const newState = !open;
    setOpen(newState);
    notifyDrawerChange(newState);
  };

  async function handleLogout() {
    await apiLogout();
    clearCart();
    clearUser();
    localStorage.clear();
    navigate("/login");
  }

  const menuItems = [
    { label: "Menu", to: "/student/menu", icon: <RestaurantMenuIcon /> },
    { label: "Cart", to: "/student/cart", icon: <ShoppingCartIcon />, badge: cart.length },
    { label: "Orders", to: "/student/orders", icon: <AssignmentIcon /> },
    { label: "Profile", to: "/student/profile", icon: <PersonIcon /> },
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
        open={true}
        sx={{
          width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH,
          flexShrink: 0,
          transition: "width 0.3s ease",
          "& .MuiDrawer-paper": {
            width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH,
            boxSizing: "border-box",
            background: "#1976d2",
            color: "white",
            display: "flex",
            flexDirection: "column",
            transition: "width 0.3s ease",
            overflowX: "hidden",
          },
        }}
      >
        {/* Header/Brand */}
        <Box sx={{ p: open ? 3 : 2, borderBottom: "1px solid rgba(255,255,255,0.1)", minHeight: 80, display: "flex", alignItems: "center" }}>
          {open ? (
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: "1.1rem", letterSpacing: 0.5 }}>
                DBIT Canteen
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                Student Panel
              </Typography>
            </Box>
          ) : (
            <Typography variant="h5" fontWeight={900} sx={{ fontSize: "1.5rem" }}>
              
            </Typography>
          )}
        </Box>

        {/* Navigation Items */}
        <Stack spacing={1} sx={{ flex: 1, p: open ? 2 : 1 }}>
          {menuItems.map((item) => (
            open ? (
              <Button
                key={item.to}
                component={Link}
                to={item.to}
                startIcon={item.icon}
                endIcon={item.badge > 0 ? (
                  <Badge 
                    badgeContent={item.badge} 
                    color="error"
                    sx={{
                      "& .MuiBadge-badge": {
                        fontSize: "0.65rem",
                        height: "18px",
                        minWidth: "18px",
                        fontWeight: 700,
                      }
                    }}
                  />
                ) : null}
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
            ) : (
              <IconButton
                key={item.to}
                component={Link}
                to={item.to}
                sx={{
                  color: "white",
                  p: 1.5,
                  borderRadius: 1,
                  "&:hover": {
                    background: "rgba(255,255,255,0.15)",
                  },
                }}
                title={item.label}
              >
                {item.badge > 0 ? (
                  <Badge 
                    badgeContent={item.badge} 
                    color="error"
                    sx={{
                      "& .MuiBadge-badge": {
                        fontSize: "0.65rem",
                        height: "18px",
                        minWidth: "18px",
                        fontWeight: 700,
                      }
                    }}
                  >
                    {item.icon}
                  </Badge>
                ) : item.icon}
              </IconButton>
            )
          ))}
        </Stack>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

        {/* Footer - Theme & Logout */}
        <Stack spacing={1} sx={{ p: open ? 2 : 1 }}>
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

          {open ? (
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
          ) : (
            <IconButton
              onClick={handleLogout}
              sx={{
                color: "white",
                p: 1.5,
                borderRadius: 1,
                "&:hover": { background: "rgba(239, 68, 68, 0.3)" },
              }}
              title="Logout"
            >
              <LogoutIcon />
            </IconButton>
          )}
        </Stack>
      </Drawer>
    </>
  );
}

export { DRAWER_WIDTH, COLLAPSED_WIDTH };
