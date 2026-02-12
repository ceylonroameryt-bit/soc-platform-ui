// API Base URL - automatically resolves for both dev and production
// In development (Vite on port 5173): uses http://localhost:3000
// In production (Azure, same-origin): uses relative URLs (empty string)
const isDev = window.location.port === '5173';
export const API_BASE = isDev ? 'http://localhost:3000' : '';
