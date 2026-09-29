/**
 * frontend/src/apiConfig.js
 * Dynamic API Base URL resolution for Vercel multi-service deployment,
 * custom environment variables, and local development fallback.
 */

export const API_BASE_URL = (
  (typeof process !== 'undefined' && process.env?.BACKEND_URL) ||
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.MODE === 'production' ? '/api' : 'http://127.0.0.1:8000')
).replace(/\/$/, '');
