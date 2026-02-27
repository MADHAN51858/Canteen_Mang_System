import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL?.trim() || (import.meta.env.DEV ? 'http://localhost:3000' : '');

// Configure axios with credentials
axios.defaults.withCredentials = true;
axios.defaults.baseURL = BASE;

// Callback for handling 401 unauthorized responses
let onUnauthorized = null;

export function setOnUnauthorized(callback) {
  onUnauthorized = callback;
}


async function post(path, body){
  try {
    const res = await axios.post(path, body, { withCredentials: true });
    return res.data;
  } catch (error) {
    if (error.response?.status === 401) {
      if (onUnauthorized) {
        onUnauthorized();
      }
      return { success: false, status: 401, message: "Session expired. Please login again." }
    }
    
    if (error.response?.data) {
      return { success: false, status: error.response.status, ...error.response.data }
    }
    
    const cleanMessage = error.message || "An error occurred. Please try again.";
    return { success: false, status: error.response?.status || 500, message: cleanMessage }
  }
}



async function postForm(path, formData){
  try {
    const res = await axios.post(path, formData, { withCredentials: true });
    return res.data;
  } catch (error) {
    if (error.response?.status === 401) {
      if (onUnauthorized) {
        onUnauthorized();
      }
      return { success: false, status: 401, message: "Session expired. Please login again." }
    }
    
    if (error.response?.data) {
      return { success: false, status: error.response.status, ...error.response.data }
    }
    
    const cleanMessage = error.message || "An error occurred. Please try again.";
    return { success: false, status: error.response?.status || 500, message: cleanMessage }
  }
}

export async function getCategoryItems(category){
  return post('/food/getCategoryItems',{category})
}

export async function placeOrder(userOrder, pre){
  return post('/users/orderFood',{userOrder, pre})
}

export { post }
export default { post }

export { postForm }

export async function login(username, password){
  return post('/users/login', {username, password})
}

export async function logout(){
  return post('/users/logout', {})
}
