// What this file does: single axios instance with base URL and automatic JWT header injection
import axios from 'axios';

// Create axios instance pointing to our backend
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('atlas_token');
  const hasAuth = config.headers && (config.headers['Authorization'] || config.headers['authorization']);
  if (token && !hasAuth) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;
