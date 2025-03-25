const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  electionType: {
    type: String,
    required: true,
    enum: ['Presidential', 'Parliamentary', 'Regional', 'Local'],
    default: 'Presidential'
  },
  region: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  },
  totalVotes: {
    type: Number,
    default: 0
  },
  blockchainStartTxHash: {
    type: String
  },
  blockchainEndTxHash: {
    type: String
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

// Update the updatedAt field on save
electionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Election = mongoose.model('Election', electionSchema);

module.exports = Election; 