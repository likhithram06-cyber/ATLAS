// What this file does: enquiry routes — create enquiry from AI session, view own enquiries
const express  = require('express');
const axios    = require('axios');
const Enquiry  = require('../models/Enquiry');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Fires an n8n webhook with the new enquiry data (for WhatsApp/Telegram automation)
async function triggerN8nWebhook(enquiry) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await axios.post(webhookUrl, {
      enquiryId:   enquiry._id,
      property:    enquiry.property,
      intentScore: enquiry.intentScore,
      status:      enquiry.status,
    });
  } catch (err) {
    console.warn('n8n webhook failed (non-fatal):', err.message);
  }
}

// POST /api/enquiries — saves a new AI conversation session
router.post('/', verifyToken, async (req, res) => {
  try {
    const { property, transcript, intentScore, intentBreakdown, quotedPrice, status } = req.body;

    const enquiry = await Enquiry.create({
      property,
      user:            req.user.id,
      transcript:      transcript || [],
      intentScore:     intentScore || 0,
      intentBreakdown: intentBreakdown || [],
      quotedPrice:     quotedPrice || 0,
      status:          status || 'pending',
    });

    // Fire webhook asynchronously — don't block the response
    triggerN8nWebhook(enquiry);

    res.status(201).json(enquiry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/enquiries/my — returns all enquiries made by the logged-in user
router.get('/my', verifyToken, async (req, res) => {
  try {
    const enquiries = await Enquiry.find({ user: req.user.id })
      .populate('property', 'title location price images')
      .sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
