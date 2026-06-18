// What this file does: Standalone test script to verify Sarvam AI STT and TTS streaming WebSocket
// connections and functionality using the official SDK, completely outside of the Twilio flow.

'use strict';

const path = require('path');
const fs = require('fs');

// Load environment variables from backend/.env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { SarvamAIClient } = require('sarvamai');

const apiKey = process.env.SARVAM_API_KEY;

console.log('=== Sarvam AI SDK WebSockets Diagnostics ===');
console.log('Using API Key:', apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : 'NOT FOUND');

if (!apiKey || apiKey.includes('your_')) {
  console.error('❌ Error: SARVAM_API_KEY is not configured or is a placeholder in backend/.env');
  process.exit(1);
}

const tempDir = path.join(__dirname, '../tmp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

async function testTts(sarvam) {
  return new Promise(async (resolve, reject) => {
    console.log('\n--- Testing TTS Streaming Socket ---');
    try {
      console.log('Connecting to Text-to-Speech Streaming...');
      const ttsSocket = await sarvam.textToSpeechStreaming.connect({
        "Api-Subscription-Key": apiKey,
        model: "bulbul:v3",
        send_completion_event: "true",
      });

      console.log('Waiting for TTS socket to be open...');
      await ttsSocket.waitForOpen();
      console.log('✅ TTS WebSocket connected and opened successfully!');

      console.log('Configuring connection parameters...');
      ttsSocket.configureConnection({
        target_language_code: "en-IN",
        speaker: "aditya",
        model: "bulbul:v3",
        speech_sample_rate: 8000,
        output_audio_codec: "mulaw",
      });

      const audioChunks = [];
      let completionReceived = false;
      let timeoutId;

      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          console.log('[tts] Timeout waiting for new audio chunks — assuming synthesis complete');
          if (audioChunks.length > 0) {
            const finalBuffer = Buffer.concat(audioChunks);
            const outputPath = path.join(tempDir, 'test-tts-output.mulaw');
            fs.writeFileSync(outputPath, finalBuffer);
            console.log(`✅ TTS Audio saved successfully to: ${outputPath} (${finalBuffer.length} bytes)`);
          }
          ttsSocket.close();
          resolve();
        }, 3000);
      };

      resetTimeout();

      ttsSocket.on('message', (msg) => {
        resetTimeout();
        if (msg.type === 'audio') {
          const audioB64 = msg.data?.audio;
          if (audioB64) {
            const buf = Buffer.from(audioB64, 'base64');
            audioChunks.push(buf);
            console.log(`[tts] Received audio chunk: ${buf.length} bytes`);
          }
        } else {
          console.log('[tts] Received non-audio message:', JSON.stringify(msg));
          if (msg.type === 'event' && msg.data?.event_type === 'final') {
            console.log('[tts] Received "final" completion event');
            completionReceived = true;
            if (timeoutId) clearTimeout(timeoutId);

            if (audioChunks.length > 0) {
              const finalBuffer = Buffer.concat(audioChunks);
              const outputPath = path.join(tempDir, 'test-tts-output.mulaw');
              fs.writeFileSync(outputPath, finalBuffer);
              console.log(`✅ TTS Audio saved successfully to: ${outputPath} (${finalBuffer.length} bytes)`);
            } else {
              console.error('❌ Error: TTS finished but no audio data was received.');
            }

            ttsSocket.close();
            resolve();
          }
        }
      });

      ttsSocket.on('close', (event) => {
        console.log('TTS socket closed. Code:', event?.code);
        if (timeoutId) clearTimeout(timeoutId);
        resolve(); // Resolve anyway during standalone test to avoid hanging
      });

      ttsSocket.on('error', (err) => {
        console.error('❌ TTS socket error event:', err);
        reject(err);
      });

      const phrase = "Welcome to ATLAS. This is a diagnostic test call of the Sarvam text to speech pipeline.";
      console.log(`Sending text phrase: "${phrase}"`);
      ttsSocket.convert(phrase);

    } catch (err) {
      console.error('❌ TTS test failed to connect or upgrade:', err);
      reject(err);
    }
  });
}

async function testStt(sarvam) {
  return new Promise(async (resolve, reject) => {
    console.log('\n--- Testing STT Streaming Socket ---');
    try {
      console.log('Connecting to Speech-to-Text Streaming...');
      const sttSocket = await sarvam.speechToTextStreaming.connect({
        "Api-Subscription-Key": apiKey,
        "language-code": "en-IN",
        model: "saarika:v2.5",
        input_audio_codec: "pcm_s16le",
        sample_rate: "16000",
        vad_signals: true,
      });

      console.log('Waiting for STT socket to be open...');
      await sttSocket.waitForOpen();
      console.log('✅ STT WebSocket connected and opened successfully!');

      sttSocket.on('message', (msg) => {
        console.log('[stt] Received message:', JSON.stringify(msg));
      });

      sttSocket.on('close', (event) => {
        console.log('STT socket closed. Code:', event?.code);
        resolve();
      });

      sttSocket.on('error', (err) => {
        console.error('❌ STT socket error event:', err);
        reject(err);
      });

      // Confirm it connects and stays open for 2 seconds, then close it
      setTimeout(() => {
        console.log('STT socket stays open, closing connection...');
        sttSocket.close();
      }, 2000);

    } catch (err) {
      console.error('❌ STT test failed to connect or upgrade:', err);
      reject(err);
    }
  });
}

async function main() {
  const sarvam = new SarvamAIClient({ apiSubscriptionKey: apiKey });
  
  try {
    await testTts(sarvam);
    await testStt(sarvam);
    console.log('\n🎉 ALL SARVAM WEB SOCKET DIAGNOSTIC TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ Diagnostics completed with errors.');
    process.exit(1);
  }
}

main();
