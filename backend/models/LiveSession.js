// filepath: /Volumes/test/sat/backend/models/LiveSession.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LiveSessionSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  host: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project'
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  codeSnippet: {
    type: String,
    default: '// Start coding here\n'
  },
  language: {
    type: String,
    default: 'javascript'
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended'],
    default: 'scheduled'
  },
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Sessions with project association
LiveSessionSchema.index({ project: 1, status: 1 });
// Active sessions
LiveSessionSchema.index({ status: 1, scheduledFor: 1 });
// User's sessions
LiveSessionSchema.index({ host: 1, createdAt: -1 });
LiveSessionSchema.index({ participants: 1, status: 1 });

// Auto-update the updatedAt field
LiveSessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-update the participants array with the host if it's empty
LiveSessionSchema.pre('save', function(next) {
  if (this.isNew && (!this.participants || this.participants.length === 0)) {
    this.participants = [this.host];
  }
  next();
});

module.exports = mongoose.model('LiveSession', LiveSessionSchema);