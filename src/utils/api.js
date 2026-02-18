import { getApiBaseUrl } from '../config/apiConfig.js'

export async function apiRequest(path, options = {}) {
  const base = getApiBaseUrl()
  const url = path.startsWith('http') ? path : `${base}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed')
    err.response = { status: res.status, data }
    throw err
  }
  return data
}
