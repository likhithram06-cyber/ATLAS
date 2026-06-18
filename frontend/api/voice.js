// What this file does: Vercel Serverless Function endpoint for Twilio voice calls.
// Returns a valid TwiML XML response acknowledging that the Twilio integration works.

module.exports = (req, res) => {
  // Only accept POST (standard for Twilio webhooks) and GET for easy browser testing
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">
        Hello. This is ATLAS. The Twilio integration is working correctly.
    </Say>
</Response>`;

  // Set the Content-Type header to text/xml and return HTTP status 200
  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(twiml);
};
