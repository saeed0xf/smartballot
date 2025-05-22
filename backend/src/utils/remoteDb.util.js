const mongoose = require('mongoose');

// Remote MongoDB Atlas connection string
// Include additional query parameters for connection stability
const REMOTE_MONGO_URI = process.env.REMOTE_MONGO_URI || 
                         'mongodb://admin:secret@localhost:27018/test?authSource=admin&w=majority&readPreference=primary&retryWrites=true&directConnection=true';

// Create schemas for remote database models
const RemoteElectionSchema = new mongoose.Schema({
  title: String,
  description: String,
  startDate: Date,
  endDate: Date,
  isActive: Boolean,
  isArchived: Boolean,
  region: String,
  pincode: String,
  blockchainElectionId: String,
  blockchainTxHash: String,
  originalElectionId: String,
  recordedAt: { type: Date, default: Date.now },
  startedAt: Date,
  endedAt: Date,
  archivedAt: Date,
  blockchainStartTxHash: String,
  blockchainEndTxHash: String,
  totalVotes: { type: Number, default: 0 },
  noneOfTheAboveVotes: { type: Number, default: 0 },
  type: String
});

const RemoteCandidateSchema = new mongoose.Schema({
  firstName: String,
  middleName: String,
  lastName: String,
  age: Number,
  gender: String,
  dateOfBirth: Date,
  partyName: String,
  electionType: String,
  electionId: String,
  constituency: String,
  pincode: String,
  manifesto: String,
  education: String,
  experience: String,
  criminalRecord: String,
  email: String,
  voteCount: { type: Number, default: 0 },
  photoUrl: String,
  partySymbol: String,
  blockchainTxHash: String,
  originalCandidateId: String,
  recordedAt: { type: Date, default: Date.now },
  isArchived: Boolean
});

// Create schema for remote vote records
const RemoteVoteSchema = new mongoose.Schema({
  voterId: String,
  candidateId: String,
  electionId: String,
  isNoneOption: {
    type: Boolean,
    default: false
  },
  blockchainTxHash: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  verificationCode: String,
  confirmed: {
    type: Boolean,
    default: true
  },
  blockInfo: {
    blockNumber: Number,
    blockHash: String,
    confirmations: { type: Number, default: 12 }
  }
});

// Create a connection to the remote database
const createRemoteConnection = async () => {
  try {
    console.log('Creating connection to remote MongoDB database...');
    
    // Add connection options to make it more robust
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 10000, // 10 seconds timeout for connection
      socketTimeoutMS: 45000,  // 45 seconds timeout for operations
      serverSelectionTimeoutMS: 10000, // 10 seconds for server selection
      heartbeatFrequencyMS: 10000, // 10 seconds for heartbeat frequency
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 1, // Minimum number of connections in the pool
    };
    
    // Create the connection
    const remoteConnection = mongoose.createConnection(REMOTE_MONGO_URI, options);
    
    // Wait for the connection to be established
    await new Promise((resolve, reject) => {
      remoteConnection.once('open', () => {
        console.log('Connected to remote MongoDB database successfully');
        resolve();
      });
      
      remoteConnection.once('error', (err) => {
        console.error('Error establishing connection to remote MongoDB:', err);
        reject(err);
      });
    });
    
    // Add event listeners for connection issues
    remoteConnection.on('disconnected', () => {
      console.warn('Remote MongoDB connection disconnected');
    });
    
    remoteConnection.on('reconnected', () => {
      console.log('Remote MongoDB connection reconnected');
    });
    
    remoteConnection.on('error', (err) => {
      console.error('Remote MongoDB connection error:', err);
    });
    
    return remoteConnection;
  } catch (error) {
    console.error('Error connecting to remote MongoDB database:', error);
    throw new Error(`Failed to connect to remote database: ${error.message}`);
  }
};

// Update election in remote database when started
const updateRemoteElectionStarted = async (election, blockchainTxHash) => {
  try {
    console.log(`Updating remote election status to started for election ID: ${election._id}`);
    
    // Create connection to remote database
    const remoteConnection = await createRemoteConnection();
    
    // Create models on the remote connection
    const RemoteElection = remoteConnection.model('Election', RemoteElectionSchema);
    
    // Find existing election in remote database by originalElectionId
    let remoteElection = await RemoteElection.findOne({ originalElectionId: election._id.toString() });
    
    if (remoteElection) {
      // Update existing election
      remoteElection.isActive = true;
      remoteElection.startedAt = new Date();
      if (blockchainTxHash) {
        remoteElection.blockchainStartTxHash = blockchainTxHash;
      }
      await remoteElection.save();
      console.log(`Updated existing remote election: ${remoteElection._id}`);
    } else {
      console.log('No existing remote election found. This election may not have been recorded in the remote database yet.');
    }
    
    // Close the remote connection
    await remoteConnection.close();
    console.log('Remote database connection closed');
    
    return { success: true, remoteElectionId: remoteElection?._id };
  } catch (error) {
    console.error('Error updating remote election status to started:', error);
    return { success: false, error: error.message };
  }
};

