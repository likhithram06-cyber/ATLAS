// What this file does: Express middleware that verifies incoming POST requests
// genuinely came from Twilio by checking the X-Twilio-Signature header.
// Applied to /voice, /process, and /status routes — never to /make-call,
// which is called by our own React frontend (not by Twilio).

const twilio = require('twilio');

module.exports = function twilioValidate(req, res, next) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const baseUrl   = process.env.BASE_URL;

  // Gracefully bypass validation in development mode (non-production) or if explicitly requested via environment variables
  if (process.env.NODE_ENV !== 'production' || process.env.BYPASS_TWILIO_VALIDATION === 'true') {
    console.log('[twilioValidate] Bypassing Twilio signature validation in development mode');
    return next();
  }

  if (!authToken || !baseUrl) {
    console.error('[twilioValidate] Error: missing Twilio configuration');
    res.type('text/xml');
    return res.status(200).send(`
      <Response>
        <Say>Configuration error. Twilio credentials not configured.</Say>
        <Reject />
      </Response>
    `);
  }

  // Reconstruct the full URL Twilio used when making this request without double-slashes
  const urlPath = req.originalUrl || req.url;
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanUrlPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  const fullUrl = `${cleanBaseUrl}${cleanUrlPath}`;

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
    
    // Return status 200 with valid TwiML XML to allow Twilio to play the validation error description
    res.type('text/xml');
    return res.status(200).send(`
      <Response>
        <Say>Security validation failed. Access denied.</Say>
        <Reject />
      </Response>
    `);
  }

  next();
};

