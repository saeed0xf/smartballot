const Slot = require('../models/slot.model');
const Election = require('../models/election.model');
const Voter = require('../models/voter.model');
const Candidate = require('../models/candidate.model');
const Vote = require('../models/vote.model');
const { getElectionStatusFromBlockchain } = require('../utils/blockchain.util');
const { createRemoteConnection, RemoteElectionSchema, RemoteVoteSchema, RemoteCandidateSchema } = require('../utils/remoteDb.util');

// Get all slots
exports.getAllSlots = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find slots for this officer
    const slots = await Slot.find({ officer: userId }).sort({ date: 1, startTime: 1 });
    
    res.json({ slots });
  } catch (error) {
    console.error('Get all slots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get slot details
exports.getSlotDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { slotId } = req.params;
    
    // Find slot
    const slot = await Slot.findOne({ _id: slotId, officer: userId });
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    
    res.json({ slot });
  } catch (error) {
    console.error('Get slot details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add slot
exports.addSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, date, startTime, endTime, location } = req.body;
    
    // Validate required fields
    if (!title || !date || !startTime || !endTime || !location) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    
    // Create new slot
    const slot = new Slot({
      title,
      description: description || '',
      date: new Date(date),
      startTime,
      endTime,
      location,
      officer: userId,
      status: 'scheduled'
    });
    
    await slot.save();
    
    res.status(201).json({
      message: 'Slot added successfully',
      slot: {
        id: slot._id,
        title: slot.title,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: slot.location,
        status: slot.status
      }
    });
  } catch (error) {
    console.error('Add slot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update slot
exports.updateSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { slotId } = req.params;
    const { title, description, date, startTime, endTime, location, status, notes } = req.body;
    
    // Find slot
    const slot = await Slot.findOne({ _id: slotId, officer: userId });
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    
    // Update slot
    if (title) slot.title = title;
    if (description !== undefined) slot.description = description;
    if (date) slot.date = new Date(date);
    if (startTime) slot.startTime = startTime;
    if (endTime) slot.endTime = endTime;
    if (location) slot.location = location;
    if (status && ['scheduled', 'ongoing', 'completed', 'cancelled'].includes(status)) {
      slot.status = status;
    }
    if (notes !== undefined) slot.notes = notes;
    
    await slot.save();
    
    res.json({
      message: 'Slot updated successfully',
      slot: {
        id: slot._id,
        title: slot.title,
        description: slot.description,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: slot.location,
        status: slot.status,
        notes: slot.notes
      }
    });
  } catch (error) {
    console.error('Update slot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete slot
exports.deleteSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { slotId } = req.params;
    
    // Find and delete slot
    const slot = await Slot.findOneAndDelete({ _id: slotId, officer: userId });
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    
    res.json({ message: 'Slot deleted successfully' });
  } catch (error) {
    console.error('Delete slot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get voter statistics (for officers - no admin privileges required)
exports.getVoterStats = async (req, res) => {
  try {
    console.log('Getting voter statistics for officer dashboard');
    
    // Get voter counts by status
    const totalVoters = await Voter.countDocuments({ status: 'approved' });
    const pendingVoters = await Voter.countDocuments({ status: 'pending' });
    const rejectedVoters = await Voter.countDocuments({ status: 'rejected' });
    
    console.log(`Voter stats: Total=${totalVoters}, Pending=${pendingVoters}, Rejected=${rejectedVoters}`);
    
    res.json({
      totalVoters,
      pendingVoters,
      rejectedVoters,
      activeVoters: totalVoters
    });
  } catch (error) {
    console.error('Get voter stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get election statistics from blockchain
exports.getRemoteElectionStats = async (req, res) => {
  let remoteConnection = null;
  
  try {
    console.log('Getting remote election stats');
    
    // Connect to blockchain
    remoteConnection = await createRemoteConnection();
    if (!remoteConnection) {
      return res.status(500).json({ message: 'Failed to connect to blockchain' });
    }
    
    // Create models on the remote connection
    const RemoteElection = remoteConnection.model('Election', RemoteElectionSchema);
    
    // Count total and active elections
    const totalElections = await RemoteElection.countDocuments();
    const activeElections = await RemoteElection.countDocuments({ isActive: true });
    
    console.log(`Remote elections stats: Total=${totalElections}, Active=${activeElections}`);
    
    res.json({ 
      totalElections,
      activeElections,
      completedElections: totalElections - activeElections
    });
  } catch (error) {
    console.error('Get remote election stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    // Close remote connection
    if (remoteConnection) {
      await remoteConnection.close();
      console.log('blockchain connection closed');
    }
  }
};

// Get vote count from blockchain (votes collection)
exports.getRemoteVotesCount = async (req, res) => {
  let remoteConnection = null;
  
  try {
    console.log('Getting remote votes count');
    
    // Connect to blockchain
    remoteConnection = await createRemoteConnection();
    if (!remoteConnection) {
      return res.status(500).json({ message: 'Failed to connect to blockchain' });
    }
    
    // Create models on the remote connection
    const RemoteElection = remoteConnection.model('Election', RemoteElectionSchema);
    const RemoteVote = remoteConnection.model('Vote', RemoteVoteSchema);
    
    // Get active election IDs
    const activeElections = await RemoteElection.find({ isActive: true }, '_id');
    const activeElectionIds = activeElections.map(election => election._id.toString());
    
    console.log(`Found ${activeElectionIds.length} active elections`);
    
    // Count votes for active elections
    const totalVotes = activeElectionIds.length > 0 ? 
      await RemoteVote.countDocuments({ electionId: { $in: activeElectionIds } }) : 
      0;
    
    // Count verified and pending videos
    const verifiedVideos = await RemoteVote.countDocuments({ 
      recordingUrl: { $exists: true, $ne: null }
    });
    const pendingVideos = await RemoteVote.countDocuments({ 
      $or: [
        { recordingUrl: { $exists: false } },
        { recordingUrl: null }
      ]
    });
    
    console.log(`Remote votes stats: Total=${totalVotes}, Verified=${verifiedVideos}, Pending=${pendingVideos}`);
    
    res.json({ 
      totalVotes,
      verifiedVideos,
      pendingVideos
    });
  } catch (error) {
    console.error('Get remote votes count error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    // Close remote connection
    if (remoteConnection) {
      await remoteConnection.close();
      console.log('blockchain connection closed');
    }
  }
};

// Get recent elections from blockchain
exports.getRecentElections = async (req, res) => {
  let remoteConnection = null;
  
  try {
    console.log('Getting recent elections');
    
    // Connect to blockchain
    remoteConnection = await createRemoteConnection();
    if (!remoteConnection) {
      return res.status(500).json({ message: 'Failed to connect to blockchain' });
    }
    
    // Create models on the remote connection
    const RemoteElection = remoteConnection.model('Election', RemoteElectionSchema);
    const RemoteVote = remoteConnection.model('Vote', RemoteVoteSchema);
    
    // Get recent elections (limit to 5)
    const elections = await RemoteElection
      .find({})
      .sort({ startDate: -1 })
      .limit(5)
      .lean();
    
    console.log(`Found ${elections.length} recent elections`);
    
    // Enhance each election with vote counts and turnout
    const enhancedElections = await Promise.all(elections.map(async (election) => {
      // Count votes for this election
      const voteCount = await RemoteVote.countDocuments({ 
        electionId: election._id.toString()
      });
      
      // Calculate voter turnout (assuming totalVoters is stored in the election document)
      // If not, we'll just return 'N/A'
      let voterTurnout = 'N/A';
      if (election.totalVoters && election.totalVoters > 0) {
        const percentage = (voteCount / election.totalVoters) * 100;
        voterTurnout = `${percentage.toFixed(1)}%`;
      }
      
      return {
        ...election,
        totalVotes: voteCount,
        voterTurnout
      };
    }));
    
    console.log(`Enhanced ${enhancedElections.length} elections with vote data`);
    
    res.json({
      elections: enhancedElections
    });
  } catch (error) {
    console.error('Get recent elections error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    // Close remote connection
    if (remoteConnection) {
      await remoteConnection.close();
      console.log('blockchain connection closed');
    }
  }
};

// Get election results from blockchain
exports.getElectionResults = async (req, res) => {
  let remoteConnection = null;
  
  try {
    const { electionId } = req.params;
    console.log(`Getting election results for election ID: ${electionId}`);
    
    // Connect to blockchain
    remoteConnection = await createRemoteConnection();
    if (!remoteConnection) {
      return res.status(500).json({ message: 'Failed to connect to blockchain' });
    }
    
    // Create models on the remote connection
    const RemoteElection = remoteConnection.model('Election', RemoteElectionSchema);
    const RemoteCandidate = remoteConnection.model('Candidate', RemoteCandidateSchema);
    const RemoteVote = remoteConnection.model('Vote', RemoteVoteSchema);
    
    // Get election details
    const election = await RemoteElection.findById(electionId).lean();
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    // Get candidates for this election
    const candidates = await RemoteCandidate.find({ 
      electionId: electionId 
    }).lean();
    
    // Get all votes for this election
    const votes = await RemoteVote.find({ 
      electionId: electionId 
    }).lean();
    
    // Calculate vote counts for each candidate
    const candidateVoteCounts = {};
    let totalVotes = 0;
    let noneOfTheAboveVotes = 0;
    
    votes.forEach(vote => {
      if (vote.isNoneOption) {
        noneOfTheAboveVotes++;
      } else if (vote.candidateId) {
        candidateVoteCounts[vote.candidateId] = (candidateVoteCounts[vote.candidateId] || 0) + 1;
      }
      totalVotes++;
    });
    
    // Enhance candidates with vote counts and percentages
    const enhancedCandidates = candidates.map(candidate => {
      const voteCount = candidateVoteCounts[candidate._id.toString()] || 0;
      const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(2) : 0;
      
      return {
        ...candidate,
        votes: voteCount,
        percentage: parseFloat(percentage)
      };
    });
    
    // Sort candidates by vote count (descending)
    enhancedCandidates.sort((a, b) => b.votes - a.votes);
    
    // Calculate voter turnout
    const voterTurnout = election.totalVoters && election.totalVoters > 0 
      ? ((totalVotes / election.totalVoters) * 100).toFixed(1) + '%'
      : 'N/A';
    
    // Get blockchain transactions for this election
    const blockchainTransactions = votes.map(vote => ({
      txHash: vote.blockchainTxHash,
      type: 'Vote',
      timestamp: vote.timestamp,
      from: `0x${vote.voterId.slice(-40)}`, // Mock wallet address from voter ID
      data: {
        candidateId: vote.candidateId,
        electionId: vote.electionId,
        isNoneOption: vote.isNoneOption
      },
      status: vote.confirmed ? 'Confirmed' : 'Pending',
      blockNumber: vote.blockInfo?.blockNumber || Math.floor(Math.random() * 1000000) + 15000000
    }));
    
    console.log(`Found ${enhancedCandidates.length} candidates and ${totalVotes} votes for election ${electionId}`);
    
    res.json({
      election: {
        ...election,
        totalVotes,
        voterTurnout,
        noneOfTheAboveVotes
      },
      candidates: enhancedCandidates,
      blockchainTransactions,
      statistics: {
        totalVotes,
        totalCandidates: candidates.length,
        noneOfTheAboveVotes,
        voterTurnout
      }
    });
  } catch (error) {
    console.error('Get election results error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    // Close remote connection
    if (remoteConnection) {
      await remoteConnection.close();
      console.log('blockchain connection closed');
    }
  }
};

// Get all elections from blockchain for statistics page
exports.getAllElections = async (req, res) => {
  let remoteConnection = null;
  
  try {
    console.log('Getting all elections from blockchain');
    
    // Connect to blockchain
    remoteConnection = await createRemoteConnection();
    if (!remoteConnection) {
      return res.status(500).json({ message: 'Failed to connect to blockchain' });
    }
    
    // Create models on the remote connection
    const RemoteElection = remoteConnection.model('Election', RemoteElectionSchema);
    const RemoteVote = remoteConnection.model('Vote', RemoteVoteSchema);
    
    // Get all elections
    const elections = await RemoteElection.find({}).sort({ startDate: -1 }).lean();
    
    // Enhance each election with vote counts
    const enhancedElections = await Promise.all(elections.map(async (election) => {
      const voteCount = await RemoteVote.countDocuments({ 
        electionId: election._id.toString()
      });
      
      const voterTurnout = election.totalVoters && election.totalVoters > 0 
        ? ((voteCount / election.totalVoters) * 100).toFixed(1) + '%'
        : 'N/A';
      
      return {
        ...election,
        totalVotes: voteCount,
        voterTurnout
      };
    }));
    
    console.log(`Found ${enhancedElections.length} elections`);
    
    res.json({
      elections: enhancedElections
    });
  } catch (error) {
    console.error('Get all elections error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    // Close remote connection
    if (remoteConnection) {
      await remoteConnection.close();
      console.log('blockchain connection closed');
    }
  }
};

// Get election monitoring data
exports.getMonitoringData = async (req, res) => {
  try {
    // Find active election
    const election = await Election.findOne({ isActive: true });
    
    // Get blockchain status
    const blockchainStatus = await getElectionStatusFromBlockchain();
    
    // Get voter statistics
    const totalVoters = await Voter.countDocuments({ status: 'approved' });
    const votedCount = await Vote.countDocuments();
    
    // Get candidate statistics
    const candidates = await Candidate.find().sort({ voteCount: -1 });
    
    // Calculate voting percentage
    const votingPercentage = totalVoters > 0 ? (votedCount / totalVoters) * 100 : 0;
    
    res.json({
      election: election ? {
        id: election._id,
        title: election.title,
        startDate: election.startDate,
        isActive: election.isActive
      } : null,
      statistics: {
        totalVoters,
        votedCount,
        votingPercentage: Math.round(votingPercentage * 100) / 100,
        remainingVoters: totalVoters - votedCount
      },
      candidates: candidates.map(c => ({
        id: c._id,
        name: c.name,
        party: c.party,
        voteCount: c.voteCount
      })),
      blockchainStatus: blockchainStatus.success ? blockchainStatus.data : null
    });
  } catch (error) {
    console.error('Get monitoring data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 