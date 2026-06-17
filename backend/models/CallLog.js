// What this file does: Mongoose schema for raw call log records per property
const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  property:   { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  // Caller can be a registered user or just a phone string (anonymous)
  caller:     { type: String },
  callerUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  duration:   { type: Number, default: 0 },    // in seconds
  transcript: { type: String, default: '' },   // raw full text of the call
  summary:    { type: String, default: '' },   // AI-generated summary
  createdAt:  { type: Date, default: Date.now },
});

module.exports = mongoose.model('CallLog', callLogSchema);
