const mongoose = require('mongoose');

const voterElectionSchema = new mongoose.Schema({
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voter',
    required: true
  },
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  blockchainRegistered: {
    type: Boolean,
    default: false
  },
  blockchainTxHash: {
    type: String
  },
  hasVoted: {
    type: Boolean,
    default: false
  },
  voteTimestamp: {
    type: Date
  },
  blockchainVoteTxHash: {
    type: String
  }
}, {
  timestamps: true
});

// Create a compound index to ensure a voter can only have one status per election
voterElectionSchema.index({ voter: 1, election: 1 }, { unique: true });

module.exports = mongoose.model('VoterElection', voterElectionSchema); 