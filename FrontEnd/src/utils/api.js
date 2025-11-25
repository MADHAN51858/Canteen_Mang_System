const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

async function post(path, body){
  const res = await fetch(`${BASE}${path}`,{
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  if (!res.ok) {
    // try to parse json error body, otherwise return text
    if (isJson) {
      const j = await res.json()
      return { success: false, status: res.status, ...j }
    }
    const txt = await res.text()
    return { success: false, status: res.status, message: txt }
  }

  if (isJson) return res.json()
  return { success: true, data: null }
}



async function postForm(path, formData){
  const res = await fetch(`${BASE}${path}`,{
    method: 'POST',
    // NOTE: do NOT set Content-Type when sending FormData; the browser will set the multipart boundary
    body: formData,
  })
  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  if (!res.ok) {
    if (isJson) {
      const j = await res.json()
      return { success: false, status: res.status, ...j }
    }
    const txt = await res.text()
    return { success: false, status: res.status, message: txt }
  }

  if (isJson) return res.json()
  return { success: true, data: null }
}

export async function getCategoryItems(category){
  return post('/food/getCategoryItems',{category})
}

export async function placeOrder(userDetails, userOrder, cancelBy){
  return post('/users/orderFood',{userDetails, userOrder , cancelBy})
}

export { post }
export default { post }

export { postForm }
