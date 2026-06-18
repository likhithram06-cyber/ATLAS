// What this file does: Express middleware that verifies incoming POST requests
// genuinely came from Twilio by checking the X-Twilio-Signature header.
// Applied to /voice, /process, and /status routes — never to /make-call,
// which is called by our own React frontend (not by Twilio).

const twilio = require('twilio');

module.exports = function twilioValidate(req, res, next) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const baseUrl   = process.env.BASE_URL;

  if (!authToken || !baseUrl) {
    // Env vars missing — reject rather than silently pass
    return res.status(500).json({ error: 'Twilio credentials not configured' });
  }

  // Reconstruct the full URL Twilio used when making this request
  const urlPath = req.originalUrl || req.url;
  const fullUrl = `${baseUrl}${urlPath}`;

  const signature = req.headers['x-twilio-signature'] || '';

  // req.body is already parsed at this point — for Twilio webhooks that's the
  // urlencoded POST body. Pass it as-is; twilio.validateRequest handles both
  // URL-encoded and empty bodies correctly.
  const isValid = twilio.validateRequest(authToken, signature, fullUrl, req.body || {});

  if (!isValid) {
    console.warn('[twilioValidate] Rejected request with invalid Twilio signature:', {
      url: fullUrl,
      signature: signature?.slice(0, 20) + '…',
    });
    return res.status(403).json({ error: 'Twilio signature validation failed' });
  }

  next();
};
