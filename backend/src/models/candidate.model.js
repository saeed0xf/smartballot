const mongoose = require('mongoose');

// Add debugging
console.log('Initializing Candidate model with mongoose version:', mongoose.version);

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
    enum: ['Male', 'Female', 'Other', 'Prefer not to say']
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
    enum: [
      'Lok Sabha Elections (General Elections)',
      'Lok Sabha Elections',
      'Vidhan Sabha Elections (State Assembly Elections)',
      'Vidhan Sabha Elections',
      'Local Body Elections (Municipal)',
      'Local Body Elections',
      'Other',
      'Presidential',
      'Parliamentary',
      'Regional',
      'Local'
    ],
    default: 'Lok Sabha Elections (General Elections)'
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
    type: String
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
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Reference to election to link candidates with specific elections
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election'
  },
  // Flag to track if the candidate is associated with an active election
  inActiveElection: {
    type: Boolean,
    default: false
  }
});

// Add a pre-save hook to log when a candidate is being saved
candidateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  console.log('Saving candidate to MongoDB:', this);
  next();
});

// Virtual for fullname - make it easier to access the candidate's full name
candidateSchema.virtual('name').get(function() {
  let fullName = this.firstName;
  if (this.middleName) fullName += ' ' + this.middleName;
  fullName += ' ' + this.lastName;
  return fullName;
});

// Make virtual fields show up in JSONs
candidateSchema.set('toJSON', { virtuals: true });
candidateSchema.set('toObject', { virtuals: true });

const Candidate = mongoose.model('Candidate', candidateSchema);

console.log('Candidate model initialized');

module.exports = Candidate; 