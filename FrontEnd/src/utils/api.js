import axios from 'axios';

const BASE = "https://canteen-mang-system.onrender.com" || 'http://localhost:3000'

// Configure axios with credentials
axios.defaults.withCredentials = true;
axios.defaults.baseURL = BASE;

// Callback for handling 401 unauthorized responses
let onUnauthorized = null;

export function setOnUnauthorized(callback) {
  onUnauthorized = callback;
}

// Extract clean error message from HTML or text
function extractErrorMessage(text) {
  // First, try to extract error message with stack trace pattern
  // Pattern: "Error: [message]" - get everything after "Error: " until stack trace starts
  const errorMatch = text.match(/Error:\s*([^\n]*?)(\s+at\s+new|\s+at\s+file:|&nbsp;|<|$)/);
  if (errorMatch && errorMatch[1]) {
    let message = errorMatch[1]
      .replace(/&#39;/g, "'")                                               // Decode &#39;
      .replace(/&quot;/g, '"')                                              // Decode &quot;
      .replace(/&nbsp;/g, ' ')                                              // Decode &nbsp;
      .replace(/&lt;/g, '<')                                                // Decode &lt;
      .replace(/&gt;/g, '>')                                                // Decode &gt;
      .replace(/&amp;/g, '&')                                               // Decode &amp;
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))       // Decode numeric entities
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove trailing "at" if present
    message = message.replace(/\s+at\s*$/, '').trim();
    
    if (message.length > 0) {
      return message;
    }
  }
  
  // If it's HTML, try to extract meaningful error message
  if (text.includes('<html') || text.includes('<!DOCTYPE') || text.includes('<body')) {
    // Remove all HTML tags but keep the text content
    let cleanText = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')  // Remove script tags
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')    // Remove style tags
      .replace(/&#39;/g, "'")                                               // Decode &#39;
      .replace(/&quot;/g, '"')                                              // Decode &quot;
      .replace(/&nbsp;/g, ' ')                                              // Decode &nbsp;
      .replace(/&lt;/g, '<')                                                // Decode &lt;
      .replace(/&gt;/g, '>')                                                // Decode &gt;
      .replace(/&amp;/g, '&')                                               // Decode &amp;
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))       // Decode numeric entities
      .replace(/<[^>]+>/g, ' ')                                             // Remove all HTML tags
      .replace(/\s+/g, ' ')                                                 // Collapse multiple spaces
      .trim();
    
    // Split by common separators and find meaningful lines
    const lines = cleanText.split(/[\n\r]+/).filter(line => line.trim().length > 0);
    
    // Look for error-related keywords first
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 5 && trimmed.length < 500) {
        // Skip common non-error texts
        if (!trimmed.match(/^(<!|DOCTYPE|html|head|body|meta|link|script|style|div|span|p|h[1-6]|br|img)/i) &&
            !trimmed.match(/^\d+\.\d+\.\d+/) &&  // Skip version numbers
            trimmed.match(/[a-zA-Z]{3,}/)) {     // Must have substantial text
          // Prioritize lines with error keywords
          if (trimmed.match(/error|failed|cannot|invalid|already|required|exist|missing/i)) {
            return trimmed;
          }
        }
      }
    }
    
    // If no error keyword found, return first substantial line
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && trimmed.length < 500 && 
          trimmed.match(/[a-zA-Z]{5,}/) &&
          !trimmed.match(/^(<!|DOCTYPE|html|head|body|meta|link|script|style)/i)) {
        return trimmed;
      }
    }
    
    // Final fallback
    return "Server error. Please try again.";
  }
  
  // If it's plain text, decode entities and return
  return (text || "An error occurred. Please try again.")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
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
