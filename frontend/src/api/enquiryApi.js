// What this file does: enquiry API calls — create and fetch user's own enquiries
import api from './axios';

// Saves an AI conversation session as an enquiry record
export const createEnquiry = (data) => api.post('/api/enquiries', data);

// Fetches all enquiries made by the current logged-in user
export const getMyEnquiries = () => api.get('/api/enquiries/my');
