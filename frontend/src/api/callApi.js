// What this file does: API call to trigger an outbound Twilio phone call to the visitor
import api from './axios';

// Initiates an outbound call via Twilio to the given phone number
// about the specified property
export const makeCall = (phone, propertyId) =>
  api.post('/api/call/make-call', { phone, propertyId });
