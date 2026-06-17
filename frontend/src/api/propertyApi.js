// What this file does: property-related API calls — list, single, similar, save
import api from './axios';

// Fetches all properties, optionally filtered by price/bhk/location query params
export const getProperties = (params = {}) => api.get('/api/properties', { params });

// Fetches a single property by ID
export const getProperty = (id) => api.get(`/api/properties/${id}`);

// Fetches top 4 similar properties using cosine similarity
export const getSimilarProperties = (id) => api.get(`/api/properties/similar/${id}`);

// Creates a new property listing (admin only)
export const createProperty = (data) => api.post('/api/properties', data);
