// What this file does: Mongoose schema for raw call log records per property
const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  property:   { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  // Caller can be a registered user or just a phone string (anonymous)
  caller:     { type: String },
  callerUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  duration:   { type: Number, default: 0 },    // in seconds
  transcript: { type: String, default: '' },   // raw full text of the call
  summary:    { type: String, default: '' },   // AI-generated summary

  // ── Twilio outbound call tracking ─────────────────────────────────────────
  phone:      { type: String },                // E.164 destination phone number
  callSid:    { type: String },                // Twilio CallSid for correlation
  status:     { type: String, default: 'initiated' }, // initiated | ringing | answered | completed | failed | no-answer | busy
  timestamp:  { type: Date, default: Date.now },

  createdAt:  { type: Date, default: Date.now },
}, { timestamps: true });

// Allow upserts by callSid (status callback)
callLogSchema.index({ callSid: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('CallLog', callLogSchema);
