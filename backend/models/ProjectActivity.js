// filepath: /Volumes/test/sat/backend/models/ProjectActivity.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProjectActivitySchema = new Schema({
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actionType: {
    type: String,
    enum: ['commit', 'comment', 'pull_request', 'merge', 'issue', 'join', 'update', 'other'],
    required: true
  },
  details: {
    type: String,
    required: true
  },
  metadata: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

ProjectActivitySchema.index({ project: 1, createdAt: -1 });
ProjectActivitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ProjectActivity', ProjectActivitySchema);