import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { CartContext } from "../context/CartContext";

export default function ProtectedRoute({ children, requiredRole, allowedRoles }) {
  const { user } = useContext(CartContext);
  const role = user?.role;
  const roleLower = String(role || "").toLowerCase();

  // If no user, redirect to login
  if (!user || !role) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles array is provided, ensure current role is in it
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const ok = allowedRoles.some((r) => roleLower === String(r).toLowerCase());
    if (!ok) return <Navigate to="/login" replace />;
  }

  // Backwards compatibility: single requiredRole string (substring match as before)
  if (!allowedRoles && requiredRole && !roleLower.includes(requiredRole.toLowerCase())) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
