// What this file does: controller for creating and listing user interest/lead enquiries
const axios = require('axios');
const Enquiry = require('../models/Enquiry');

// Sends a webhook POST to n8n for real-time alerting (e.g. Telegram alerts)
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

// POST a new enquiry
exports.createEnquiry = async (req, res) => {
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

    // Notify n8n asynchronously
    triggerN8nWebhook(enquiry);

    res.status(201).json(enquiry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET logged-in user's list of enquiries
exports.getMyEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find({ user: req.user.id })
      .populate('property', 'title location price images')
      .sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
