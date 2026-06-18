// What this file does: outbound Twilio call controller — makeCall, voiceWebhook,
// processInput (Gather callback), and callStatus (statusCallback receiver).
//
// ─────────────────────────────────────────────────────────────────────────────
// LOCAL TESTING:
//   1. Install ngrok: https://ngrok.com/download
//   2. Run `ngrok http 5000` in a separate terminal.
//   3. Copy the HTTPS forwarding URL (e.g. https://abc123.ngrok-free.app)
//      and paste it into BASE_URL in backend/.env.
//   4. No manual Twilio Console webhook setup is needed for OUTBOUND calls
//      triggered by this button — the `url` param in calls.create() handles
//      routing for outbound calls automatically.
//   5. If you later want users to CALL IN to the Twilio number directly
//      (i.e. dialing +16893027112 themselves), go to:
//      Twilio Console → Phone Numbers → Manage → +16893027112
//      → Voice Configuration → "A call comes in" → Webhook
//      → {BASE_URL}/api/call/voice → HTTP POST
//
// PRODUCTION READINESS:
//   - Replace the ngrok BASE_URL with your real deployed domain (e.g. Railway, Render).
//   - Move TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN to a secrets manager (AWS Secrets
//     Manager, Doppler, etc.) rather than a plain .env file.
//   - For Indian outbound calling at scale, verify A2P/TRAI / DND compliance and
//     confirm your Twilio number is approved for calls to +91 numbers.
//   - Add structured logging (Winston, Datadog) on call failure rates so you can
//     alert when error rates spike.
// ─────────────────────────────────────────────────────────────────────────────

const twilio  = require('twilio');
const axios   = require('axios');
const path    = require('path');
const fs      = require('fs');
const Property = require('../models/Property');
const CallLog  = require('../models/CallLog');

// ── Twilio client (created once at module load) ─────────────────────────────
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const fromPhone  = process.env.TWILIO_PHONE;
const baseUrl    = process.env.BASE_URL;

let twilioClient;
try {
  twilioClient = twilio(accountSid, authToken);
} catch (e) {
  console.warn('[callController] Twilio client init skipped — credentials not set yet.');
}

// ── Rate-limit map: phone → timestamp of last call request ──────────────────
// NOTE: This in-memory map is fine for single-instance development.
// For multi-instance (Kubernetes, ECS, etc.) deployments, move this to Redis
// or a MongoDB TTL collection so all instances share the same state.
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
const recentCalls   = new Map();      // phone → Date.now() of last request

// ── Phone number validation ──────────────────────────────────────────────────
// Accepts: +91XXXXXXXXXX  |  +1XXXXXXXXXX  |  any E.164 (7–15 digits after +)
// Rejects: too short, non-numeric garbage, plain 10-digit without country code
function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  // Strip spaces and dashes for the check
  const clean = phone.replace(/[\s\-().]/g, '');
  return /^\+[1-9]\d{6,14}$/.test(clean);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/call/make-call
