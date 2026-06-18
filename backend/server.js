// What this file does: Express server entry point — mounts routes, middleware, connects DB
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const connectDB  = require('./config/db');

const authRoutes       = require('./routes/authRoutes');
const propertyRoutes   = require('./routes/propertyRoutes');
const enquiryRoutes    = require('./routes/enquiryRoutes');
const agentRoutes      = require('./routes/agentRoutes');
const adminRoutes      = require('./routes/adminRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
connectDB();

// Middleware: parse JSON bodies and allow cross-origin requests from frontend
app.use(cors());
app.use(express.json());
// Serve uploaded images statically
app.use('/uploads', express.static('uploads'));

// Mount all route groups under /api
app.use('/api/auth',        authRoutes);
app.use('/api/properties',  propertyRoutes);
app.use('/api/enquiries',   enquiryRoutes);
app.use('/api/agent',       agentRoutes);
app.use('/api/admin',       adminRoutes);

// Health check endpoint
app.get('/', (req, res) => res.json({ message: 'ATLAS API is running ✅' }));

// Start listening
app.listen(PORT, () => {
  console.log(`🚀 ATLAS backend running on http://localhost:${PORT}`);
});
