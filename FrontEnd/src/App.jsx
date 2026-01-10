import { BrowserRouter, Routes, Route, useLocation, useNavigate  } from "react-router-dom";
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
import Header from "./components/Header";
import Toast from "./components/Toast";
import { CartProvider, CartContext } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import { useContext, useEffect } from "react";
import AdminHeader from "./components/AdminHeader";
import StaffHeader from "./components/StaffHeader";
import ProtectedRoute from "./components/ProtectedRoute";
import { setOnUnauthorized } from "./utils/api";

function App() {
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

  return (
    <BrowserRouter>
      <ToastProvider>
        <CartProvider>
          <AuthHandler />
          <Toast />
          <HeaderSelector />
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
        </CartProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
