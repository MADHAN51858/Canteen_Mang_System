import { BrowserRouter, Routes, Route, useLocation, useNavigate  } from "react-router-dom";
import { Box, Fab, Badge } from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserOrders from "./pages/UserOrders";
import Orders from "./pages/Orders";
import Friends from "./pages/Friends";
import AddFriends from "./pages/AddFriends";
import Admin from "./pages/Admin";
import Users from "./pages/Users";
import Dashboard from "./pages/Dashboard";
import Header, { useDrawerState as useStudentDrawerState } from "./components/Header";
import Toast from "./components/Toast";
import { CartProvider, CartContext } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import { useContext, useEffect, useState } from "react";
import AdminHeader, { DRAWER_WIDTH, COLLAPSED_WIDTH, useDrawerState as useAdminDrawerState } from "./components/AdminHeader";
import StaffHeader, { useDrawerState as useStaffDrawerState } from "./components/StaffHeader";
import ProtectedRoute from "./components/ProtectedRoute";
import { setOnUnauthorized } from "./utils/api";

// const COLLAPSED_WIDTH = 72; // Width when sidebar is collapsed

function HeaderSelector(){
  const location = useLocation();
  const { user } = useContext(CartContext);
  
  // Get role from user context
  const role = user?.role;
  
  // hide headers on login and register routes
  if(location.pathname === '/login' || location.pathname === '/') return null
  
  // If no user, don't show header (ProtectedRoute will handle redirect)
  if (!user || !role) return null;

  if(String(role || '').toLowerCase().includes('admin')) return <AdminHeader />
  if(String(role || '').toLowerCase().includes('staff'))  return <StaffHeader />
  if(String(role || '').toLowerCase().includes('student'))  return <Header />
  
  return null;
}

function AuthHandler() {
  const navigate = useNavigate();
  const { logout } = useContext(CartContext);

  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
      navigate("/login");
    });
  }, [navigate, logout]);

  return null;
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, cart } = useContext(CartContext);
  const role = user?.role;
  const isAdmin = user && String(role || '').toLowerCase().includes('admin');
  const isStaff = user && String(role || '').toLowerCase().includes('staff');
  const isStudent = user && String(role || '').toLowerCase().includes('student');
  const isAdminOrStaff = isAdmin || isStaff;
  const showSidebar = (isAdminOrStaff || isStudent) && location.pathname !== '/login' && location.pathname !== '/';
  
  // Use the appropriate drawer state based on role
  const adminDrawerOpen = useAdminDrawerState();
  const staffDrawerOpen = useStaffDrawerState();
  const studentDrawerOpen = useStudentDrawerState();
  const drawerOpen = isAdmin ? adminDrawerOpen : isStaff ? staffDrawerOpen : isStudent ? studentDrawerOpen : false;
  
  const currentDrawerWidth = showSidebar 
    ? (drawerOpen ? DRAWER_WIDTH : COLLAPSED_WIDTH)
    : 0;

  // Calculate total cart items
  const cartItemCount = cart?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  // Show floating cart only for students and not on cart page
  const showFloatingCart = isStudent && location.pathname !== '/student/cart' && location.pathname !== '/login' && location.pathname !== '/';

  return (
    <>
      <AuthHandler />
      <Toast />
      <HeaderSelector />
      <Box sx={{ display: 'flex' }}>
        <Box 
          sx={{ 
            width: currentDrawerWidth, 
            flexShrink: 0,
            transition: 'width 0.3s ease'
          }} 
        />
        <Box sx={{ flex: 1 }}>
          <Routes>
            <Route path="/student/menu" element={<ProtectedRoute requiredRole="student"><Menu /></ProtectedRoute>} />
            <Route path="/admin/menu" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><Menu /></ProtectedRoute>} />
            <Route path="/student/cart" element={<ProtectedRoute requiredRole="student"><Cart /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Register />} />
            <Route path="/student/orders" element={<ProtectedRoute requiredRole="student"><UserOrders /></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><Orders /></ProtectedRoute>} />
            <Route path="/student/wallet" element={<ProtectedRoute requiredRole="student"><Friends /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute requiredRole="student"><AddFriends /></ProtectedRoute>} />
            <Route path="/product-entry" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><Admin /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><Users /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><Dashboard /></ProtectedRoute>} />
            <Route path="/student" element={<ProtectedRoute requiredRole="student"></ProtectedRoute>} />
          </Routes>
        </Box>
      </Box>

      {/* Floating Cart Button for Students */}
      {showFloatingCart && (
        <Fab
          color="primary"
          aria-label="cart"
          onClick={() => navigate('/student/cart')}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 64,
            height: 64,
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            boxShadow: '0 8px 24px rgba(30,64,175,0.35)',
            transition: 'all 0.3s ease',
            zIndex: 1000,
            '&:hover': {
              transform: 'scale(1.1) translateY(-4px)',
              boxShadow: '0 12px 32px rgba(30,64,175,0.45)',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            },
          }}
        >
          <Badge
            badgeContent={cartItemCount}
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.85rem',
                fontWeight: 800,
                minWidth: 24,
                height: 24,
                borderRadius: '12px',
                border: '2px solid white',
              },
            }}
          >
            <ShoppingCartIcon sx={{ fontSize: 32, color: 'white' }} />
          </Badge>
        </Fab>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
