const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  middleName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 18
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other']
  },
  dateOfBirth: {
    type: Date
  },
  photoUrl: {
    type: String
  },
  partyName: {
    type: String,
    required: true,
    trim: true
  },
  partySymbol: {
    type: String
  },
  electionType: {
    type: String,
    required: true,
    enum: ['Presidential', 'Parliamentary', 'Regional', 'Local']
  },
  constituency: {
    type: String,
    trim: true
  },
  manifesto: {
    type: String,
    trim: true
  },
  education: {
    type: String,
    trim: true
  },
  experience: {
    type: String,
    trim: true
  },
  criminalRecord: {
    type: String,
    default: 'None',
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  blockchainId: {
    type: Number
  },
  blockchainTxHash: {
    type: String
  },
  voteCount: {
    type: Number,
    default: 0
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Candidate = mongoose.model('Candidate', candidateSchema);

module.exports = Candidate; 