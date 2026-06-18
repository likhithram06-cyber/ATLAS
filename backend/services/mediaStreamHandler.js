// What this file does: Real-time voice pipeline for Twilio Media Streams.
// Pipeline: Twilio audio → Sarvam STT → Groq LLM (streaming) → Sarvam TTS → Twilio audio
//
// DESIGN GOALS:
//  • Natural, human-sounding responses — no filler, no "please wait"
//  • First-word latency under 1.5 s (STT end → LLM first token → TTS first chunk)
//  • Full barge-in support (caller can interrupt the agent mid-sentence)
//  • Per-call isolation — all state is scoped to the CallSession closure
//
// ── CONCURRENCY CONSTRAINT ────────────────────────────────────────────────────
// NEVER use module-level mutable state for call data.
// Each WebSocket connection creates its own isolated CallSession object.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const WebSocket    = require('ws');
const Property     = require('../models/Property');
const CallRecord   = require('../models/CallRecord');
const alawmulaw    = require('alawmulaw');
const { SarvamAIClient } = require('sarvamai');

// ── Groq config ─────────────────────────────────────────────────────────────
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// llama-3.1-8b-instant: Groq's fastest model — sub-200ms first-token on short prompts
const GROQ_MODEL   = 'llama-3.1-8b-instant';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatPrice(price) {
  if (!price) return 'price available on request';
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(1)} crore`;
  if (price >= 100_000)    return `${(price / 100_000).toFixed(0)} lakh`;
  return price.toLocaleString('en-IN');
}

// ── Natural greeting — warm, direct, no corporate filler ────────────────────
function buildGreeting(property) {
  if (!property) {
    return "Hi! I'm ATLAS, your real estate assistant. What can I help you with today?";
  }
  const price = formatPrice(property.price);
  return `Hi! I'm ATLAS. I'm reaching out about ${property.title} in ${property.location} — it's listed at ₹${price}. What would you like to know?`;
}

// ── System prompt — natural human assistant persona ──────────────────────────
function buildSystemPrompt(property) {
  const propInfo = property
    ? `Property on call: "${property.title}" in ${property.location}, ₹${formatPrice(property.price)}, ${property.bhk} BHK${property.sqft ? ', ' + property.sqft + ' sqft' : ''}${property.features?.length ? ', features: ' + property.features.join(', ') : ''}.`
    : 'Property details are currently unavailable.';

  return `You are ATLAS, a calm, intelligent real estate assistant on a live phone call.
${propInfo}

Your core rules — follow these exactly on every single reply:

1. RESPOND IMMEDIATELY. Never say "please wait", "one moment", "hold on", "it's taking time", or any variation. Just answer.
2. KEEP IT SHORT. 1–2 sentences maximum per reply. This is a phone call — people hate long monologues.
3. SOUND HUMAN. Use contractions naturally ("I'll", "it's", "you'd", "we've"). Speak like a knowledgeable friend, not a brochure.
4. ANSWER DIRECTLY. Start your reply with the answer, not with "Great question!" or "Sure, I can help with that."
5. STAY ON TOPIC. Only answer questions about this property and real estate. For anything unrelated, politely say you can only help with property questions.
6. MATCH THE CALLER'S LANGUAGE. If they speak Telugu, respond in Telugu. Hindi → Hindi. Code-mixed → match naturally. Default to English if unsure.
7. DON'T PRETEND TO BE HUMAN if directly asked whether you're AI — be honest but brief.
8. END WITH A NATURAL FOLLOW-UP — a short question to keep the conversation moving.

Examples of what NOT to say:
❌ "Please wait while I look that up."
❌ "That is a great question! Let me process that for you."
❌ "I am an AI assistant and I will do my best to help."

Examples of what to say:
✓ "It's priced at 45 lakh. Would you like to schedule a visit?"
✓ "The property has parking and a gym. Anything else?"
✓ "I'll have the agent reach out to you — what's the best time?"`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO CONVERSION  Twilio mulaw 8kHz → PCM 16-bit LE 16kHz for Sarvam STT
// ─────────────────────────────────────────────────────────────────────────────
function twilioMulawToSarvamPCM(base64Payload) {
  const mulawBytes = Buffer.from(base64Payload, 'base64');
  const pcm8k      = alawmulaw.mulaw.decode(mulawBytes);  // Int16Array @ 8kHz

  // Naive 8kHz → 16kHz upsample by sample duplication (fine for speech STT)
  const pcm16k = new Int16Array(pcm8k.length * 2);
  for (let i = 0; i < pcm8k.length; i++) {
    pcm16k[i * 2]     = pcm8k[i];
    pcm16k[i * 2 + 1] = pcm8k[i];
  }
  return Buffer.from(pcm16k.buffer);
}

// ─────────────────────────────────────────────────────────────────────────────
// TWILIO AUDIO HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function sendAudioToTwilio(twilioWs, streamSid, base64MulawPayload) {
  if (twilioWs.readyState !== WebSocket.OPEN) return;
  try {
    twilioWs.send(JSON.stringify({
      event:    'media',
      streamSid,
      media:    { payload: base64MulawPayload },
    }));
  } catch (err) {
    console.error('[twilio-send] Failed to send audio frame:', err.message);
  }
}

