// What this file does: Real-time voice pipeline handler for Twilio Media Streams.
// Bridges Twilio <-> Sarvam AI STT <-> Groq LLM <-> Sarvam AI TTS for low-latency,
// multilingual (Telugu / Hindi / English / code-mixed) voice conversations.
// Using the official sarvamai Node.js SDK.
//
// ── CONCURRENCY & ISOLATION CONSTRAINT ───────────────────────────────────────
// NEVER store call-specific state in module-level variables — always scope to
// the per-connection CallSession. Each connection creates its own isolated
// session stored directly on the WebSocket object (ws.session = CallSession)
// and kept inside block-scoped closures to guarantee correct call isolation.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const WebSocket = require('ws');
const Property  = require('../models/Property');
const CallRecord = require('../models/CallRecord');
const alawmulaw = require('alawmulaw');
const { SarvamAIClient } = require('sarvamai');

// ── Groq config ─────────────────────────────────────────────────────────────
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama3-8b-8192';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatPrice(price) {
  if (!price) return 'price on request';
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(1)} crore`;
  if (price >= 100_000)   return `${(price / 100_000).toFixed(0)} lakh`;
  return String(price.toLocaleString('en-IN'));
}

function buildGreeting(property) {
  if (!property) return 'Hello! Welcome to ATLAS Real Estate. How can I help you today?';
  return `Hello! Welcome to ATLAS. I am calling about ${property.title} in ${property.location}, priced at ${formatPrice(property.price)}. How can I help you today?`;
}

function buildSystemPrompt(property) {
  const propInfo = property
    ? `Property: "${property.title}" in ${property.location}, priced at ${formatPrice(property.price)}, ${property.bhk} BHK${property.sqft ? ', ' + property.sqft + ' sqft' : ''}.`
    : 'Property details are currently unavailable.';

  return `You are ATLAS, a warm, conversational real estate assistant on a live phone call.
${propInfo}

