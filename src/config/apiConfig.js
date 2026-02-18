/**
 * API base URL - points to hr-backend (same server)
 */
export function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.__VITE_API_URL__) {
    return window.__VITE_API_URL__.replace(/\/$/, '')
  }
  return (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
}
