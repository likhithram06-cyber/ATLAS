// What this file does: admin API calls & AI voice agent communications
import api from './axios';

// Gets the admin-only auth header using the adminToken from localStorage
function adminHeaders() {
  const token = localStorage.getItem('atlas_admin_token');
  return { Authorization: `Bearer ${token}` };
}

// ── Admin Dashboard API Calls ──
// Fetches all properties with their enquiry counts
export const getAdminProperties = () =>
  api.get('/api/admin/properties', { headers: adminHeaders() });

// Fetches all enquiries for one property, sorted by intent score (max-heap)
export const getPropertyEnquiries = (propId) =>
  api.get(`/api/admin/property/${propId}`, { headers: adminHeaders() });

// Fetches full detail of one enquiry including transcript and intent breakdown
export const getEnquiryDetail = (enquiryId) =>
  api.get(`/api/admin/enquiry/${enquiryId}`, { headers: adminHeaders() });


// ── AI Voice Agent API Calls ──
// Submits audio recording blob, propertyId, and running transcript to backend Whisper/LLaMA
export const getAgentResponse = (audioBlob, propertyId, transcript) => {
  const fd = new FormData();
  fd.append('file', audioBlob, 'audio.webm');
  fd.append('propertyId', propertyId);
  fd.append('transcript', JSON.stringify(transcript));
  return api.post('/api/agent/respond', fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Finishes the conversation, runs LLaMA lead scoring analysis, saves Enquiry, and triggers n8n Telegram webhook
export const finalizeConversation = (propertyId, transcript) => {
  return api.post('/api/agent/finalize', { propertyId, transcript });
};
