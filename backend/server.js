// What this file does: Express server entry point — mounts routes, middleware, connects DB
require('dotenv').config();

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

// Middleware: parse JSON bodies and allow cross-origin requests from frontend
app.use(cors());
app.use(express.json());
// Serve uploaded images (admin uploads + seeded dataset) statically
app.use('/uploads/dataset', express.static(path.join(__dirname, '../tmp/houses-dataset/Houses Dataset')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount all route groups under /api
app.use('/api/auth',        authRoutes);
app.use('/api/properties',  propertyRoutes);
app.use('/api/enquiries',   enquiryRoutes);
app.use('/api/agent',       agentRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/call',        callRoutes);

// Health check endpoint
app.get('/', (req, res) => res.json({ message: 'ATLAS API is running ✅' }));

// Start listening
app.listen(PORT, () => {
  console.log(`🚀 ATLAS backend running on http://localhost:${PORT}`);
});
