// What this file does: outbound Twilio call controller — makeCall, voiceWebhook,
// processInput (Gather callback), and callStatus (statusCallback receiver).
//
// ── CONCURRENCY & ISOLATION ──
// This file is used for the turn-based Gather/Speech/DTMF flow.
// We also preserve the real-time WebSocket Media Stream flow (voiceWebhookStream)
// for testing and fallback purposes.
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

// ── Rate-limit map: phone_propertyId → timestamp of last call request ──────────
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
const recentCalls   = new Map();      // key → Date.now() of last request

// ── Phone number validation ──────────────────────────────────────────────────
// Accepts: +91XXXXXXXXXX  |  +1XXXXXXXXXX  |  any E.164 (7–15 digits after +)
function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  const clean = phone.replace(/[\s\-().]/g, '');
  return /^\+[1-9]\d{6,14}$/.test(clean);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/call/make-call
// Called by our React frontend — NOT a Twilio webhook (no validation required)
// ─────────────────────────────────────────────────────────────────────────────
exports.makeCall = async (req, res) => {
  const { phone, propertyId } = req.body;

  const activeBaseUrl = process.env.BASE_URL;
  const activeFromPhone = process.env.TWILIO_PHONE;

  // Safety guard: reject if BASE_URL is missing or contains localhost/127.0.0.1
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

  // 2. Rate-limit check (keyed by phone AND propertyId)
  const rateLimitKey = `${cleanPhone}_${propertyId || ''}`;
  const lastCall = recentCalls.get(rateLimitKey);
  if (lastCall && Date.now() - lastCall < RATE_LIMIT_MS) {
    const waitSec = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastCall)) / 1000);
    return res.status(429).json({
      error: `Please wait ${waitSec} seconds before requesting another call to this number for this property.`,
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

  console.log("[makeCall] Outbound voice webhook URL:", voiceUrl);

  try {
    const call = await twilioClient.calls.create({
      to:             cleanPhone,
      from:           activeFromPhone,
      url:            voiceUrl,
      statusCallback: statusCallbackUrl,
      statusCallbackMethod: 'POST',
    });

    recentCalls.set(rateLimitKey, Date.now());

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
// Generates TwiML greeting with robust TTS fallbacks and Gather configuration.
// ─────────────────────────────────────────────────────────────────────────────
exports.voiceWebhook = async (req, res) => {
  const propertyId = req.query.propertyId;
  const callerPhone = req.body.From || req.query.From || '';
  let property = null;

  console.log(`[voiceWebhook] Call connected. PropertyId: ${propertyId}, CallerPhone: ${callerPhone}`);

  let greetingText = '';
  let audioPlayed = false;
  let audioPublicUrl = '';

  try {
    // 1. Pull property details safely from MongoDB (properly awaited first)
    if (propertyId) {
      try {
        property = await Property.findById(propertyId);
      } catch (e) {
        console.warn('[voiceWebhook] Could not fetch property from MongoDB:', e.message);
      }
    }

    const propTitle    = property?.title    || 'ATLAS రియల్ ఎస్టేట్';
    const propLocation = property?.location || 'మంచి ప్రాంతం';
    const propPrice    = property ? formatPrice(property.price) : 'అందుబాటులో ఉంది';
    
    greetingText = `హలో! ATLAS రియల్ ఎస్టేట్‌కు స్వాగతం. నేను ${propTitle} గురించి మాట్లాడుతున్నాను, ఇది ${propLocation} లో ఉంది, దీని ధర ${propPrice}. నేను మీకు ఎలా సహాయం చేయగలను?`;

    // Guard: Ensure text passed to Say is never empty/whitespace
    if (!greetingText || typeof greetingText !== 'string' || !greetingText.trim()) {
      greetingText = 'హలో! ATLAS రియల్ ఎస్టేట్‌కు స్వాగతం. నేను మీకు ఎలా సహాయం చేయగలను?';
    }

    // ── Attempt Telugu TTS via external service (properly awaited first) ──
    const ttsUrl = process.env.TELUGU_TTS_URL;
    if (ttsUrl && ttsUrl !== 'http://localhost:5000/api/mock-tts') {
      try {
        console.log(`[voiceWebhook] Requesting external Telugu TTS: ${ttsUrl}`);
        const ttsResponse = await axios.post(
          ttsUrl,
          { text: greetingText, language: 'te-IN' },
          { responseType: 'arraybuffer', timeout: 3000 }
        );

        // Save audio temporarily and serve it
        const audioFilename = `tts-${Date.now()}.mp3`;
        const audioPath     = path.join(__dirname, '..', 'temp_uploads', audioFilename);
        
        // Ensure folder exists
        const dir = path.join(__dirname, '..', 'temp_uploads');
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(audioPath, Buffer.from(ttsResponse.data));

        const activeBaseUrl = process.env.BASE_URL || '';
        audioPublicUrl = `${activeBaseUrl}/api/call/tts-audio/${audioFilename}`;
        audioPlayed = true;
        console.log(`[voiceWebhook] Playing external TTS audio URL: ${audioPublicUrl}`);

        // Auto-delete after 60 seconds
        setTimeout(() => { 
          try { 
            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath); 
          } catch (e) { /* ignore */ } 
        }, 60_000);
      } catch (ttsErr) {
        console.warn('[voiceWebhook] Telugu TTS failed, falling back to Twilio built-in TTS:', ttsErr.message);
      }
    }

    // ── NOW we construct the TwiML response (all async operations completed!) ──
    const { VoiceResponse } = twilio.twiml;
    const twiml = new VoiceResponse();

    if (audioPlayed && audioPublicUrl) {
      twiml.play(audioPublicUrl);
    } else {
      console.log('[voiceWebhook] Playing built-in Twilio Telugu TTS (Google.te-IN-Standard-A)');
      twiml.say(
        { voice: 'Google.te-IN-Standard-A', language: 'te-IN' },
        xmlEscape(greetingText)
      );
    }

    // ── Configure Gather to support both Speech AND DTMF ──
    const activeBaseUrl = process.env.BASE_URL || '';
    const gather = twiml.gather({
      input:      'speech dtmf',
      action:     `${activeBaseUrl}/api/call/process?propertyId=${propertyId || ''}`,
      method:     'POST',
      language:   'te-IN',
      speechTimeout: 'auto',
      timeout:    5,
      numDigits:  1,
    });

    gather.say(
      { voice: 'Google.te-IN-Standard-A', language: 'te-IN' },
      xmlEscape('దయచేసి మీ ప్రశ్నను అడగండి లేదా కీప్యాడ్‌లో ఏదైనా బటన్ నొక్కండి.')
    );

    // Fallback if caller says/does nothing
    twiml.say({ voice: 'Google.te-IN-Standard-A', language: 'te-IN' }, xmlEscape('క్షమించండి, మాకు ఎటువంటి స్పందన రాలేదు. సెలవు!'));
    twiml.hangup();

    const twimlStr = twiml.toString();
    console.log('[voiceWebhook] Final TwiML Response:\n', twimlStr);

    res.type('text/xml');
    return res.send(twimlStr);

  } catch (err) {
    console.error('[voiceWebhook] Error in voiceWebhook handler:', err);
    // Fallback error-handler response
    const { VoiceResponse } = twilio.twiml;
    const fallbackTwiml = new VoiceResponse();
    fallbackTwiml.say({ voice: 'Google.te-IN-Standard-A', language: 'te-IN' }, xmlEscape('సాంకేతిక లోపం ఏర్పడింది. దయచేసి తర్వాత మళ్ళీ ప్రయత్నించండి.'));
    fallbackTwiml.hangup();
    
    const fallbackStr = fallbackTwiml.toString();
    console.log('[voiceWebhook] Final Fallback TwiML Response:\n', fallbackStr);
    
    res.type('text/xml');
    return res.send(fallbackStr);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/call/process  (Twilio Gather callback — Twilio validates this)
// Receives caller's speech input / DTMF keypress and replies using Groq LLM
// ─────────────────────────────────────────────────────────────────────────────
exports.processInput = async (req, res) => {
  const { VoiceResponse } = twilio.twiml;
  const twiml = new VoiceResponse();

  const speechResult = req.body.SpeechResult || '';
  const digits       = req.body.Digits || '';
  const propertyId   = req.query.propertyId;
  const callSid      = req.body.CallSid;

  console.log(`[processInput] Incoming input. Speech: "${speechResult}", Digits: "${digits}", Property: ${propertyId}, CallSid: ${callSid}`);

  // Handle DTMF Keypress (DTMF keypad input)
  if (digits) {
    console.log(`[processInput] User pressed DTMF key: ${digits}. Prompting them to speak.`);
    twiml.say({ voice: 'Google.te-IN-Standard-A', language: 'te-IN' }, xmlEscape("మీరు కీప్యాడ్ బటన్ నొక్కారు. దయచేసి మీ ప్రశ్నను నోటితో అడగండి."));
    
    // Re-trigger Gather for speech/DTMF
    const activeBaseUrl = process.env.BASE_URL || '';
    twiml.gather({
      input: 'speech dtmf',
      action: `${activeBaseUrl}/api/call/process?propertyId=${propertyId || ''}`,
      method: 'POST',
      language: 'te-IN',
      speechTimeout: 'auto',
      timeout: 5,
      numDigits: 1,
    });
    
    res.type('text/xml');
    return res.send(twiml.toString());
  }

  // Handle empty input
  if (!speechResult.trim()) {
    console.log('[processInput] Empty speech result. Asking caller to speak again.');
    twiml.say({ voice: 'Google.te-IN-Standard-A', language: 'te-IN' }, xmlEscape("నేను వినలేకపోయాను. దయచేసి మళ్ళీ మాట్లాడండి."));
    const activeBaseUrl = process.env.BASE_URL || '';
    twiml.gather({
      input: 'speech dtmf',
      action: `${activeBaseUrl}/api/call/process?propertyId=${propertyId || ''}`,
      method: 'POST',
      language: 'te-IN',
      speechTimeout: 'auto',
      timeout: 5,
      numDigits: 1,
    });
    res.type('text/xml');
    return res.send(twiml.toString());
  }

  try {
    // 1. Fetch CallLog and Property safely from MongoDB
    let callLog = null;
    try {
      callLog = await CallLog.findOne({ callSid: callSid });
    } catch (dbErr) {
      console.warn('[processInput] CallLog query failed:', dbErr.message);
    }

    let transcriptArr = [];
    if (callLog && callLog.transcript) {
      try { 
        transcriptArr = JSON.parse(callLog.transcript); 
      } catch (e) {
        console.warn('[processInput] Parsing call log transcript failed, starting fresh');
      }
    }
    
    let property = null;
    if (propertyId) {
      try {
        property = await Property.findById(propertyId);
      } catch (e) {
        console.warn('[processInput] Property lookup failed:', e.message);
      }
    }

    // 2. Add user speech to transcript
    transcriptArr.push({ role: 'user', content: speechResult });

    // 3. System Prompt for Groq
    const propTitle    = property?.title    || 'ATLAS రియల్ ఎస్టేట్';
    const propLocation = property?.location || 'మంచి ప్రాంతం';
    const propPrice    = property ? formatPrice(property.price) : 'అందుబాటులో ఉంది';
    const systemPrompt = `You are ATLAS, a warm and professional AI property assistant speaking on a phone call. Answer concisely (1-2 sentences maximum). 
    IMPORTANT: You must speak in Telugu, written in Telugu script. Do not default to English.
    Property Details: ${propTitle} | Location: ${propLocation} | Price: ${propPrice} | ${property?.bhk || ''} BHK. 
    Features: ${property?.features?.join(', ') || ''} | ${property?.description || ''}
    If asked to book a visit or contact details, say the agent will follow up shortly. Keep it conversational.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...transcriptArr
    ];

    let replyText = "క్షమించండి, నాకు అర్థం కాలేదు. మళ్ళీ చెప్పండి."; // Default fallback reply

    // 4. Request completion from Groq API with timeout and fallback
    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (GROQ_KEY && GROQ_KEY !== 'your_groq_key' && GROQ_KEY !== '') {
      try {
        console.log('[processInput] Sending conversation history to Groq chat completions...');
        const chatRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: 'llama3-8b-8192',
          messages,
          max_tokens: 150,
          temperature: 0.7
        }, {
          headers: {
            'Authorization': `Bearer ${GROQ_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 4000 // 4 seconds timeout to keep connection responsive
        });
        
        replyText = chatRes.data.choices?.[0]?.message?.content || replyText;
        console.log(`[processInput] Groq response: "${replyText}"`);
      } catch (groqErr) {
        console.error('[processInput] Groq API call failed or timed out:', groqErr.message);
        replyText = "సమాచారం కనుగొనడంలో కొంచెం సమయం పడుతోంది. దయచేసి మళ్ళీ అడగండి."; // Friendly Telugu fallback
      }
    } else {
      console.warn('[processInput] Groq API key is missing. Using local static fallback.');
      replyText = "AI సేవ ప్రస్తుతం అందుబాటులో లేదు. దయచేసి తర్వాత మళ్ళీ ప్రయత్నించండి.";
    }

    // 5. Add assistant reply to transcript & Save safely to DB
    transcriptArr.push({ role: 'assistant', content: replyText });
    if (callLog) {
      try {
        callLog.transcript = JSON.stringify(transcriptArr);
        await callLog.save();
        console.log('[processInput] CallLog transcript updated in MongoDB');
      } catch (dbSaveErr) {
        console.error('[processInput] CallLog save failed:', dbSaveErr.message);
      }
    }

    // 6. Respond via Twilio using supported voice
    twiml.say({ voice: 'Google.te-IN-Standard-A', language: 'te-IN' }, xmlEscape(replyText));

    // Keep the call open to gather the next response
    const activeBaseUrl = process.env.BASE_URL || '';
    twiml.gather({
      input: 'speech dtmf',
      action: `${activeBaseUrl}/api/call/process?propertyId=${propertyId || ''}`,
      method: 'POST',
      language: 'te-IN',
      speechTimeout: 'auto',
      timeout: 5,
      numDigits: 1,
    });

  } catch (err) {
    console.error('[processInput] Uncaught exception in processInput handler:', err);
    twiml.say({ voice: 'Google.te-IN-Standard-A', language: 'te-IN' }, xmlEscape("సాంకేతిక లోపం. దయచేసి తర్వాత మళ్ళీ ప్రయత్నించండి."));
    twiml.hangup();
  }

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
// PRESERVED WEB CELL SOCKET OUTBOUND WEBHOOK (From Part 2 - mediaStreamHandler)
// Keep this endpoint to preserve low-latency stream connections if needed!
// ─────────────────────────────────────────────────────────────────────────────
exports.voiceWebhookStream = async (req, res) => {
  const { VoiceResponse } = twilio.twiml;
  const twiml = new VoiceResponse();

  const propertyId  = req.query.propertyId || '';
  const callerPhone = req.body.From || req.query.From || '';
  const activeBaseUrl = process.env.BASE_URL || '';

  let streamUrl = '';
  try {
    const wsUrl = new URL(activeBaseUrl);
    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl.pathname = '/media-stream';
    streamUrl = wsUrl.toString();
  } catch (e) {
    console.error("[voiceWebhookStream] Error parsing BASE_URL:", e.message);
    const hostOnly = activeBaseUrl.replace(/^https?:\/\//, '');
    streamUrl = `wss://${hostOnly}/media-stream`;
  }

  const connect = twiml.connect({ action: '/api/call/stream-ended' });
  const stream  = connect.stream({ url: streamUrl });
  if (propertyId) {
    stream.parameter({ name: 'propertyId', value: propertyId });
  }
  if (callerPhone) {
    stream.parameter({ name: 'callerPhone', value: callerPhone });
  }

  twiml.say({ voice: 'Google.te-IN-Standard-A', language: 'te-IN' }, "సాంకేతిక అనుసంధానం చేయడంలో సమస్య ఎదురైంది. దయచేసి తర్వాత ప్రయత్నించండి.");
  twiml.hangup();

  console.log("[voiceWebhookStream] Stream URL:", streamUrl);
  res.type('text/xml');
  return res.send(twiml.toString());
};

exports.streamEnded = async (req, res) => {
  const { VoiceResponse } = twilio.twiml;
  const twiml = new VoiceResponse();
  console.log("[streamEnded] Connect stream ended. Twilio request body:", req.body);
  twiml.say({ voice: 'Google.te-IN-Standard-A', language: 'te-IN' }, "కాల్ ముగిసింది. ధన్యవాదాలు!");
  twiml.hangup();
  res.type('text/xml');
  return res.send(twiml.toString());
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

// Helper — XML escaping for TwiML <Say> text safety
function xmlEscape(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}