CRITICAL RULES — follow these exactly:
1. Reply ONLY in the language the caller used. Telugu -> Telugu, Hindi -> Hindi, code-mixed -> match naturally. Never default to English if they did not use it.
2. Keep every reply to 1-3 SHORT sentences. This is a phone call — brevity is essential.
3. Sound like a helpful friend, not a brochure. Use natural phrasing with commas for pacing.
4. Only speak about the property, its details, and real-estate enquiries. You MUST NOT answer any other questions unrelated to the property or real estate. If the caller asks about unrelated topics (e.g., general knowledge, unrelated math, news, personal questions), politely decline to answer, stating that you can only help with questions about this property.
5. If asked about price, location, BHK, or features, answer directly from the property info.
6. If you do not know something about the property, say so naturally and offer to connect them with the team.
7. End each response with a brief, natural question to continue the conversation.`;
}

// ── Audio: Twilio mulaw 8kHz base64 -> PCM 16-bit LE 16kHz Buffer for Sarvam STT
function twilioMulawToSarvamPCM(base64Payload) {
  try {
    const mulawBytes = Buffer.from(base64Payload, 'base64');
    const inputSize = mulawBytes.length;

    // Decode u-law -> linear 16-bit PCM at 8kHz
    const pcm8k = alawmulaw.mulaw.decode(mulawBytes); // returns Int16Array

    // Upsample 8kHz -> 16kHz by duplicating each sample (naive but fine for speech STT)
    const pcm16k = new Int16Array(pcm8k.length * 2);
    for (let i = 0; i < pcm8k.length; i++) {
      pcm16k[i * 2]     = pcm8k[i];
      pcm16k[i * 2 + 1] = pcm8k[i];
    }
    const outputBuffer = Buffer.from(pcm16k.buffer);
    const outputSize = outputBuffer.length;

    // Diagnostic log for the first few audio frames to confirm conversion and sizes
    if (!twilioMulawToSarvamPCM.logCount) twilioMulawToSarvamPCM.logCount = 0;
    if (twilioMulawToSarvamPCM.logCount < 5) {
      twilioMulawToSarvamPCM.logCount++;
      console.log(`[audio-conv] twilioMulawToSarvamPCM: input size=${inputSize} bytes, output size=${outputSize} bytes`);
    }

    return outputBuffer;
  } catch (err) {
    console.error('[audio-conv] Failed to convert Twilio mulaw to Sarvam PCM:', err);
    throw err;
  }
}

function sendAudioToTwilio(twilioWs, streamSid, base64MulawPayload) {
  try {
    if (twilioWs.readyState !== WebSocket.OPEN) return;
    twilioWs.send(JSON.stringify({
      event:     'media',
      streamSid,
      media:     { payload: base64MulawPayload },
    }));
  } catch (err) {
    console.error('[twilio-send] Failed to send media frame to Twilio:', err.message);
  }
}

function clearTwilioAudio(twilioWs, streamSid) {
  try {
    if (twilioWs.readyState !== WebSocket.OPEN) return;
    twilioWs.send(JSON.stringify({ event: 'clear', streamSid }));
    console.log('[barge-in] Sent clear to Twilio — agent audio interrupted');
  } catch (err) {
    console.error('[twilio-clear] Failed to send clear message to Twilio:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROQ STREAMING — async generator that yields sentence-level text chunks
// ─────────────────────────────────────────────────────────────────────────────
async function* streamGroqResponse(messages) {
  const t0 = Date.now();
  let firstToken = true;

  console.log('[groq] Initiating chat completions request...');
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
        max_tokens:  150,
        temperature: 0.7,
      }),
    });
  } catch (fetchErr) {
    console.error('[groq] Network error making Groq API request:', fetchErr);
    throw fetchErr;
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[groq] API error response ${response.status}:`, errText);
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }

  console.log('[groq] Stream request succeeded (status 200). Beginning token stream parsing...');
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let   sseBuffer = '';
  let   textBuf   = '';  // accumulate tokens; flush per sentence/clause

  while (true) {
    let done, value;
    try {
      const result = await reader.read();
      done = result.done;
      value = result.value;
    } catch (readErr) {
      console.error('[groq] Error reading from stream body:', readErr.message);
      break;
    }
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split('\n');
    sseBuffer   = lines.pop(); // keep the potentially-incomplete last line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json  = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (!delta) continue;

        if (firstToken) {
          console.log(`[groq] First token received in ${Date.now() - t0}ms`);
          firstToken = false;
        }

        textBuf += delta;

        // Flush complete sentence/clause (ends with . ! ? , — or Devanagari danda |)
        // Yielding early means TTS can start before Groq finishes the full reply.
        const match = textBuf.match(/^([\s\S]*?[.!?,।|])\s/);
        if (match) {
          const chunk = match[1].trim();
          textBuf = textBuf.slice(match[0].length);
          if (chunk) {
            console.log(`[groq] Yielding text clause: "${chunk}"`);
            yield chunk;
          }
        }
      } catch (jsonErr) {
        // Malformed SSE line — skip silently
      }
    }
  }

  // Flush any remaining text that didn't end with punctuation
  if (textBuf.trim()) {
    console.log(`[groq] Yielding remaining text: "${textBuf.trim()}"`);
    yield textBuf.trim();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SPEAK TEXT — convert one text chunk, await until fully spoken
// ─────────────────────────────────────────────────────────────────────────────
function speakText(text, session) {
  return new Promise((resolve) => {
    if (!session.ttsSocket || session.ttsSocket.readyState !== 1) {
      console.warn('[tts] Socket not open, cannot speak text:', text);
      return resolve();
    }

    session.ttsResolve = resolve;
    session.isTtsSpeaking = true;
    console.log(`[tts] Sending text to synthesize: "${text}"`);
    try {
      session.ttsSocket.convert(text);
    } catch (err) {
      console.error('[tts-convert] Failed to call session.ttsSocket.convert:', err.message);
      session.isTtsSpeaking = false;
      session.ttsResolve = null;
      resolve();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL UTTERANCE HANDLER — runs after STT signals end-of-speech
// ─────────────────────────────────────────────────────────────────────────────
async function handleFinalUtterance(utterance, session, twilioWs) {
  console.log(`[stt] Final utterance: "${utterance}"`);
  session.conversationHistory.push({ role: 'user', content: utterance });

  // Push caller utterance to DB CallRecord
  if (session.recordId) {
    try {
      await CallRecord.findByIdAndUpdate(session.recordId, {
        $push: {
          transcript: {
            speaker: 'caller',
            text: utterance,
            timestamp: new Date(),
          }
        }
      });
      console.log('[stt] Persisted caller utterance to DB');
    } catch (dbErr) {
      console.error('[stt-db] Failed to push caller utterance to DB:', dbErr.message);
    }
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt(session.property) },
    ...session.conversationHistory,
  ];

  let agentReply = '';

  try {
    for await (const chunk of streamGroqResponse(messages)) {
      // If caller interrupted mid-reply, stop sending
      if (session.bargedIn) {
        console.log('[barge-in] LLM stream aborted mid-sentence');
        break;
      }

      // Check if language needs to be updated based on detected language of utterance
      if (session.detectedLanguage && session.detectedLanguage !== session.currentTtsLang) {
        console.log(`[tts] Detected language change: ${session.currentTtsLang} -> ${session.detectedLanguage}`);
        session.currentTtsLang = session.detectedLanguage;
        if (session.ttsSocket) {
          try {
            session.ttsSocket.configureConnection({
              target_language_code: session.detectedLanguage,
              speaker: "aditya",
              model: "bulbul:v3",
              speech_sample_rate: 8000,
              output_audio_codec: "mulaw",
            });
          } catch (configErr) {
            console.error('[tts-reconfig] Failed to reconfigure TTS target language:', configErr.message);
          }
        }
      }

      // Send this sentence to TTS immediately (overlap LLM + TTS latency)
      await speakText(chunk, session);
      agentReply += (agentReply ? ' ' : '') + chunk;

      if (session.bargedIn) break;
    }
  } catch (err) {
    console.error('[pipeline] LLM/TTS error:', err.message);
  }

  // Record agent reply in history even if partially spoken
  if (agentReply.trim()) {
    session.conversationHistory.push({ role: 'assistant', content: agentReply.trim() });

    // Push agent reply to DB CallRecord
    if (session.recordId) {
      try {
        await CallRecord.findByIdAndUpdate(session.recordId, {
          $push: {
            transcript: {
              speaker: 'agent',
              text: agentReply.trim(),
              timestamp: new Date(),
            }
          }
        });
        console.log('[pipeline] Persisted agent reply to DB');
      } catch (dbErr) {
        console.error('[pipeline-db] Failed to push agent reply to DB:', dbErr.message);
      }
    }
  }

  session.isTtsSpeaking = false;
  session.bargedIn      = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// SARVAM SOCKETS SETUP
// ─────────────────────────────────────────────────────────────────────────────
async function initSarvamSockets(session, twilioWs) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    console.error('[sarvam] SARVAM_API_KEY not set — voice pipeline will not function');
    return;
  }

  const sarvam = new SarvamAIClient({ apiSubscriptionKey: apiKey });

  try {
    console.log('[sarvam] Connecting STT...');
    const sttSocket = await sarvam.speechToTextStreaming.connect({
      "Api-Subscription-Key": apiKey,
      "language-code": "unknown",
      model: "saarika:v2.5",
      input_audio_codec: "pcm_s16le",
      sample_rate: "16000",
      vad_signals: true,
      high_vad_sensitivity: true,
    });
    session.sttSocket = sttSocket;
    await sttSocket.waitForOpen();
    console.log('[stt] Sarvam STT WebSocket connected and opened successfully');

    sttSocket.on('message', (msg) => {
      try {
        if (msg.type === 'events') {
          const signal = msg.data?.signal_type;
          console.log('[stt] Received event signal:', signal);
          if (signal === 'START_SPEECH') {
            console.log('[stt] Speech start detected');
            if (session.isTtsSpeaking) {
              session.bargedIn = true;
              clearTwilioAudio(twilioWs, session.streamSid);
              if (session.ttsSocket) {
                try {
                  session.ttsSocket.flush();
                } catch (flushErr) {
                  console.error('[tts-flush] Error calling ttsSocket.flush():', flushErr.message);
                }
              }
              session.isTtsSpeaking = false;
              if (session.ttsResolve) {
                const resolve = session.ttsResolve;
                session.ttsResolve = null;
                resolve();
              }
              console.log('[barge-in] Interrupted agent speaking');
            }
          } else if (signal === 'END_SPEECH') {
            console.log('[stt] Speech end detected');
            if (session.currentTranscript && session.currentTranscript.trim().length >= 2) {
              const utterance = session.currentTranscript.trim();
              session.currentTranscript = ''; // reset for next turn
              handleFinalUtterance(utterance, session, twilioWs).catch((err) => {
                console.error('[stt-utterance] Error handling final utterance:', err.message);
              });
            }
          }
        } else if (msg.type === 'data') {
          const transcript = msg.data?.transcript;
          if (transcript) {
            session.currentTranscript = transcript;
            console.log(`[stt] Transcript update: "${transcript}"`);
          }
          if (msg.data?.language_code) {
            session.detectedLanguage = msg.data.language_code;
          }
        }
      } catch (msgErr) {
        console.error('[stt-message-handler] Error handling STT socket message:', msgErr);
      }
    });

    sttSocket.on('close', (event) => console.log('[stt] Sarvam STT connection closed, code:', event?.code || 'none'));
    sttSocket.on('error', (err) => console.error('[stt] Sarvam STT error event:', err));

  } catch (err) {
    console.error('[stt] Failed to initialize STT socket:', err);
    throw err;
  }

  try {
    console.log('[sarvam] Connecting TTS...');
    const ttsSocket = await sarvam.textToSpeechStreaming.connect({
      "Api-Subscription-Key": apiKey,
      model: "bulbul:v3",
      send_completion_event: "true",
    });
    session.ttsSocket = ttsSocket;
    await ttsSocket.waitForOpen();
    console.log('[tts] Sarvam TTS WebSocket connected and opened successfully');

    try {
      ttsSocket.configureConnection({
        target_language_code: "en-IN",
        speaker: "aditya",
        model: "bulbul:v3",
        speech_sample_rate: 8000,
        output_audio_codec: "mulaw",
      });
      console.log('[tts] Configured initial target language (en-IN) and mulaw output format');
    } catch (confErr) {
      console.error('[tts-config] Failed to send connection configuration:', confErr.message);
      throw confErr;
    }

    ttsSocket.on('message', (msg) => {
      try {
        if (session.bargedIn) return;

        if (msg.type === 'audio') {
          const audioB64 = msg.data?.audio;
          if (audioB64) {
            const audioSize = Buffer.from(audioB64, 'base64').length;
            if (!ttsSocket.audioLogCount) ttsSocket.audioLogCount = 0;
            if (ttsSocket.audioLogCount < 5) {
              ttsSocket.audioLogCount++;
              console.log(`[tts] Received audio frame: size=${audioSize} bytes`);
            }
            sendAudioToTwilio(twilioWs, session.streamSid, audioB64);
          }
        } else if (msg.type === 'event' && msg.data?.event_type === 'final') {
          console.log('[tts] Finished speaking chunk');
          session.isTtsSpeaking = false;
          if (session.ttsResolve) {
            const resolve = session.ttsResolve;
            session.ttsResolve = null;
            resolve();
          }
        } else if (msg.type === 'error') {
          console.error('[tts] Error from server:', msg.data?.message);
          session.isTtsSpeaking = false;
          if (session.ttsResolve) {
            const resolve = session.ttsResolve;
            session.ttsResolve = null;
            resolve();
          }
        }
      } catch (msgErr) {
        console.error('[tts-message-handler] Error handling TTS socket message:', msgErr);
      }
    });

    ttsSocket.on('close', (event) => {
      console.log('[tts] Sarvam TTS connection closed, code:', event?.code || 'none');
      session.isTtsSpeaking = false;
      if (session.ttsResolve) {
        const resolve = session.ttsResolve;
        session.ttsResolve = null;
        resolve();
      }
    });

    ttsSocket.on('error', (err) => {
      console.error('[tts] Sarvam TTS error event:', err);
      session.isTtsSpeaking = false;
      if (session.ttsResolve) {
        const resolve = session.ttsResolve;
        session.ttsResolve = null;
        resolve();
      }
    });

  } catch (err) {
    console.error('[tts] Failed to initialize TTS socket:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP — close all upstream connections when call ends
// ─────────────────────────────────────────────────────────────────────────────
function cleanup(session) {
  try {
    if (session.sttSocket) {
      console.log('[cleanup] Closing Sarvam STT WebSocket');
      session.sttSocket.close();
    }
  } catch (err) {
    console.error('[cleanup] STT close error:', err.message);
  }
  try {
    if (session.ttsSocket) {
      console.log('[cleanup] Closing Sarvam TTS WebSocket');
      session.ttsSocket.close();
    }
  } catch (err) {
    console.error('[cleanup] TTS close error:', err.message);
  }
  console.log(`[media-stream] Session ended — callSid: ${session.callSid}, property: ${session.propertyId}`);
}

async function finalizeCallRecord(session, status) {
  if (!session.recordId) return;
  try {
    const record = await CallRecord.findById(session.recordId);
    if (record && record.status !== 'completed' && record.status !== 'failed') {
      record.status = status;
      record.endedAt = new Date();
      await record.save();
      console.log(`[db] Finalized CallRecord ${session.recordId} with status: ${status}`);
    }
  } catch (err) {
    console.error('[db-finalize] Failed to finalize CallRecord:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// Called once per incoming Twilio Media Stream WebSocket connection from server.js
// ─────────────────────────────────────────────────────────────────────────────
async function handleMediaStream(twilioWs) {
  console.log('[media-stream] New Twilio Media Stream connection established!');

  // Create isolated CallSession for this connection
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
  };

  // Store CallSession on the WebSocket object
  twilioWs.session = CallSession;

  twilioWs.on('message', async (raw) => {
    let msg;
    try { 
      msg = JSON.parse(raw.toString()); 
    } catch (parseErr) {
      console.error('[media-stream] Failed to parse raw Twilio WS message:', parseErr.message);
      return;
    }

    try {
      switch (msg.event) {

        case 'connected':
          console.log('[twilio] "connected" event received. Payload:', JSON.stringify(msg, null, 2));
          break;

        case 'start': {
          console.log('[twilio] "start" event received. Payload:', JSON.stringify(msg, null, 2));
          CallSession.streamSid  = msg.streamSid;
          CallSession.callSid    = msg.start?.callSid;
          CallSession.propertyId = msg.start?.customParameters?.propertyId || null;
          CallSession.callerPhone = msg.start?.customParameters?.callerPhone || null;

          console.log(`[twilio] Stream details: SID=${CallSession.streamSid}, callSid=${CallSession.callSid}, propertyId=${CallSession.propertyId}, callerPhone=${CallSession.callerPhone}`);

          // Create initial CallRecord document in MongoDB
          try {
            const record = await CallRecord.create({
              callSid: CallSession.callSid,
              streamSid: CallSession.streamSid,
              propertyId: CallSession.propertyId,
              callerPhone: CallSession.callerPhone,
              status: 'initiated',
              startedAt: new Date(),
            });
            CallSession.recordId = record._id;
            console.log('[twilio-start] Created DB CallRecord with ID:', CallSession.recordId);
          } catch (dbErr) {
            console.error('[twilio-start] Failed to create DB CallRecord:', dbErr.message);
          }

          // Load property from MongoDB for context
          if (CallSession.propertyId) {
            try {
              CallSession.property = await Property.findById(CallSession.propertyId).lean();
              console.log('[twilio] Loaded context for property:', CallSession.property?.title);
            } catch (e) {
              console.warn('[twilio] Property lookup failed:', e.message);
            }
          }

          // Open STT and TTS sockets immediately
          try {
            await initSarvamSockets(CallSession, twilioWs);
          } catch (initErr) {
            console.error('[twilio-start] Failed to initialize Sarvam connections, closing session:', initErr.message);
            await finalizeCallRecord(CallSession, 'failed');
            cleanup(CallSession);
            return;
          }

          // Update status to in-progress
          if (CallSession.recordId) {
            try {
              await CallRecord.findByIdAndUpdate(CallSession.recordId, { status: 'in-progress' });
            } catch (dbErr) {
              console.error('[twilio-start-db] Failed to update CallRecord status to in-progress:', dbErr.message);
            }
          }

          // Speak greeting without waiting for caller (agent speaks first)
          const greetingText = buildGreeting(CallSession.property);
          console.log(`[twilio] Speaking greeting: "${greetingText}"`);
          
          speakText(greetingText, CallSession).then(async () => {
            CallSession.conversationHistory.push({ role: 'assistant', content: greetingText });
            if (CallSession.recordId) {
              try {
                await CallRecord.findByIdAndUpdate(CallSession.recordId, {
                  $push: {
                    transcript: {
                      speaker: 'agent',
                      text: greetingText,
                      timestamp: new Date(),
                    }
                  }
                });
                console.log('[twilio-start] Persisted greeting to DB');
              } catch (dbErr) {
                console.error('[twilio-start-db] Failed to push greeting to DB:', dbErr.message);
              }
            }
          }).catch((speakErr) => {
            console.error('[twilio-greeting] Error speaking greeting:', speakErr.message);
          });
          break;
        }

        case 'media': {
          const payload = msg.media?.payload;
          if (!payload) return;
          if (!CallSession.sttSocket) return;

          // Convert Twilio mulaw 8kHz -> PCM 16kHz and forward to Sarvam STT
          try {
            const pcmBuffer = twilioMulawToSarvamPCM(payload);
            if (CallSession.sttSocket.readyState === 1) {
              CallSession.sttSocket.socket.send(pcmBuffer);
            }
          } catch (err) {
            console.error('[audio] Conversion/Send error:', err.message);
          }
          break;
        }

        case 'stop':
          console.log('[twilio] "stop" event received');
          await finalizeCallRecord(CallSession, 'completed');
          cleanup(CallSession);
          break;

        default:
          break;
      }
    } catch (eventErr) {
      console.error(`[media-stream] Exception processing event "${msg.event}":`, eventErr);
      await finalizeCallRecord(CallSession, 'failed');
      cleanup(CallSession);
    }
  });

  twilioWs.on('close', async (code, reason) => {
    console.log(`[twilio] WebSocket closed by Twilio. Code: ${code}, Reason: ${reason || 'none'}`);
    await finalizeCallRecord(CallSession, 'completed');
    cleanup(CallSession);
  });

  twilioWs.on('error', async (err) => {
    console.error('[twilio] WebSocket connection error:', err);
    await finalizeCallRecord(CallSession, 'failed');
    cleanup(CallSession);
  });
}

module.exports = { handleMediaStream };
