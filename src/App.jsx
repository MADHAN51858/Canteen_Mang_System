import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Box } from "@mui/material";
import Menu from "./pages/Menu";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Orders from "./pages/Orders";
import Friends from "./pages/Friends";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Users from "./pages/Users";
import Dashboard from "./pages/Dashboard";
import Header, { DRAWER_WIDTH, COLLAPSED_WIDTH, useDrawerState } from "./components/Header";
import Toast from "./components/Toast";
import { CartProvider, CartContext } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import { SnackbarProvider } from "./context/SnackbarContext";
import { useContext, useEffect, useState } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import { setOnUnauthorized } from "./utils/api";

function HeaderSelector(){
  const location = useLocation();
  const { user } = useContext(CartContext);
  
  // hide headers on login, register, and forgot-password routes
  if(location.pathname === '/login' || location.pathname === '/' || location.pathname === '/forgot-password') return null;
  
  // If no user, don't show header (ProtectedRoute will handle redirect)
  if (!user || !user.role) return null;

  return <Header />;
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
  const { user } = useContext(CartContext);
  const isAuthPage = ['/login', '/', '/forgot-password'].includes(location.pathname);
  const showSidebar = Boolean(user && user.role) && !isAuthPage;
  
  const drawerOpen = useDrawerState();
  
  const currentDrawerWidth = showSidebar 
    ? (drawerOpen ? DRAWER_WIDTH : COLLAPSED_WIDTH)
    : 0;

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
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Routes>
            <Route path="/student/menu" element={<ProtectedRoute requiredRole="student"><Menu /></ProtectedRoute>} />
            <Route path="/admin/menu" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><Menu /></ProtectedRoute>} />
            <Route path="/student/cart" element={<Navigate to="/student/menu" replace />} />
            <Route path="/cart" element={<Navigate to="/student/menu" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={<Register />} />
            <Route path="/student/orders" element={<ProtectedRoute requiredRole="student"><Orders /></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><Orders /></ProtectedRoute>} />
            <Route path="/student/wallet" element={<ProtectedRoute requiredRole="student"><Friends /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute allowedRoles={["student", "admin", "staff"]}><Profile /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute allowedRoles={["student", "admin", "staff"]}><Profile /></ProtectedRoute>} />
            <Route path="/product-entry" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><Admin /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><Users /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><Dashboard /></ProtectedRoute>} />
            <Route path="/student" element={<ProtectedRoute requiredRole="student"><Navigate to="/student/menu" replace /></ProtectedRoute>} />
          </Routes>
        </Box>
      </Box>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SnackbarProvider>
        <ToastProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </ToastProvider>
      </SnackbarProvider>
    </BrowserRouter>
  );
}

export default App;
