import { createContext, useState } from 'react'

export const CartContext = createContext()

export function CartProvider({children}){
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem('cart')
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      return []
    }
  })

  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user')
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      return null
    }
  }); // { username, roll, ... }

  function login(userData) {
    setUser(userData); // store full user
    try { localStorage.setItem('user', JSON.stringify(userData)) } catch (e) {}
  }

  function logout() {
    setUser(null);
    try { localStorage.removeItem('user') } catch (e) {}
  }

  function addToCart(item){
    setCart(prev => {
      // Check if item already exists
      const existingIndex = prev.findIndex(i => i._id === item._id)
      let next
      if (existingIndex >= 0) {
        // Item exists, increase quantity
        next = [...prev]
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: (next[existingIndex].quantity || 1) + 1
        }
      } else {
        // New item, add with quantity 1
        next = [...prev, { ...item, quantity: 1 }]
      }
      try { localStorage.setItem('cart', JSON.stringify(next)) } catch (e) {}
      return next
    })
  }

  function removeFromCart(id){
    setCart(prev => {
      const next = prev.filter(i => i._id !== id)
      try { localStorage.setItem('cart', JSON.stringify(next)) } catch (e) {}
      return next
    })
  }

  function increaseQuantity(id){
    setCart(prev => {
      const next = prev.map(item => 
        item._id === id 
          ? { ...item, quantity: (item.quantity || 1) + 1 }
          : item
      )
      try { localStorage.setItem('cart', JSON.stringify(next)) } catch (e) {}
      return next
    })
  }

  function decreaseQuantity(id){
    setCart(prev => {
      const next = prev.map(item => {
        if (item._id === id) {
          const newQty = (item.quantity || 1) - 1
          if (newQty <= 0) return null // will be filtered out
          return { ...item, quantity: newQty }
        }
        return item
      }).filter(Boolean)
      try { localStorage.setItem('cart', JSON.stringify(next)) } catch (e) {}
      return next
    })
  }

  function clearCart(){
    setCart([])
    try { localStorage.removeItem('cart') } catch (e) {}
  }
  function clearUser(){
    setUser(null)
    try { localStorage.removeItem('user') } catch (e) {}
  }

  return (
    <CartContext.Provider value={{cart, addToCart, removeFromCart, clearCart, clearUser, user, login, logout, increaseQuantity, decreaseQuantity}}>
      {children}
    </CartContext.Provider>
  )
}
