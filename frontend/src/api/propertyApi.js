// What this file does: property-related API calls — list, single, similar, create
import api from './axios';
import axios from 'axios';

// Fetches all properties, optionally filtered by price/bhk/location query params
export const getProperties = (params = {}) => api.get('/api/properties', { params });

// Fetches a single property by ID
export const getProperty = (id) => api.get(`/api/properties/${id}`);

// Fetches top 4 similar properties using cosine similarity
export const getSimilarProperties = (id) => api.get(`/api/properties/similar/${id}`);

// Creates a new property listing — sends user JWT token
export const createProperty = (formData) => {
  const token = localStorage.getItem('atlas_token');
  return axios.post(
    `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/properties`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type — let browser set it for multipart/form-data
      },
    }
  );
};
