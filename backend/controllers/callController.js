// What this file does: outbound Twilio call controller — makeCall, voiceWebhook,
// processInput (Gather callback/fallback), and callStatus (statusCallback receiver).
//
// ── ACTIVE CALL FLOW ──────────────────────────────────────────────────────────
//  makeCall  →  /api/call/voice-stream  →  <Connect><Stream>
//            →  wss://backend/media-stream  →  mediaStreamHandler.js
//            →  Sarvam STT + Groq LLM + Sarvam TTS  (real-time, natural speech)
//
// ── FALLBACK (Gather) FLOW ────────────────────────────────────────────────────
//  /api/call/voice  →  <Gather>  →  /api/call/process  →  Groq LLM  →  <Say>
//  Only used if the Media Stream path fails.
// ─────────────────────────────────────────────────────────────────────────────

const twilio   = require('twilio');
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

// ── Rate-limit map: phone_propertyId → timestamp of last call request ────────
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
const recentCalls   = new Map();

// ── Phone number validation ──────────────────────────────────────────────────
function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  const clean = phone.replace(/[\s\-().]/g, '');
  return /^\+[1-9]\d{6,14}$/.test(clean);
}

// ── Price formatter ──────────────────────────────────────────────────────────
function formatPrice(price) {
  if (!price) return 'price available on request';
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(1)} crore`;
  if (price >= 100_000)   return `${(price / 100_000).toFixed(0)} lakh`;
  return price.toLocaleString('en-IN');
}

// ── XML escaping for TwiML <Say> safety ─────────────────────────────────────
function xmlEscape(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/call/make-call
// Called by our React frontend — routes to the real-time Media Stream pipeline.
// ─────────────────────────────────────────────────────────────────────────────
exports.makeCall = async (req, res) => {
  const { phone, propertyId } = req.body;
  const activeBaseUrl   = process.env.BASE_URL;
  const activeFromPhone = process.env.TWILIO_PHONE;

  // Reject if BASE_URL is missing or localhost
  if (!activeBaseUrl || activeBaseUrl.includes('localhost') || activeBaseUrl.includes('127.0.0.1')) {
    console.error('[makeCall] BASE_URL is not a public URL:', activeBaseUrl);
    return res.status(500).json({
      error: 'Server misconfigured: BASE_URL must be a public HTTPS URL (Render). Twilio cannot reach localhost.',
    });
  }

  // Phone validation
  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({
      error: 'Invalid phone number. Use E.164 format, e.g. +91XXXXXXXXXX',
    });
  }
  const cleanPhone = phone.replace(/[\s\-().]/g, '');

  // Rate-limit check
  const rateLimitKey = `${cleanPhone}_${propertyId || ''}`;
  const lastCall = recentCalls.get(rateLimitKey);
  if (lastCall && Date.now() - lastCall < RATE_LIMIT_MS) {
    const waitSec = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastCall)) / 1000);
    return res.status(429).json({
      error: `Please wait ${waitSec}s before calling this number again.`,
    });
  }

  // Property lookup
  if (!propertyId) return res.status(400).json({ error: 'propertyId is required.' });
  let property;
  try {
    property = await Property.findById(propertyId);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid propertyId format.' });
  }
  if (!property) return res.status(404).json({ error: 'Property not found.' });

  if (!twilioClient) {
    return res.status(503).json({ error: 'Call service not configured. Contact support.' });
  }

  // ── Route to the real-time Media Stream pipeline ──────────────────────────
  // /api/call/voice-stream returns <Connect><Stream> TwiML which pipes audio
  // to wss://backend/media-stream → mediaStreamHandler.js for live STT+LLM+TTS.
  const voiceUrl          = `${activeBaseUrl}/api/call/voice-stream?propertyId=${propertyId}`;
  const statusCallbackUrl = `${activeBaseUrl}/api/call/status`;

  console.log("CALL URL:", voiceUrl);
  console.log('[makeCall] Routing call through Media Stream pipeline:', voiceUrl);

  try {
    const call = await twilioClient.calls.create({
      to:                   cleanPhone,
      from:                 activeFromPhone,
      url:                  voiceUrl,
      statusCallback:       statusCallbackUrl,
      statusCallbackMethod: 'POST',
    });

    recentCalls.set(rateLimitKey, Date.now());

    // Log to DB
    await CallLog.create({
      property:  propertyId,
      phone:     cleanPhone,
      callSid:   call.sid,
      status:    'initiated',
      timestamp: new Date(),
    });

    console.log(`[makeCall] Initiated call ${call.sid} → ${cleanPhone} (property: ${property.title})`);
    return res.json({
      success: true,
      callSid: call.sid,
      message: 'Call initiated. You should receive it shortly.',
    });
  } catch (err) {
    console.error('[makeCall] Twilio API error:', err.message);
    return res.status(502).json({ error: `Failed to initiate call: ${err.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/call/voice-stream  (Twilio webhook — real-time Media Stream)
// Returns <Connect><Stream> TwiML that opens a WebSocket to /media-stream.
// The mediaStreamHandler then drives the full STT → LLM → TTS pipeline.
// ─────────────────────────────────────────────────────────────────────────────
exports.voiceWebhookStream = async (req, res) => {
  console.log("VOICE-STREAM WEBHOOK HIT");
  const t0 = Date.now();
  const { VoiceResponse } = twilio.twiml;
  const twiml = new VoiceResponse();

  const propertyId  = req.query.propertyId || '';
  const callerPhone = req.body.From || req.query.From || '';
  const activeBaseUrl = process.env.BASE_URL || '';

  console.log(`[voiceWebhookStream] Twilio webhook received — propertyId: ${propertyId}, caller: ${callerPhone}`);

  // Build the WSS URL for the media stream endpoint
  let streamUrl = '';
  try {
    const wsUrl  = new URL(activeBaseUrl);
    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl.pathname = '/media-stream';
    streamUrl = wsUrl.toString();
  } catch (e) {
    console.error('[voiceWebhookStream] Could not parse BASE_URL for WSS:', e.message);
    const hostOnly = activeBaseUrl.replace(/^https?:\/\//, '');
    streamUrl = `wss://${hostOnly}/media-stream`;
  }

  // Absolute URL for the stream-ended action (Twilio requires absolute URLs)
  const streamEndedUrl = `${activeBaseUrl}/api/call/stream-ended`;

  console.log(`[voiceWebhookStream] WSS URL: ${streamUrl}`);

  // <Connect><Stream> — hands the call audio to our WebSocket handler
  const connect = twiml.connect({ action: streamEndedUrl, method: 'POST' });
  const stream  = connect.stream({ url: streamUrl });

  // Pass context through as custom parameters (read in mediaStreamHandler start event)
  if (propertyId)  stream.parameter({ name: 'propertyId',  value: propertyId });
  if (callerPhone) stream.parameter({ name: 'callerPhone', value: callerPhone });

  const twimlStr = twiml.toString();
  console.log(`[voiceWebhookStream] TwiML built in ${Date.now() - t0}ms:\n`, twimlStr);

  res.type('text/xml');
  return res.send(twimlStr);
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/call/stream-ended  (Twilio Connect action URL)
// Fires after the <Stream> ends (caller hangs up or stream disconnects).
// ─────────────────────────────────────────────────────────────────────────────
exports.streamEnded = async (req, res) => {
  const { VoiceResponse } = twilio.twiml;
  const twiml = new VoiceResponse();
  console.log('[streamEnded] Media stream ended. Hanging up. Body:', req.body);
  twiml.hangup();
  res.type('text/xml');
  return res.send(twiml.toString());
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/call/voice  (Twilio webhook — FALLBACK Gather-based flow)
// Used as a fallback only if the Media Stream path fails.
// Speaks a natural English greeting and opens a <Gather> for follow-up input.
// ─────────────────────────────────────────────────────────────────────────────
exports.voiceWebhook = async (req, res) => {
  const t0 = Date.now();
  const { VoiceResponse } = twilio.twiml;
  const twiml  = new VoiceResponse();
  const propertyId  = req.query.propertyId;

  console.log(`[voiceWebhook] Fallback Gather flow — propertyId: ${propertyId}`);

  let property = null;
  if (propertyId) {
    try {
      property = await Property.findById(propertyId);
    } catch (e) {
      console.warn('[voiceWebhook] Property lookup failed:', e.message);
    }
  }

  // Build a natural English greeting
  const title    = property?.title    || 'this property';
  const location = property?.location || 'a great location';
  const price    = property ? formatPrice(property.price) : 'available on request';
  const greeting = `Hi! I'm ATLAS, your real estate assistant. I'm calling about ${title} in ${location}, listed at ${price}. What would you like to know?`;

  // Use Amazon Polly Joanna-Neural — warm, natural, professional English voice
  twiml.say({ voice: 'Polly.Joanna-Neural' }, xmlEscape(greeting));

  // Gather: listen for speech or a keypress
  const activeBaseUrl = process.env.BASE_URL || '';
  const gather = twiml.gather({
    input:         'speech dtmf',
    action:        `${activeBaseUrl}/api/call/process?propertyId=${propertyId || ''}`,
    method:        'POST',
    speechTimeout: 'auto',
    timeout:       6,
    numDigits:     1,
  });
  gather.say({ voice: 'Polly.Joanna-Neural' }, 'Go ahead — I\'m listening.');

  // Fallback if no input detected
  twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Didn\'t catch that. Feel free to call back anytime. Goodbye!');
  twiml.hangup();

  console.log(`[voiceWebhook] TwiML built in ${Date.now() - t0}ms`);
  res.type('text/xml');
  return res.send(twiml.toString());
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/call/process  (Twilio Gather callback — FALLBACK only)
// Receives caller speech/DTMF, queries Groq, replies via <Say>.
// ─────────────────────────────────────────────────────────────────────────────
exports.processInput = async (req, res) => {
  const t0 = Date.now();
  const { VoiceResponse } = twilio.twiml;
  const twiml = new VoiceResponse();

  const speechResult = (req.body.SpeechResult || '').trim();
  const digits       = (req.body.Digits || '').trim();
  const propertyId   = req.query.propertyId;
  const callSid      = req.body.CallSid;
  const activeBaseUrl = process.env.BASE_URL || '';

  console.log(`[processInput] Twilio Gather callback — speech: "${speechResult}", digits: "${digits}", property: ${propertyId}, callSid: ${callSid}`);

  // Helper: re-open gather so the conversation continues
  const reGather = () => {
    const g = twiml.gather({
      input:         'speech dtmf',
      action:        `${activeBaseUrl}/api/call/process?propertyId=${propertyId || ''}`,
      method:        'POST',
      speechTimeout: 'auto',
      timeout:       6,
      numDigits:     1,
    });
    g.say({ voice: 'Polly.Joanna-Neural' }, 'Anything else I can help you with?');
  };

  // DTMF keypress — just ask them to speak
  if (digits && !speechResult) {
    twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Sure, go ahead and ask your question.');
    reGather();
    res.type('text/xml');
    return res.send(twiml.toString());
  }

  // No speech detected
  if (!speechResult) {
    twiml.say({ voice: 'Polly.Joanna-Neural' }, 'I didn\'t quite catch that. Could you say it again?');
    reGather();
    res.type('text/xml');
    return res.send(twiml.toString());
  }

  // Fetch property for context
  let property = null;
  if (propertyId) {
    try {
      property = await Property.findById(propertyId);
    } catch (e) {
      console.warn('[processInput] Property lookup failed:', e.message);
    }
  }

  // Fetch call history for conversational memory (last 6 turns)
  let history = [];
  try {
    const callLog = await CallLog.findOne({ callSid });
    if (callLog?.transcript) {
      try { history = JSON.parse(callLog.transcript); } catch (_) {}
    }
  } catch (dbErr) {
    console.warn('[processInput] CallLog fetch failed:', dbErr.message);
  }

  // Build natural system prompt
  const propInfo = property
    ? `Property: "${property.title}" in ${property.location}, priced at ₹${formatPrice(property.price)}, ${property.bhk} BHK${property.sqft ? ', ' + property.sqft + ' sqft' : ''}. Features: ${(property.features || []).join(', ')}.`
    : 'Property details are currently unavailable.';

  const systemPrompt = `You are ATLAS, a calm, friendly real estate assistant on a live phone call.
${propInfo}

Rules — follow exactly:
1. Answer immediately and directly. Never say "please wait", "hold on", "one moment", or "it's taking time".
2. Keep every reply to 1–2 short sentences. This is a phone call — be concise.
3. Sound like a helpful, knowledgeable friend — not a brochure or a robot.
4. Use natural contractions: "I'll", "it's", "you'll", "we've", etc.
5. Answer only questions about this property and real estate. For unrelated topics, politely decline.
6. If you don't know something, say so naturally and offer to connect them with the team.
7. Do NOT mention that you are an AI unless explicitly asked.`;

  // Call Groq with the fastest model
  const GROQ_KEY = process.env.GROQ_API_KEY;
  let replyText  = "I'd be happy to connect you with our team for more details on that.";

  if (GROQ_KEY) {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6),              // last 3 exchanges (6 messages)
      { role: 'user', content: speechResult },
    ];

    const groqStart = Date.now();
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model:       'llama-3.1-8b-instant',   // fastest Groq model
          messages,
          max_tokens:  120,
          temperature: 0.65,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        replyText = data.choices?.[0]?.message?.content?.trim() || replyText;
        console.log(`[processInput] Groq response in ${Date.now() - groqStart}ms: "${replyText}"`);
      } else {
        const errText = await response.text();
        console.error(`[processInput] Groq error ${response.status}:`, errText);
      }
    } catch (fetchErr) {
      console.error('[processInput] Groq fetch failed:', fetchErr.message);
    }
  } else {
    console.warn('[processInput] GROQ_API_KEY not set — using static fallback');
  }

  // Save updated transcript to DB
  history.push({ role: 'user', content: speechResult });
  history.push({ role: 'assistant', content: replyText });
  try {
    await CallLog.findOneAndUpdate(
      { callSid },
      { $set: { transcript: JSON.stringify(history.slice(-20)) } }, // keep last 10 turns
      { upsert: false }
    );
  } catch (dbErr) {
    console.warn('[processInput] CallLog update failed:', dbErr.message);
  }

  // Respond with natural Polly voice
  twiml.say({ voice: 'Polly.Joanna-Neural' }, xmlEscape(replyText));
  reGather();

  console.log(`[processInput] Total handler time: ${Date.now() - t0}ms`);
  res.type('text/xml');
  return res.send(twiml.toString());
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/call/status  (Twilio statusCallback)
// ─────────────────────────────────────────────────────────────────────────────
exports.callStatus = async (req, res) => {
  const { CallSid, CallStatus, To } = req.body;

  if (!CallSid) return res.status(400).send();

  try {
    await CallLog.findOneAndUpdate(
      { callSid: CallSid },
      { $set: { callSid: CallSid, status: CallStatus || 'unknown', phone: To || '', timestamp: new Date() } },
      { upsert: true, new: true }
    );
    console.log(`[callStatus] ${CallSid} → ${CallStatus}`);
  } catch (err) {
    console.error('[callStatus] DB upsert failed:', err.message);
  }

  return res.status(200).send();
};
