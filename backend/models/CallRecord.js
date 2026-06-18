// What this file does: Mongoose schema/model for persisting call records and transcripts.

'use strict';

const mongoose = require('mongoose');

const callRecordSchema = new mongoose.Schema({
  callSid: {
    type: String,
    required: true,
    index: true,
  },
  streamSid: {
    type: String,
    required: true,
    index: true,
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
  },
  callerPhone: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    enum: ['initiated', 'in-progress', 'completed', 'failed'],
    default: 'initiated',
  },
  transcript: [
    {
      speaker: {
        type: String,
        enum: ['caller', 'agent'],
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('CallRecord', callRecordSchema);