function clearTwilioAudio(twilioWs, streamSid) {
  if (twilioWs.readyState !== WebSocket.OPEN) return;
  try {
    twilioWs.send(JSON.stringify({ event: 'clear', streamSid }));
    console.log('[barge-in] Cleared Twilio audio buffer — agent interrupted');
  } catch (err) {
    console.error('[twilio-clear] Failed to send clear:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROQ STREAMING — async generator, yields sentence-level chunks immediately
// ─────────────────────────────────────────────────────────────────────────────
async function* streamGroqResponse(messages) {
  const t0 = Date.now();
  let firstTokenLogged = false;

  console.log('[groq] Starting streaming request to', GROQ_MODEL);

  let response;
  try {
    response = await fetch(GROQ_API_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages,
        stream:      true,
        max_tokens:  80,        // concise phone answers — shorter = faster TTS
        temperature: 0.65,
      }),
    });
  } catch (err) {
    console.error('[groq] Network error:', err.message);
    throw err;
  }

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`[groq] HTTP ${response.status}:`, errBody);
    throw new Error(`Groq error ${response.status}`);
  }

  const reader    = response.body.getReader();
  const decoder   = new TextDecoder();
  let   sseBuffer = '';
  let   textBuf   = '';

  while (true) {
    let done, value;
    try {
      ({ done, value } = await reader.read());
    } catch (readErr) {
      console.error('[groq] Stream read error:', readErr.message);
      break;
    }
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split('\n');
    sseBuffer   = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json  = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (!delta) continue;

        if (!firstTokenLogged) {
          console.log(`[groq] ⚡ First token in ${Date.now() - t0}ms`);
          firstTokenLogged = true;
        }

        textBuf += delta;

        // Flush at sentence boundaries so TTS can start while LLM is still running
        const match = textBuf.match(/^([\s\S]*?[.!?,।|])\s/);
        if (match) {
          const chunk = match[1].trim();
          textBuf = textBuf.slice(match[0].length);
          if (chunk) {
            console.log(`[groq] → Sentence chunk: "${chunk}"`);
            yield chunk;
          }
        }
      } catch (_) { /* malformed SSE line — skip */ }
    }
  }

  // Flush any remaining text
  const remaining = textBuf.trim();
  if (remaining) {
    console.log(`[groq] → Final chunk: "${remaining}"`);
    yield remaining;
  }

  console.log(`[groq] ✅ Stream complete in ${Date.now() - t0}ms`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SPEAK TEXT — sends one text chunk to Sarvam TTS, resolves when spoken
// ─────────────────────────────────────────────────────────────────────────────
function speakText(text, session) {
  return new Promise((resolve) => {
    if (!session.ttsSocket || session.ttsSocket.readyState !== 1) {
      console.warn('[tts] Socket not open, skipping text:', text);
      return resolve();
    }

    console.log(`[tts] → Synthesizing: "${text}"`);
    session.ttsResolve    = resolve;
    session.isTtsSpeaking = true;

    try {
      session.ttsSocket.convert(text);
    } catch (err) {
      console.error('[tts-convert] convert() failed:', err.message);
      session.isTtsSpeaking = false;
      session.ttsResolve    = null;
      resolve();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL UTTERANCE HANDLER — runs after Sarvam STT signals end-of-speech
// ─────────────────────────────────────────────────────────────────────────────
async function handleFinalUtterance(utterance, session, twilioWs) {
  const t0 = Date.now();
  console.log(`[pipeline] 🎤 Caller said: "${utterance}"`);
  session.conversationHistory.push({ role: 'user', content: utterance });

  // Persist caller utterance to DB
  if (session.recordId) {
    CallRecord.findByIdAndUpdate(session.recordId, {
      $push: { transcript: { speaker: 'caller', text: utterance, timestamp: new Date() } }
    }).catch((err) => console.warn('[db] Caller utterance save failed:', err.message));
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt(session.property) },
    ...session.conversationHistory.slice(-12),  // keep last 6 exchanges
  ];

  let agentReply = '';
  const llmStart = Date.now();

  try {
    for await (const chunk of streamGroqResponse(messages)) {
      if (session.bargedIn) {
        console.log('[barge-in] LLM stream stopped — caller interrupted');
        break;
      }

      // Dynamically reconfigure TTS language if caller switched languages
      if (session.detectedLanguage && session.detectedLanguage !== session.currentTtsLang) {
        console.log(`[tts] Language switch: ${session.currentTtsLang} → ${session.detectedLanguage}`);
        session.currentTtsLang = session.detectedLanguage;
        try {
          session.ttsSocket.configureConnection({
            target_language_code: session.detectedLanguage,
            speaker:              'aditya',
            model:                'bulbul:v3',
            speech_sample_rate:   8000,
            output_audio_codec:   'mulaw',
          });
        } catch (e) {
          console.error('[tts-reconfig] Failed:', e.message);
        }
      }

      // Pipe chunk to TTS immediately — overlaps LLM + TTS latency
      await speakText(chunk, session);
      agentReply += (agentReply ? ' ' : '') + chunk;

      if (session.bargedIn) break;
    }
  } catch (err) {
    console.error('[pipeline] LLM/TTS pipeline error:', err.message);
  }

  const replyTime = Date.now() - t0;
  console.log("GROQ RESPONSE:", agentReply.trim());
  console.log(`[pipeline] ✅ Full reply delivered in ${replyTime}ms — "${agentReply.trim()}"`);

  if (agentReply.trim()) {
    session.conversationHistory.push({ role: 'assistant', content: agentReply.trim() });

    // Persist agent reply to DB
    if (session.recordId) {
      CallRecord.findByIdAndUpdate(session.recordId, {
        $push: { transcript: { speaker: 'agent', text: agentReply.trim(), timestamp: new Date() } }
      }).catch((err) => console.warn('[db] Agent reply save failed:', err.message));
    }
  }

  session.isTtsSpeaking = false;
  session.bargedIn      = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// SARVAM SOCKETS SETUP — STT and TTS WebSocket connections
// ─────────────────────────────────────────────────────────────────────────────
async function initSarvamSockets(session, twilioWs) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    console.error('[sarvam] SARVAM_API_KEY not set — voice pipeline disabled');
    return;
  }

  const sarvam = new SarvamAIClient({ apiSubscriptionKey: apiKey });

  // ── STT (Speech-to-Text) ─────────────────────────────────────────────────
  console.log('[stt] Connecting Sarvam STT...');
  const sttSocket = await sarvam.speechToTextStreaming.connect({
    'Api-Subscription-Key': apiKey,
    'language-code':        'unknown',   // auto-detect Telugu/Hindi/English
    model:                  'saaras:v3', // flagship model for streaming STT
    input_audio_codec:      'pcm_s16le',
    sample_rate:            '16000',
    vad_signals:            true,
    high_vad_sensitivity:   true,
  });
  session.sttSocket = sttSocket;
  await sttSocket.waitForOpen();
  console.log('[stt] ✅ STT connected');

  sttSocket.on('message', (msg) => {
    try {
      if (msg.type === 'events') {
        const signal = msg.data?.signal_type;

        if (signal === 'START_SPEECH') {
          console.log('[stt] 🎙️  Speech start');
          // Barge-in: caller started speaking while agent was talking
          if (session.isTtsSpeaking) {
            session.bargedIn = true;
            clearTwilioAudio(twilioWs, session.streamSid);
            try { session.ttsSocket?.flush(); } catch (_) {}
            session.isTtsSpeaking = false;
            if (session.ttsResolve) {
              const r = session.ttsResolve;
              session.ttsResolve = null;
              r();
            }
            console.log('[barge-in] ✅ Agent interrupted');
          }

        } else if (signal === 'END_SPEECH') {
          console.log('[stt] 🎙️  Speech end');
          const utterance = (session.currentTranscript || '').trim();
          console.log("FINAL TRANSCRIPT:", utterance);
          session.currentTranscript = '';
          if (utterance.length >= 2) {
            handleFinalUtterance(utterance, session, twilioWs).catch((err) =>
              console.error('[stt] handleFinalUtterance error:', err.message)
            );
          }
        }

      } else if (msg.type === 'data') {
        if (msg.data?.transcript) {
          session.currentTranscript = msg.data.transcript;
          // Only log every 5th update to avoid log spam
          if (!session._sttLogCount) session._sttLogCount = 0;
          if (++session._sttLogCount % 5 === 0) {
            console.log(`[stt] Transcript: "${session.currentTranscript}"`);
          }
        }
        if (msg.data?.language_code) {
          session.detectedLanguage = msg.data.language_code;
        }
      }
    } catch (err) {
      console.error('[stt-message] Handler error:', err);
    }
  });

  sttSocket.on('close',  (e) => console.log('[stt] Connection closed, code:', e?.code));
  sttSocket.on('error',  (e) => console.error('[stt] Error:', e));

  // ── TTS (Text-to-Speech) ─────────────────────────────────────────────────
  console.log('[tts] Connecting Sarvam TTS...');
  const ttsSocket = await sarvam.textToSpeechStreaming.connect({
    'Api-Subscription-Key': apiKey,
    model:                  'bulbul:v3',
    send_completion_event:  'true',
  });
  session.ttsSocket = ttsSocket;
  await ttsSocket.waitForOpen();
  console.log('[tts] ✅ TTS connected');

  // Initial configuration — English (will reconfigure on language detection)
  ttsSocket.configureConnection({
    target_language_code: 'en-IN',
    speaker:              'aditya',
    model:                'bulbul:v3',
    speech_sample_rate:   8000,
    output_audio_codec:   'mulaw',
  });
  console.log('[tts] Configured: en-IN / aditya / mulaw @ 8kHz');

  ttsSocket.on('message', (msg) => {
    try {
      if (session.bargedIn) return; // caller interrupted — drop this audio

      if (msg.type === 'audio') {
        const audioB64 = msg.data?.audio;
        if (audioB64) {
          sendAudioToTwilio(twilioWs, session.streamSid, audioB64);
          console.log("TTS SENT");
        }

      } else if (msg.type === 'event' && msg.data?.event_type === 'final') {
        console.log('[tts] ✅ Chunk playback complete');
        session.isTtsSpeaking = false;
        if (session.ttsResolve) {
          const r = session.ttsResolve;
          session.ttsResolve = null;
          r();
        }

      } else if (msg.type === 'error') {
        console.error('[tts] Server error:', msg.data?.message);
        session.isTtsSpeaking = false;
        if (session.ttsResolve) {
          const r = session.ttsResolve;
          session.ttsResolve = null;
          r();
        }
      }
    } catch (err) {
      console.error('[tts-message] Handler error:', err);
    }
  });

  ttsSocket.on('close', (e) => {
    console.log('[tts] Connection closed, code:', e?.code);
    session.isTtsSpeaking = false;
    if (session.ttsResolve) { const r = session.ttsResolve; session.ttsResolve = null; r(); }
  });

  ttsSocket.on('error', (e) => {
    console.error('[tts] Error:', e);
    session.isTtsSpeaking = false;
    if (session.ttsResolve) { const r = session.ttsResolve; session.ttsResolve = null; r(); }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP — close upstream connections when call ends
// ─────────────────────────────────────────────────────────────────────────────
function cleanup(session) {
  try { if (session.sttSocket) session.sttSocket.close(); } catch (_) {}
  try { if (session.ttsSocket) session.ttsSocket.close(); } catch (_) {}
  console.log(`[session] Ended — callSid: ${session.callSid}, property: ${session.propertyId}`);
}

async function finalizeCallRecord(session, status) {
  if (!session.recordId) return;
  try {
    const record = await CallRecord.findById(session.recordId);
    if (record && record.status !== 'completed' && record.status !== 'failed') {
      record.status  = status;
      record.endedAt = new Date();
      await record.save();
      console.log(`[db] CallRecord ${session.recordId} finalized: ${status}`);
    }
  } catch (err) {
    console.error('[db-finalize] Failed:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — called once per incoming Twilio Media Stream WebSocket
// ─────────────────────────────────────────────────────────────────────────────
async function handleMediaStream(twilioWs) {
  console.log("TWILIO WS CONNECTED");
  const connectionStart = Date.now();
  console.log('[media-stream] 🔌 New Twilio Media Stream connection');

  // Per-connection isolated session — NEVER module-level state
  const CallSession = {
    streamSid:           null,
    callSid:             null,
    propertyId:          null,
    property:            null,
    callerPhone:         null,
    recordId:            null,
    isTtsSpeaking:       false,
    bargedIn:            false,
    ttsSocket:           null,
    sttSocket:           null,
    currentTranscript:   '',
    detectedLanguage:    null,
    conversationHistory: [],
    ttsResolve:          null,
    currentTtsLang:      'en-IN',
    _sttLogCount:        0,
  };

  twilioWs.session = CallSession;

  twilioWs.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      console.error('[media-stream] Bad JSON from Twilio:', e.message);
      return;
    }

    try {
      switch (msg.event) {

        // ── Connected ─────────────────────────────────────────────────────
        case 'connected':
          console.log('[twilio] "connected" event received');
          break;

        // ── Start ─────────────────────────────────────────────────────────
        case 'start': {
          CallSession.streamSid   = msg.streamSid;
          CallSession.callSid     = msg.start?.callSid;
          CallSession.propertyId  = msg.start?.customParameters?.propertyId  || null;
          CallSession.callerPhone = msg.start?.customParameters?.callerPhone || null;

          console.log(`[twilio] 🚀 Stream started — SID: ${CallSession.streamSid}, callSid: ${CallSession.callSid}, propertyId: ${CallSession.propertyId}`);

          // Create DB record
          try {
            const record = await CallRecord.create({
              callSid:    CallSession.callSid,
              streamSid:  CallSession.streamSid,
              propertyId: CallSession.propertyId,
              callerPhone: CallSession.callerPhone,
              status:     'initiated',
              startedAt:  new Date(),
            });
            CallSession.recordId = record._id;
            console.log('[db] CallRecord created:', CallSession.recordId);
          } catch (dbErr) {
            console.warn('[db] CallRecord create failed:', dbErr.message);
          }

          // Load property for LLM context
          if (CallSession.propertyId) {
            try {
              CallSession.property = await Property.findById(CallSession.propertyId).lean();
              console.log('[twilio] Property loaded:', CallSession.property?.title);
            } catch (e) {
              console.warn('[twilio] Property fetch failed:', e.message);
            }
          }

          // Open Sarvam STT + TTS sockets
          try {
            await initSarvamSockets(CallSession, twilioWs);
          } catch (initErr) {
            console.error('[sarvam] Init failed — ending session:', initErr.message);
            await finalizeCallRecord(CallSession, 'failed');
            cleanup(CallSession);
            return;
          }

          // Update DB status
          if (CallSession.recordId) {
            CallRecord.findByIdAndUpdate(CallSession.recordId, { status: 'in-progress' })
              .catch((e) => console.warn('[db] Status update failed:', e.message));
          }

          // Speak greeting immediately — agent talks first
          const greeting = buildGreeting(CallSession.property);
          console.log(`[twilio] 🗣️  Speaking greeting: "${greeting}"`);

          speakText(greeting, CallSession).then(async () => {
            CallSession.conversationHistory.push({ role: 'assistant', content: greeting });
            if (CallSession.recordId) {
              CallRecord.findByIdAndUpdate(CallSession.recordId, {
                $push: { transcript: { speaker: 'agent', text: greeting, timestamp: new Date() } }
              }).catch((e) => console.warn('[db] Greeting save failed:', e.message));
            }
            const elapsed = Date.now() - connectionStart;
            console.log(`[twilio] ✅ Greeting delivered — ${elapsed}ms from connection open`);
          }).catch((err) => {
            console.error('[greeting] Error speaking greeting:', err.message);
          });

          break;
        }

        // ── Media (audio frames from caller) ──────────────────────────────
        case 'media': {
          console.log("MEDIA EVENT RECEIVED");
          const payload = msg.media?.payload;
          if (!payload || !CallSession.sttSocket) return;

          try {
            const pcmBuffer = twilioMulawToSarvamPCM(payload);
            if (CallSession.sttSocket.readyState === 1) {
              // Send JSON-wrapped base64 payload as expected by Sarvam SDK & WebSocket API
              CallSession.sttSocket.transcribe({
                audio:       pcmBuffer.toString('base64'),
                sample_rate: 16000,
                encoding:    'pcm_s16le',
              });
            }
          } catch (err) {
            console.error('[audio] Conversion/send error:', err.message);
          }
          break;
        }

        // ── Stop ──────────────────────────────────────────────────────────
        case 'stop':
          console.log('[twilio] "stop" event — call ended');
          await finalizeCallRecord(CallSession, 'completed');
          cleanup(CallSession);
          break;

        default:
          break;
      }
    } catch (eventErr) {
      console.error(`[media-stream] Exception processing "${msg.event}":`, eventErr);
      await finalizeCallRecord(CallSession, 'failed');
      cleanup(CallSession);
    }
  });

  twilioWs.on('close', async (code, reason) => {
    console.log(`[twilio] WebSocket closed — code: ${code}, reason: ${reason || 'none'}`);
    await finalizeCallRecord(CallSession, 'completed');
    cleanup(CallSession);
  });

  twilioWs.on('error', async (err) => {
    console.error('[twilio] WebSocket error:', err.message);
    await finalizeCallRecord(CallSession, 'failed');
    cleanup(CallSession);
  });
}

module.exports = { handleMediaStream };
