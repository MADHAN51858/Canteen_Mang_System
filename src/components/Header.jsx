import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { CartContext } from "../context/CartContext";
import { logout as apiLogout } from "../utils/api";
import {
  Drawer,
  Box,
  Typography,
  Button,
  Stack,
  IconButton,
  Avatar,
  Badge,
  Tooltip,
} from "@mui/material";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import RestaurantMenuOutlinedIcon from "@mui/icons-material/RestaurantMenuOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 76;

let drawerOpenState = true;
let drawerOpenListeners = [];

function notifyDrawerChange(isOpen) {
  drawerOpenState = isOpen;
  drawerOpenListeners.forEach((listener) => listener(isOpen));
}

export function useDrawerState() {
  const [open, setOpen] = useState(drawerOpenState);

  useEffect(() => {
    const listener = (isOpen) => setOpen(isOpen);
    drawerOpenListeners.push(listener);
    return () => {
      drawerOpenListeners = drawerOpenListeners.filter((l) => l !== listener);
    };
  }, []);

  return open;
}

export default function UnifiedSidebar() {
  const [open, setOpen] = useState(true);
  const location = useLocation();
  const { user, cart, clearCart, clearUser } = useContext(CartContext);
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
    try {
      sessionStorage.clear();
      localStorage.removeItem('user');
      localStorage.removeItem('cart');
    } catch (e) {}
    navigate("/login");
  }

  // Determine user role (defaults to student)
  const rawRole = String(user?.role || "student").toLowerCase();
  const userRole = rawRole.includes("admin")
    ? "admin"
    : rawRole.includes("staff")
      ? "staff"
      : "student";

  // Menu items configured with role-based restrictions
  const allMenuItems = [
    {
      label: "Dashboard",
      to: "/admin/dashboard",
      icon: <GridViewOutlinedIcon sx={{ fontSize: 22 }} />,
      roles: ["admin"],
    },
    {
      label: userRole === "student" ? "Menu" : "Menu Management",
      to: userRole === "student" ? "/student/menu" : "/admin/menu",
      matchAlso: ["/product-entry", "/admin/menu", "/student/menu"],
      icon: <RestaurantMenuOutlinedIcon sx={{ fontSize: 22 }} />,
      roles: ["admin", "staff", "student"],
    },
    {
      label: userRole === "student" ? "My Orders" : "Order Management",
      to: userRole === "student" ? "/student/orders" : "/admin/orders",
      icon: <AssignmentOutlinedIcon sx={{ fontSize: 22 }} />,
      roles: ["admin", "staff", "student"],
    },
    {
      label: "User Management",
      to: "/admin/users",
      icon: <PeopleAltOutlinedIcon sx={{ fontSize: 22 }} />,
      roles: ["admin"],
    },
    {
      label: "Profile Setup",
      to: "/student/profile",
      matchAlso: ["/profile"],
      icon: <PersonOutlineOutlinedIcon sx={{ fontSize: 22 }} />,
      roles: ["admin", "staff", "student"],
    },
  ];

  // Filter items allowed for this user's role
  const menuItems = allMenuItems.filter((item) => item.roles.includes(userRole));

  return (
    <Drawer
      variant="persistent"
      open={true}
      sx={{
        width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH,
        flexShrink: 0,
        transition: "width 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        "& .MuiDrawer-paper": {
          width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH,
          boxSizing: "border-box",
          background: "linear-gradient(180deg, #183bbd 0%, #1532a8 50%, #122b94 100%)",
          color: "#ffffff",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          overflowX: "hidden",
          borderRight: "none",
          boxShadow: "4px 0 24px rgba(10, 24, 80, 0.15)",
        },
      }}
    >
      {/* Top Header / Profile Pill */}
      <Box
        sx={{
          p: open ? "22px 18px 20px" : "22px 12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          minHeight: 84,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Box sx={{ position: "relative" }}>
            <Avatar
              src={user?.avatar}
              alt={user?.username || "User"}
              sx={{
                width: 44,
                height: 44,
                background: user?.avatar ? "transparent" : "linear-gradient(135deg, #3b82f6, #6366f1)",
                border: user?.avatar ? "none" : "2px solid rgba(255, 255, 255, 0.35)",
                fontWeight: 700,
                fontSize: "1.1rem",
                color: "#ffffff",
                boxShadow: user?.avatar ? "none" : "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              {!user?.avatar && (user?.username ? user.username[0].toUpperCase() : "U")}
            </Avatar>
          </Box>
          {open && (
            <Box sx={{ minWidth: 0, overflow: "hidden" }}>
              <Typography
                variant="subtitle1"
                sx={{
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.98rem",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                {user?.username || "User"}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255, 255, 255, 0.65)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  display: "block",
                  mt: 0.2,
                }}
              >
                {userRole.toUpperCase()}
              </Typography>
            </Box>
          )}
        </Box>

        <IconButton
          onClick={handleToggle}
          size="small"
          sx={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            color: "rgba(255, 255, 255, 0.85)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.22)",
              color: "#ffffff",
            },
            transition: "all 0.2s ease",
          }}
          title={open ? "Collapse sidebar" : "Expand sidebar"}
        >
          {open ? (
            <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} />
          ) : (
            <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
          )}
        </IconButton>
      </Box>

      {/* Navigation Menu Items */}
      <Stack spacing={0.8} sx={{ flex: 1, p: open ? "20px 14px" : "20px 10px" }}>
        {menuItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.matchAlso && item.matchAlso.includes(location.pathname));

          return open ? (
            <Button
              key={item.label}
              component={RouterLink}
              to={item.to}
              startIcon={item.icon}
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                fontSize: "0.93rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.82)",
                backgroundColor: isActive ? "rgba(255, 255, 255, 0.16)" : "transparent",
                px: 2,
                py: 1.35,
                borderRadius: "14px",
                transition: "all 0.2s ease",
                "& .MuiButton-startIcon": {
                  color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.85)",
                  mr: 1.6,
                },
                "&:hover": {
                  backgroundColor: isActive
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(255, 255, 255, 0.08)",
                  color: "#ffffff",
                },
              }}
            >
              {item.label}
            </Button>
          ) : (
            <Tooltip key={item.label} title={item.label} placement="right" arrow>
              <IconButton
                component={RouterLink}
                to={item.to}
                sx={{
                  color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.82)",
                  backgroundColor: isActive ? "rgba(255, 255, 255, 0.16)" : "transparent",
                  p: 1.5,
                  borderRadius: "14px",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: isActive
                      ? "rgba(255, 255, 255, 0.2)"
                      : "rgba(255, 255, 255, 0.08)",
                    color: "#ffffff",
                  },
                }}
              >
                {item.icon}
              </IconButton>
            </Tooltip>
          );
        })}
      </Stack>

      {/* Footer / Logout */}
      <Box sx={{ p: open ? "16px 14px 22px" : "16px 10px 22px" }}>
        {open ? (
          <Button
            onClick={handleLogout}
            startIcon={<LogoutOutlinedIcon sx={{ fontSize: 22 }} />}
            sx={{
              width: "100%",
              justifyContent: "flex-start",
              textTransform: "none",
              fontSize: "0.93rem",
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.82)",
              px: 2,
              py: 1.35,
              borderRadius: "14px",
              transition: "all 0.2s ease",
              "& .MuiButton-startIcon": {
                mr: 1.6,
                color: "rgba(255, 255, 255, 0.82)",
              },
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                "& .MuiButton-startIcon": {
                  color: "#ffffff",
                },
              },
            }}
          >
            Logout
          </Button>
        ) : (
          <Tooltip title="Logout" placement="right" arrow>
            <IconButton
              onClick={handleLogout}
              sx={{
                color: "rgba(255, 255, 255, 0.82)",
                p: 1.5,
                borderRadius: "14px",
                width: "100%",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                },
              }}
            >
              <LogoutOutlinedIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Drawer>
  );
}

export { DRAWER_WIDTH, COLLAPSED_WIDTH };
