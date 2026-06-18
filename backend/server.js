// What this file does: Express server entry point — mounts routes, middleware, connects DB
require('dotenv').config();

// Global crash safety nets
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

// Ensure all required environment variables are populated on startup
const required = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE', 'BASE_URL'];
for (const key of required) {
  const val = process.env[key];
  if (!val || val.includes('your_') || val.includes('your-')) {
    throw new Error(`CRITICAL STARTUP ERROR: Missing or placeholder required env var: ${key}. Please configure this in backend/.env`);
  }
}
if (process.env.BASE_URL.includes('localhost') || process.env.BASE_URL.includes('127.0.0.1')) {
  console.warn('\n⚠️  WARNING: BASE_URL is set to localhost — Twilio cannot reach this. Set it to your ngrok HTTPS URL before making calls.\n');
}

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const connectDB  = require('./config/db');

const authRoutes       = require('./routes/authRoutes');
const propertyRoutes   = require('./routes/propertyRoutes');
const enquiryRoutes    = require('./routes/enquiryRoutes');
const agentRoutes      = require('./routes/agentRoutes');
const adminRoutes      = require('./routes/adminRoutes');
const callRoutes       = require('./routes/callRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
connectDB();

// Initialize Redis Cache
require('./config/redis');

// Middleware: parse JSON/URL-encoded bodies and allow cross-origin requests from frontend
// express.urlencoded is required for Twilio webhook POST bodies (application/x-www-form-urlencoded)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
app.get('/', (req, res) => res.json({ message: 'ATLAS API is running ✅' }));

// Serve uploaded images (admin uploads + seeded dataset) statically
app.use('/uploads/dataset', express.static(path.join(__dirname, '../tmp/houses-dataset/Houses Dataset')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/call/tts-audio', express.static(path.join(__dirname, 'temp_uploads')));

// Mount all route groups under /api
app.use('/api/auth',        authRoutes);
app.use('/api/properties',  propertyRoutes);
app.use('/api/enquiries',   enquiryRoutes);
app.use('/api/agent',       agentRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/call',        callRoutes);

// Start listening — use http.createServer so we can attach the WebSocket server
// for Twilio Media Streams on the same port as the Express app.
// NOTE: Twilio sends Media Stream audio over WSS. ngrok automatically exposes the
// same port for both HTTP and WSS, so no extra tunnel config is needed.
const http = require('http');
const { WebSocketServer } = require('ws');
const { handleMediaStream } = require('./services/mediaStreamHandler');

const httpServer = http.createServer(app);
const wss        = new WebSocketServer({ noServer: true });

// Route incoming WebSocket upgrades on /media-stream to our handler
httpServer.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname === '/media-stream') {
    // Optional Twilio signature check — the X-Twilio-Signature header is present on
    // HTTP webhook requests but NOT always on WS upgrade requests in Twilio Media Streams.
    // Full request-level auth is done by keeping this endpoint secret (via ngrok / firewall).
    // For production, add IP allowlist for Twilio's published IP ranges.
    console.log('[ws] Upgrade request for /media-stream from', request.socket.remoteAddress);
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    // Reject any WebSocket upgrade that is not for our media-stream path
    socket.destroy();
  }
});

wss.on('connection', (ws, request) => {
  console.log('[ws] New /media-stream connection — handing off to mediaStreamHandler');
  handleMediaStream(ws).catch((err) => {
    console.error('[ws] Unhandled error in handleMediaStream:', err.message);
  });
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Kill the existing process and restart.`);
    process.exit(1); // let nodemon immediately restart cleanly
  } else {
    throw err;
  }
});

httpServer.listen(PORT, () => {
  console.log(`🚀 ATLAS backend running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket media-stream endpoint ready at ws://localhost:${PORT}/media-stream`);
});


