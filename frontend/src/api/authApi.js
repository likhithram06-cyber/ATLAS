// What this file does: authentication API calls for standard and Firebase Google OAuth
import api from './axios';

// Registers a new user
export const registerUser = (data) => api.post('/api/auth/register', data);

// Logs in an existing user via password
export const loginUser = (data) => api.post('/api/auth/login', data);

// Handles Google Sign-in verification on backend
export const googleAuth = (idToken, phone = null) => 
  api.post('/api/auth/google', { idToken, phone });

// Returns currently logged in user profile
export const getMe = () => api.get('/api/auth/me');

// Toggles saving/bookmarking a property
export const toggleSaveProperty = (propId) => api.put(`/api/auth/save-property/${propId}`);
