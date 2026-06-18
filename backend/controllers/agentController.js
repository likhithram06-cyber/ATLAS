// What this file does: handles speech-to-text, chat completion, and end-of-conversation lead scoring
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const Property = require('../models/Property');
const Enquiry = require('../models/Enquiry');

const GROQ_KEY = process.env.GROQ_API_KEY;
const HAS_GROQ = GROQ_KEY && GROQ_KEY !== 'your_groq_key' && GROQ_KEY !== '';

// POST /api/agent/respond — transcribes audio and gets AI response
exports.respond = async (req, res) => {
  let tempFilePath = null;
  try {
    const { propertyId } = req.body;
    const transcript = req.body.transcript ? JSON.parse(req.body.transcript) : [];

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }
    tempFilePath = req.file.path;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Step 1: Transcribe via Groq Whisper or fallback
    let userText = '';
    if (HAS_GROQ) {
      const form = new FormData();
      form.append('file', fs.createReadStream(tempFilePath), 'audio.webm');
      form.append('model', 'whisper-large-v3');

      const transcriptionRes = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${GROQ_KEY}`
        }
      });
      userText = transcriptionRes.data.text || '';
    } else {
      userText = 'Please provide details about the price and a site visit.';
      console.log('[Groq Mock] Whisper transcription bypassed, returning dummy text.');
    }

    if (!userText.trim()) {
      return res.json({ transcription: '', reply: 'I did not catch that. Could you please repeat?' });
    }

    // Step 2: Get AI reply via LLaMA
    let reply = '';
    const systemPrompt = `You are ATLAS, a warm and professional AI property assistant. Answer concisely (under 3 sentences).
Property: ${property.title} | Location: ${property.location} | Price: ₹${property.price.toLocaleString('en-IN')} | ${property.bhk} BHK
Features: ${property.features.join(', ')} | ${property.description}
If asked to book, say the agent will follow up shortly.`;

    if (HAS_GROQ) {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...transcript.map(m => ({ role: m.role, content: m.text })),
        { role: 'user', content: userText }
      ];

      const chatRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-8b-instant',
        messages,
        max_tokens: 180
      }, {
        headers: {
          'Authorization': `Bearer ${GROQ_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      reply = chatRes.data.choices?.[0]?.message?.content || 'Let me double check that for you.';
    } else {
      // Local fallback logic
      const lower = userText.toLowerCase();
      if (lower.includes('price') || lower.includes('cost') || lower.includes('lakh') || lower.includes('crore')) {
        reply = `This property is listed at ₹${(property.price / 100000).toFixed(0)} Lakhs. Would you like to check financing or EMI options?`;
      } else if (lower.includes('visit') || lower.includes('book') || lower.includes('see')) {
        reply = `I would love to help you book a visit to see ${property.title}! I'll pass your interest along to the listing agent.`;
      } else {
        reply = `This is a beautiful ${property.bhk} BHK property in ${property.location}. It features ${property.features.slice(0, 3).join(', ')}. What else would you like to know?`;
      }
    }

    res.json({ transcription: userText, reply });
  } catch (err) {
    console.error('Agent respond error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    // Delete the temp file uploaded by multer
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) { console.error('Failed to delete temp file:', e); }
    }
  }
};

// POST /api/agent/finalize — scores lead intent, saves Enquiry, fires n8n webhook
exports.finalize = async (req, res) => {
  try {
    const { propertyId, transcript } = req.body;
    if (!propertyId || !transcript) {
      return res.status(400).json({ error: 'Property ID and transcript are required' });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    let intentScore = 30;
    let finalPriceAsked = 0;
    let interested = false;

    if (HAS_GROQ && transcript.length > 0) {
      try {
        const prompt = `You are a real estate conversation analyzer. Read the conversation transcript between a user and ATLAS (the AI assistant) about a property.
Analyze their interest level and return a JSON object with:
1. "intentScore": a number from 0 to 100 representing their likelihood to purchase/visit.
2. "finalPriceAsked": a number representing the last price they asked or discussed, or 0 if they didn't ask.
3. "interested": a boolean (true if they want to book a visit, are very interested, or want to follow up; false otherwise).

Format the output strictly as JSON. Do not include any explanation or markdown formatting.

Transcript:
${JSON.stringify(transcript)}`;

        const chatRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        }, {
          headers: {
            'Authorization': `Bearer ${GROQ_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        const resultText = chatRes.data.choices?.[0]?.message?.content;
        const analysis = JSON.parse(resultText);
        intentScore = analysis.intentScore ?? 30;
        finalPriceAsked = analysis.finalPriceAsked ?? 0;
        interested = analysis.interested ?? false;
      } catch (analErr) {
        console.warn('Llama analysis failed, falling back to local scoring:', analErr.message);
      }
    }

    // Local keyword-based fallback if Llama failed or isn't configured
    if (!HAS_GROQ || intentScore === 30) {
      let score = 20;
      transcript.forEach(m => {
        if (m.role === 'user') {
          const txt = m.text.toLowerCase();
          if (txt.includes('price') || txt.includes('cost')) { score += 15; finalPriceAsked = property.price; }
          if (txt.includes('visit') || txt.includes('book') || txt.includes('see')) { score += 30; interested = true; }
          if (txt.includes('interested') || txt.includes('buy') || txt.includes('loan')) { score += 20; }
        }
      });
      intentScore = Math.min(100, score);
    }

    // Calculate negotiation pricing details
    const origPrice = property.price;
    const offPrice = finalPriceAsked || property.price;
    // If user asked/offered a bargained price, calculate a midway final agreed price, else same as original
    const agreedPrice = (finalPriceAsked && finalPriceAsked < property.price)
      ? Math.round((property.price + finalPriceAsked) / 2)
      : property.price;

    // Save Enquiry to database (link user if logged in)
    const userId = req.user ? req.user.id : null;
    const enquiry = await Enquiry.create({
      property: propertyId,
      user: userId,
      transcript: transcript,
      intentScore,
      finalPriceAsked: offPrice,
      originalPrice: origPrice,
      offeredPrice: offPrice,
      finalAgreedPrice: agreedPrice,
      interested,
    });

    // Fire n8n webhook helper if configured
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await axios.post(webhookUrl, {
          enquiryId: enquiry._id,
          property: property.title,
          intentScore,
          interested,
          phone: req.user ? req.user.phone : 'Guest User',
          name: req.user ? req.user.name : 'Guest',
        });
      } catch (webErr) {
        console.warn('n8n webhook notification failed:', webErr.message);
      }
    }

    res.status(201).json(enquiry);
  } catch (err) {
    console.error('Finalize enquiry error:', err);
    res.status(500).json({ error: err.message });
  }
};
