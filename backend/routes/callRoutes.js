// What this file does: Express router for all Twilio call-related endpoints.
//
// NEW ARCHITECTURE (Media Stream pipeline):
//   POST /api/call/make-call  → makeCall      — Frontend-triggered: places the outbound call
//   POST /api/call/voice      → voiceWebhook  — Twilio calls this when call connects;
//                                               returns <Connect><Stream> TwiML pointing to
//                                               wss://{host}/media-stream for real-time audio.
//   POST /api/call/process    → processInput  — OLD Gather flow (kept unused, harmless)
//   POST /api/call/status     → callStatus    — Twilio statusCallback: updates CallLog in DB
//
// The real-time voice conversation (STT → LLM → TTS) happens entirely in
// backend/services/mediaStreamHandler.js over WebSocket — not in these HTTP routes.

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

