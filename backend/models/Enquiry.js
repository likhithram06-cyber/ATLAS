// What this file does: Mongoose schema for caller enquiries with AI transcripts and intent scoring
const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  property:   { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Full conversation transcript between caller and AI agent
  transcript: [{
    role:      { type: String, enum: ['user', 'assistant'] },
    text:      { type: String },
    timestamp: { type: Date, default: Date.now },
  }],

  // Composite 0-100 score representing how likely the caller is to convert
  intentScore: { type: Number, default: 0 },

  // Breakdown of what drove the score, e.g. [{reason: "Asked about price", points: 20}]
  intentBreakdown: [{
    reason: String,
    points: Number,
  }],

  // Price the caller mentioned during conversation
  quotedPrice: { type: Number, default: 0 },

  // Final status after AI analysis
  status: {
    type: String,
    enum: ['interested', 'not_interested', 'pending'],
    default: 'pending',
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Enquiry', enquirySchema);