// Update election in remote database when ended
const updateRemoteElectionEnded = async (election, blockchainTxHash) => {
  try {
    console.log(`Updating remote election status to ended for election ID: ${election._id}`);
    
    // Create connection to remote database
    const remoteConnection = await createRemoteConnection();
    
    // Create models on the remote connection
    const RemoteElection = remoteConnection.model('Election', RemoteElectionSchema);
    const RemoteCandidate = remoteConnection.model('Candidate', RemoteCandidateSchema);
    
    // Find existing election in remote database by originalElectionId
    let remoteElection = await RemoteElection.findOne({ originalElectionId: election._id.toString() });
    
    if (remoteElection) {
      // Update existing election
      remoteElection.isActive = false;
      remoteElection.endedAt = new Date();
      remoteElection.totalVotes = election.totalVotes || 0;
      if (blockchainTxHash) {
        remoteElection.blockchainEndTxHash = blockchainTxHash;
      }
      await remoteElection.save();
      console.log(`Updated existing remote election: ${remoteElection._id}`);
      
      // Update remote candidates to match local candidates
      const localCandidates = await mongoose.model('Candidate').find({ election: election._id });
      
      // Update vote counts for remote candidates
      for (const localCandidate of localCandidates) {
        const remoteCandidate = await RemoteCandidate.findOne({ originalCandidateId: localCandidate._id.toString() });
        if (remoteCandidate) {
          remoteCandidate.voteCount = localCandidate.voteCount || 0;
          await remoteCandidate.save();
          console.log(`Updated vote count for remote candidate: ${remoteCandidate._id}`);
        }
      }
    } else {
      console.log('No existing remote election found. This election may not have been recorded in the remote database yet.');
    }
    
    // Close the remote connection
    await remoteConnection.close();
    console.log('Remote database connection closed');
    
    return { success: true, remoteElectionId: remoteElection?._id };
  } catch (error) {
    console.error('Error updating remote election status to ended:', error);
    return { success: false, error: error.message };
  }
};

// Update election in remote database when archived
const updateRemoteElectionArchived = async (election) => {
  try {
    console.log(`Updating remote election status to archived for election ID: ${election._id}`);
    
    // Create connection to remote database
    const remoteConnection = await createRemoteConnection();
    
    // Create models on the remote connection
    const RemoteElection = remoteConnection.model('Election', RemoteElectionSchema);
    const RemoteCandidate = remoteConnection.model('Candidate', RemoteCandidateSchema);
    
    // Find existing election in remote database by originalElectionId
    let remoteElection = await RemoteElection.findOne({ originalElectionId: election._id.toString() });
    
    if (remoteElection) {
      // Update existing election
      remoteElection.isArchived = true;
      remoteElection.archivedAt = election.archivedAt || new Date();
      remoteElection.totalVotes = election.totalVotes || 0;
      await remoteElection.save();
      console.log(`Updated existing remote election to archived: ${remoteElection._id}`);
      
      // Update remote candidates to be archived as well
      const remoteCandidates = await RemoteCandidate.find({ electionId: remoteElection._id });
      
      if (remoteCandidates.length > 0) {
        const updateResult = await RemoteCandidate.updateMany(
          { electionId: remoteElection._id },
          { $set: { isArchived: true } }
        );
        
        console.log(`Updated ${updateResult.modifiedCount} remote candidates to archived status`);
      }
    } else {
      console.log('No existing remote election found. This election may not have been recorded in the remote database yet.');
    }
    
    // Close the remote connection
    await remoteConnection.close();
    console.log('Remote database connection closed');
    
    return { success: true, remoteElectionId: remoteElection?._id };
  } catch (error) {
    console.error('Error updating remote election status to archived:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  updateRemoteElectionStarted,
  updateRemoteElectionEnded,
  updateRemoteElectionArchived,
  RemoteElectionSchema,
  RemoteCandidateSchema,
  RemoteVoteSchema,
  REMOTE_MONGO_URI,
  createRemoteConnection
}; 