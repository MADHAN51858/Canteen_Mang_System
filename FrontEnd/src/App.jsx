import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserOrders from "./pages/UserOrders";
import Orders from "./pages/Orders";
import Friends from "./pages/Friends";
import AddFriends from "./pages/AddFriends";
import Admin from "./pages/Admin";
import Header from "./components/Header";
import { CartProvider, CartContext } from "./context/CartContext";
import { useContext } from "react";
import AdminHeader from "./components/AdminHeader";

function App() {
  function HeaderSelector(){
    const { user } = useContext(CartContext)
    const rv = String((user && user.role) || '').toLowerCase()
    const location = useLocation()

    // hide headers on login and register routes
    if(location.pathname === '/login' || location.pathname === '/') return null

    if(rv.includes('admin')) return <AdminHeader />
    if(rv.includes('student'))  return <Header />
  }

  return (
    <BrowserRouter>
      <CartProvider>
        <HeaderSelector />
        <Routes>
          <Route path="/student/menu" element={<Menu />} />
          <Route path="/admin/menu" element={<Menu />} />
          <Route path="/student/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Register />} />
          <Route path="/student/orders" element={<UserOrders />} />
          <Route path="/admin/orders" element={<Orders />} />
          <Route path="/student/get-friends" element={<Friends />} />
          <Route path="/student/add-friends" element={<AddFriends />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
