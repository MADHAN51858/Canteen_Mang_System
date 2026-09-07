import { createContext, useState, useEffect } from 'react';
import { get } from '../utils/api';

export const CartContext = createContext();

export function CartProvider({ children }) {
  // Cart state stored in sessionStorage only (never in localStorage)
  const [cart, setCart] = useState(() => {
    try {
      const raw = sessionStorage.getItem('cart');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  // User profile state stored in sessionStorage only (never in localStorage)
  const [user, setUser] = useState(() => {
    try {
      const sessionRaw = sessionStorage.getItem('user');
      if (sessionRaw) return JSON.parse(sessionRaw);
      return null;
    } catch (e) {
      return null;
    }
  });

  // Purge any legacy localStorage items and always fetch fresh user from backend API
  useEffect(() => {
    try {
      localStorage.removeItem('cart');
      localStorage.removeItem('user');
    } catch (e) {}

    async function syncUserWithBackend() {
      try {
        const res = await get("/users/getMe");
        if (res && res.success && res.data?.user) {
          const freshUser = res.data.user;
          setUser(freshUser);
          sessionStorage.setItem('user', JSON.stringify(freshUser));
        }
      } catch (err) {
        // Unauthenticated or network error; keep existing session state
      }
    }

    syncUserWithBackend();
  }, []);

  function login(userData) {
    setUser(userData);
    try {
      sessionStorage.setItem('user', JSON.stringify(userData));
    } catch (e) {}
  }

  function updateUserProfile(updatedUserData) {
    setUser(updatedUserData);
    try {
      sessionStorage.setItem('user', JSON.stringify(updatedUserData));
    } catch (e) {}
  }

  function logout() {
    setUser(null);
    setCart([]);
    try {
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('cart');
      localStorage.removeItem('user');
      localStorage.removeItem('cart');
    } catch (e) {}
  }

  function clearUser() {
    setUser(null);
    setCart([]);
    try {
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('cart');
      localStorage.removeItem('user');
      localStorage.removeItem('cart');
    } catch (e) {}
  }

  function addToCart(item) {
    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i._id === item._id);
      let next;
      if (existingIndex >= 0) {
        next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: (next[existingIndex].quantity || 1) + 1,
        };
      } else {
        next = [...prev, { ...item, quantity: 1 }];
      }
      try {
        sessionStorage.setItem('cart', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }

  function removeFromCart(id) {
    setCart((prev) => {
      const next = prev.filter((i) => i._id !== id);
      try {
        sessionStorage.setItem('cart', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }

  function increaseQuantity(id) {
    setCart((prev) => {
      const next = prev.map((item) =>
        item._id === id
          ? { ...item, quantity: (item.quantity || 1) + 1 }
          : item
      );
      try {
        sessionStorage.setItem('cart', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }

  function decreaseQuantity(id) {
    setCart((prev) => {
      const next = prev
        .map((item) => {
          if (item._id === id) {
            const newQty = (item.quantity || 1) - 1;
            if (newQty <= 0) return null;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean);
      try {
        sessionStorage.setItem('cart', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }

  function clearCart() {
    setCart([]);
    try {
      sessionStorage.removeItem('cart');
    } catch (e) {}
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        clearUser,
        user,
        login,
        logout,
        updateUserProfile,
        increaseQuantity,
        decreaseQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
