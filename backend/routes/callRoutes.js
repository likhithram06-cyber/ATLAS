// What this file does: Express router for all Twilio call-related endpoints.
//
// ── ACTIVE CALL FLOW ──────────────────────────────────────────────────────────
//   POST /api/call/make-call   → makeCall           — Frontend initiates outbound call
//   POST /api/call/voice-stream → voiceWebhookStream — Twilio calls this on connect;
//                                                      returns <Connect><Stream> TwiML
//                                                      → wss://backend/media-stream
//                                                      → mediaStreamHandler.js (STT+LLM+TTS)
//   POST /api/call/stream-ended → streamEnded        — Fires when stream disconnects
//   POST /api/call/status       → callStatus         — Twilio statusCallback
//
// ── FALLBACK FLOW (Gather-based, if Media Stream fails) ──────────────────────
//   POST /api/call/voice    → voiceWebhook  — <Gather> greeting (Polly.Joanna-Neural)
//   POST /api/call/process  → processInput  — Gather callback → Groq → <Say>
//
// Real-time conversation runs in backend/services/mediaStreamHandler.js over WSS.

const express        = require('express');
const twilioValidate = require('../middleware/twilioValidate');
const {
  makeCall,
  voiceWebhook,
  processInput,
  callStatus,
  streamEnded,
  voiceWebhookStream,
} = require('../controllers/callController');

const router = express.Router();

// ── Frontend-initiated call request (our own React app — no Twilio validation) ──
router.post('/make-call', makeCall);

// ── Twilio webhooks (protected by Twilio signature validation) ───────────────
// /voice   → returns <Gather> TwiML (turn-based Gather speech/DTMF flow)
// /process → Gather callback (process speech/DTMF input and query Groq LLM)
// /status  → statusCallback to update CallLog DB record
// /voice-stream → returns <Connect><Stream> TwiML (real-time WebSocket media stream flow)
// /stream-ended → Twilio Connect action URL
router.post('/voice',        twilioValidate, voiceWebhook);
router.post('/process',      twilioValidate, processInput);
router.post('/status',       twilioValidate, callStatus);
router.post('/voice-stream', twilioValidate, voiceWebhookStream);
router.post('/stream-ended', twilioValidate, streamEnded);

module.exports = router;

