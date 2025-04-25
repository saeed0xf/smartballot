const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional because some activities might be system-generated
  },
  action: {
    type: String,
    required: true,
    enum: ['register', 'login', 'approve', 'approve-complete', 'reject', 'vote', 'start-election', 'end-election', 'add-candidate']
  },
  entity: {
    type: String,
    required: true,
    enum: ['user', 'voter', 'candidate', 'election', 'vote']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  details: {
    type: String,
    required: false
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // automatically add createdAt and updatedAt fields
});

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity; 