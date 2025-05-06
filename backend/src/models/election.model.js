const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'Lok Sabha Elections (General Elections)',
      'Vidhan Sabha Elections (State Assembly Elections)',
      'Local Body Elections (Municipal)',
      'Other'
    ],
    default: 'Lok Sabha Elections (General Elections)'
  },
  description: {
    type: String,
    trim: true
  },
  region: {
    type: String,
    trim: true
  },
  pincode: {
    type: String,
    required: true,
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
  blockchainError: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startedAt: {
    type: Date
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
  },
  blockchainElectionId: {
    type: String,
    description: 'ID of the election on the blockchain'
  }
}, {
  timestamps: true
});

// Update the updatedAt field on save
electionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Election = mongoose.model('Election', electionSchema);

module.exports = Election; 