// Called by our React frontend — NOT a Twilio webhook (no validation required)
// ─────────────────────────────────────────────────────────────────────────────
exports.makeCall = async (req, res) => {
  const { phone, propertyId } = req.body;

  // Retrieve env variables dynamically
  const activeBaseUrl = process.env.BASE_URL;
  const activeFromPhone = process.env.TWILIO_PHONE;

  // Safety net guard: reject if BASE_URL is missing or contains localhost/127.0.0.1
  if (!activeBaseUrl || activeBaseUrl.includes('localhost') || activeBaseUrl.includes('127.0.0.1')) {
    console.error('[makeCall] Attempted call but BASE_URL is set to localhost:', activeBaseUrl);
    return res.status(500).json({
      error: 'Server misconfigured: BASE_URL not set to a public URL. Twilio cannot reach this server. Set BASE_URL to your ngrok HTTPS URL before making calls.',
    });
  }

  // 1. Phone validation
  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({
      error: 'Invalid phone number. Please enter a valid number with country code, e.g. +91XXXXXXXXXX',
    });
  }

  const cleanPhone = phone.replace(/[\s\-().]/g, '');

  // 2. Rate-limit check
  const lastCall = recentCalls.get(cleanPhone);
  if (lastCall && Date.now() - lastCall < RATE_LIMIT_MS) {
    const waitSec = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastCall)) / 1000);
    return res.status(429).json({
      error: `Please wait ${waitSec} seconds before requesting another call to this number.`,
    });
  }

  // 3. Property lookup
  if (!propertyId) {
    return res.status(400).json({ error: 'propertyId is required.' });
  }
  let property;
  try {
    property = await Property.findById(propertyId);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid propertyId format.' });
  }
  if (!property) {
    return res.status(404).json({ error: 'Property not found.' });
  }

  // 4. Twilio availability check
  if (!twilioClient) {
    return res.status(503).json({ error: 'Call service is not configured. Please contact support.' });
  }

  // 5. Place the call
  const voiceUrl      = `${activeBaseUrl}/api/call/voice?propertyId=${propertyId}`;
  const statusCallbackUrl = `${activeBaseUrl}/api/call/status`;

  // Log the final constructed webhook URL so the user/developer can visually confirm
  console.log("Voice webhook URL:", voiceUrl);

  try {
    const call = await twilioClient.calls.create({
      to:             cleanPhone,
      from:           activeFromPhone,
      url:            voiceUrl,
      statusCallback: statusCallbackUrl,
      statusCallbackMethod: 'POST',
    });

    // Record in rate-limit map
    recentCalls.set(cleanPhone, Date.now());

    // Create initial call log in DB
    await CallLog.create({
      property:  propertyId,
      phone:     cleanPhone,
      callSid:   call.sid,
      status:    'initiated',
      timestamp: new Date(),
    });

    console.log(`[makeCall] Initiated call ${call.sid} → ${cleanPhone} for property ${property.title}`);
    return res.json({ success: true, callSid: call.sid, message: 'You should receive a call shortly. Check your phone!' });

  } catch (err) {
    console.error('[makeCall] Twilio API error:', err.message);
    return res.status(502).json({
      error: `Failed to initiate call: ${err.message || 'Twilio API error'}`,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/call/voice   (Twilio webhook — Twilio validates requests here)
// Generates TwiML greeting for the outbound call
// ─────────────────────────────────────────────────────────────────────────────
exports.voiceWebhook = async (req, res) => {
  const { VoiceResponse } = twilio.twiml;
  const twiml = new VoiceResponse();

  const propertyId = req.query.propertyId;
  let property = null;

  // Pull property from MongoDB
  if (propertyId) {
    try {
      property = await Property.findById(propertyId);
    } catch (e) {
      console.warn('[voiceWebhook] Could not fetch property:', e.message);
    }
  }

  const propTitle    = property?.title    || 'this property';
  const propLocation = property?.location || 'the location';
  const propPrice    = property ? formatPrice(property.price) : 'available';
  const greetingText = `Hello! Welcome to ATLAS Real Estate. You expressed interest in ${propTitle}, located in ${propLocation}, priced at ${propPrice}. I am your AI property assistant. Please tell me your question about this property.`;

  // ── Try Telugu TTS first ───────────────────────────────────────────────────
  let audioPlayed = false;
  const ttsUrl = process.env.TELUGU_TTS_URL;

  if (ttsUrl) {
    try {
      const ttsResponse = await axios.post(
        ttsUrl,
        { text: greetingText, language: 'te-IN' },
        { responseType: 'arraybuffer', timeout: 5000 }
      );

      // Save audio temporarily and serve it
      const audioFilename = `tts-${Date.now()}.mp3`;
      const audioPath     = path.join(__dirname, '..', 'temp_uploads', audioFilename);
      fs.writeFileSync(audioPath, Buffer.from(ttsResponse.data));

      const activeBaseUrl = process.env.BASE_URL || '';
      const audioPublicUrl = `${activeBaseUrl}/api/call/tts-audio/${audioFilename}`;
      twiml.play(audioPublicUrl);
      audioPlayed = true;

      // Auto-delete after 60 seconds
      setTimeout(() => { try { fs.unlinkSync(audioPath); } catch (e) { /* ignore */ } }, 60_000);
    } catch (ttsErr) {
      console.warn('[voiceWebhook] Telugu TTS failed, falling back to Polly.Aditi:', ttsErr.message);
    }
  }

  // ── Fallback: AWS Polly Aditi (hi-IN, Indian accent English) ─────────────
  if (!audioPlayed) {
    twiml.say(
      { voice: 'Polly.Aditi', language: 'hi-IN' },
      greetingText
    );
  }

  // ── Gather caller's speech response ──────────────────────────────────────
  const activeBaseUrl = process.env.BASE_URL || '';
  const gather = twiml.gather({
    input:      'speech',
    action:     `${activeBaseUrl}/api/call/process?propertyId=${propertyId || ''}`,
    method:     'POST',
    language:   'te-IN',           // Whisper-quality speech recognition
    speechTimeout: 'auto',
    timeout:    5,
  });

  gather.say(
    { voice: 'Polly.Aditi', language: 'hi-IN' },
    'Please ask your question after the tone.'
  );

  // Fallback if caller says nothing
  twiml.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 'We did not hear anything. Goodbye!');
  twiml.hangup();

  res.type('text/xml');
  return res.send(twiml.toString());
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/call/process  (Twilio Gather callback — Twilio validates this)
// Receives caller's speech input and replies
// ─────────────────────────────────────────────────────────────────────────────
exports.processInput = async (req, res) => {
  const { VoiceResponse } = twilio.twiml;
  const twiml = new VoiceResponse();

  const speechResult = req.body.SpeechResult || '';
  const propertyId   = req.query.propertyId;

  console.log(`[processInput] Speech: "${speechResult}" for property: ${propertyId}`);

  // TODO: Route speechResult through an NLP layer (Groq/LLaMA) for smarter responses.
  // For now, acknowledge and close the call gracefully.
  twiml.say(
    { voice: 'Polly.Aditi', language: 'hi-IN' },
    `Thank you for your query. Our team has noted your interest and will follow up with you shortly. Goodbye!`
  );
  twiml.hangup();

  res.type('text/xml');
  return res.send(twiml.toString());
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/call/status  (Twilio statusCallback — Twilio validates this)
// Upserts a CallLog record with the latest call status
// ─────────────────────────────────────────────────────────────────────────────
exports.callStatus = async (req, res) => {
  const { CallSid, CallStatus, To } = req.body;

  if (!CallSid) {
    return res.status(400).send();
  }

  try {
    await CallLog.findOneAndUpdate(
      { callSid: CallSid },
      {
        $set: {
          callSid:   CallSid,
          status:    CallStatus || 'unknown',
          phone:     To || '',
          timestamp: new Date(),
        },
      },
      { upsert: true, new: true }
    );
    console.log(`[callStatus] ${CallSid} → ${CallStatus}`);
  } catch (err) {
    console.error('[callStatus] DB upsert failed:', err.message);
  }

  // Twilio just needs a 200 ACK — no body required
  return res.status(200).send();
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper — price formatter (same logic as frontend formatPrice utility)
// ─────────────────────────────────────────────────────────────────────────────
function formatPrice(price) {
  if (!price) return 'price on request';
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(1)} Crore rupees`;
  if (price >= 100_000)    return `${(price / 100_000).toFixed(0)} Lakh rupees`;
  return `${price.toLocaleString('en-IN')} rupees`;
}
