// Decode JWT token from cookies and extract role
export function getRoleFromToken() {
  try {
    // Get token from cookies
    const token = getCookie('accessToken');
    
    if (!token) {
      return null;
    }

    // Decode JWT (split by '.' and decode the payload)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    return payload.role || null;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

// Helper function to get cookie by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}
