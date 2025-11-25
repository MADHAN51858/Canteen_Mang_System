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
      const next = [...prev, item]
      try { localStorage.setItem('cart', JSON.stringify(next)) } catch (e) {}
      return next
    })
  }

  function removeFromCart(id){
    setCart(prev => {
      // remove only the first occurrence of an item with matching product id
      const idx = prev.findIndex(i => i._id === id)
      if (idx === -1) return prev
      const next = [...prev]
      next.splice(idx, 1)
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
    <CartContext.Provider value={{cart, addToCart, removeFromCart, clearCart, clearUser, user, login, logout}}>
      {children}
    </CartContext.Provider>
  )
}
