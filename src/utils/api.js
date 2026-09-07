import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? "" : "http://localhost:3000");

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
    const isBlockedMsg = String(error.response?.data?.message || "").toLowerCase().includes("block");
    if (error.response?.status === 401 || (error.response?.status === 403 && isBlockedMsg)) {
      const msg = error.response?.data?.message || "Session expired. Please login again.";
      if (onUnauthorized) {
        onUnauthorized(msg);
      }
      return { success: false, status: error.response?.status || 401, message: msg };
    }
    
    if (error.response?.data) {
      return { success: false, status: error.response.status, ...error.response.data };
    }
    
    const cleanMessage = error.message || "An error occurred. Please try again.";
    return { success: false, status: error.response?.status || 500, message: cleanMessage };
  }
}

async function get(path){
  try {
    const res = await axios.get(path, { withCredentials: true });
    return res.data;
  } catch (error) {
    const isBlockedMsg = String(error.response?.data?.message || "").toLowerCase().includes("block");
    if (error.response?.status === 401 || (error.response?.status === 403 && isBlockedMsg)) {
      const msg = error.response?.data?.message || "Session expired. Please login again.";
      if (onUnauthorized) {
        onUnauthorized(msg);
      }
      return { success: false, status: error.response?.status || 401, message: msg };
    }
    
    if (error.response?.data) {
      return { success: false, status: error.response.status, ...error.response.data };
    }
    
    const cleanMessage = error.message || "An error occurred. Please try again.";
    return { success: false, status: error.response?.status || 500, message: cleanMessage };
  }
}

async function postForm(path, formData){
  try {
    const res = await axios.post(path, formData, {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    const isBlockedMsg = String(error.response?.data?.message || "").toLowerCase().includes("block");
    if (error.response?.status === 401 || (error.response?.status === 403 && isBlockedMsg)) {
      const msg = error.response?.data?.message || "Session expired. Please login again.";
      if (onUnauthorized) {
        onUnauthorized(msg);
      }
      return { success: false, status: error.response?.status || 401, message: msg };
    }
    
    if (error.response?.data) {
      return { success: false, status: error.response.status, ...error.response.data };
    }
    
    const cleanMessage = error.message || "An error occurred. Please try again.";
    return { success: false, status: error.response?.status || 500, message: cleanMessage };
  }
}

export async function getCategoryItems(category){
  return post('/food/getCategoryItems',{category})
}

export async function placeOrder(userOrder, pre){
  return post('/users/orderFood',{userOrder, pre})
}

export { post, get }
export default { post, get }

export { postForm }

export async function login(username, password){
  return post('/users/login', {username, password})
}

export async function logout(){
  return post('/users/logout', {})
}

export async function forgotPassword(target){
  let body = {};
  if (typeof target === "string") {
    if (target.includes("@")) {
      body = { email: target.trim().toLowerCase() };
    } else {
      body = { phoneNo: target.replace(/\D/g, "") };
    }
  } else if (target && typeof target === "object") {
    body = target;
  }
  return post('/users/forgot-password', body);
}

export async function resetPassword(target, otp, newPassword){
  let body = { otp: String(otp || "").trim(), newPassword };
  if (typeof target === "string") {
    if (target.includes("@")) {
      body.email = target.trim().toLowerCase();
    } else {
      body.phoneNo = target.replace(/\D/g, "");
    }
  } else if (target && typeof target === "object") {
    body = { ...body, ...target };
  }
  return post('/users/reset-password', body);
}

export async function changePassword(newPassword){
  return post('/users/changePassword', { newPassword });
}

// Table & Group Ordering APIs
export async function createTable(tableName) {
  return post('/table/create', { tableName });
}

export async function joinTable(tableIdOrName) {
  return post('/table/join', { tableIdOrName });
}

export async function leaveTable() {
  return post('/table/leave', {});
}

export async function getMyTable() {
  return get('/table/my-table');
}

export async function getActiveTables() {
  return get('/table/active');
}

export async function addItemToTable(tableId, foodId) {
  return post('/table/add-item', { tableId, foodId });
}

export async function updateTableItemQty(tableId, itemId, delta) {
  return post('/table/update-qty', { tableId, itemId, delta });
}

export async function removeTableItem(tableId, itemId) {
  return post('/table/remove-item', { tableId, itemId });
}

export async function toggleMemberReady(tableId, isReady) {
  return post('/table/toggle-ready', { tableId, isReady });
}

export async function placeTableOrder(tableId, isPre, paymentMethod) {
  return post('/table/place-order', { tableId, isPre, paymentMethod });
}

export async function updateTableOrderType(tableId, orderType) {
  return post('/table/update-order-type', { tableId, orderType });
}

