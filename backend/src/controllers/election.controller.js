const User = require('../models/user.model');
const Voter = require('../models/voter.model');
const Candidate = require('../models/candidate.model');
const Election = require('../models/election.model');
const Vote = require('../models/vote.model');
const { 
  castVoteOnBlockchain,
  getVoterStatusFromBlockchain,
  getCandidateFromBlockchain,
  getElectionStatusFromBlockchain
} = require('../utils/blockchain.util');
const mongoose = require('mongoose');

// Get all elections
exports.getAllElections = async (req, res) => {
  try {
    console.log('Fetching all elections');
    const elections = await Election.find();
    console.log(`Found ${elections.length} elections`);
    res.status(200).json(elections);
  } catch (error) {
    console.error('Error fetching elections:', error);
    res.status(500).json({ message: 'Failed to fetch elections', error: error.message });
  }
};

// Get election by ID
exports.getElectionById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching election with id: ${id}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }
    
    const election = await Election.findById(id);
    
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    res.status(200).json(election);
  } catch (error) {
    console.error('Error fetching election:', error);
    res.status(500).json({ message: 'Failed to fetch election', error: error.message });
  }
};

// Create a new election
exports.createElection = async (req, res) => {
  try {
    console.log('Create election request received:', req.body);
    const { name, title, type, description, startDate, endDate } = req.body;
    
    // Use name or title (frontend sends name, but schema expects title)
    const electionTitle = title || name;
    const electionType = type || 'Lok Sabha Elections (General Elections)';
    
    // Log the election type being used
    console.log('Using election type:', electionType);
    
    // Validate required fields
    if (!electionTitle || !electionType || !description || !startDate || !endDate) {
      return res.status(400).json({ 
        message: 'All fields are required',
        details: { 
          title: !electionTitle ? 'Election title is required' : null,
          type: !electionType ? 'Election type is required' : null,
          description: !description ? 'Description is required' : null,
          startDate: !startDate ? 'Start date is required' : null,
          endDate: !endDate ? 'End date is required' : null
        }
      });
    }
    
    // Create new election
    const newElection = new Election({
      title: electionTitle, // Use the electionTitle variable
      type: electionType,   // Use the electionType variable
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: false,
      createdBy: req.userId // Set by auth middleware
    });
    
    try {
      const savedElection = await newElection.save();
      console.log('Election created successfully:', savedElection);
      res.status(201).json(savedElection);
    } catch (dbError) {
      console.error('Error saving election to database:', dbError);
      // Return a more detailed error message
      res.status(500).json({ 
        message: 'Failed to create election in database', 
        error: dbError.message,
        details: dbError.errors ? Object.keys(dbError.errors).map(key => ({
          field: key,
          message: dbError.errors[key].message
        })) : null
      });
    }
  } catch (error) {
    console.error('Error creating election:', error);
    res.status(500).json({ message: 'Failed to create election', error: error.message });
  }
};

// Update an existing election
exports.updateElection = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating election with id: ${id}`, req.body);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }
    
    const { name, title, type, description, startDate, endDate } = req.body;
    
    // Use title or name, and ensure type is preserved
    const electionTitle = title || name || '';
    const electionName = name || title || '';
    const electionType = type || 'Lok Sabha Elections (General Elections)';
    
    console.log('Using election title:', electionTitle);
    console.log('Using election name:', electionName);
    console.log('Using election type for update:', electionType);
    
    // Find and update election with both name and title fields explicitly
    const updatedElection = await Election.findByIdAndUpdate(
      id,
      { 
        title: electionTitle, 
        name: electionName,  // Explicitly save the name field
        type: electionType,
        description, 
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedElection) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    console.log('Election updated successfully:', updatedElection);
    res.status(200).json(updatedElection);
  } catch (error) {
    console.error('Error updating election:', error);
    res.status(500).json({ message: 'Failed to update election', error: error.message });
  }
};

// Delete an election
exports.deleteElection = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting election with id: ${id}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }
    
    // Check if election is active
    const election = await Election.findById(id);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    if (election.isActive) {
      return res.status(400).json({ message: 'Cannot delete an active election' });
    }
    
    // Delete the election
    await Election.findByIdAndDelete(id);
    console.log('Election deleted successfully');
    
    res.status(200).json({ message: 'Election deleted successfully' });
  } catch (error) {
    console.error('Error deleting election:', error);
    res.status(500).json({ message: 'Failed to delete election', error: error.message });
  }
};

// Start an election
exports.startElection = async (req, res) => {
  try {
    const { electionId } = req.body;
    console.log(`Starting election with id: ${electionId}`);
    
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }
    
    // Find the election
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    // Check if the election is already active
    if (election.isActive) {
      return res.status(400).json({ message: 'Election is already active' });
    }
    
    // Check if there are candidates for this election
    const candidatesCount = await Candidate.countDocuments({ electionType: election.type });
    if (candidatesCount === 0) {
      return res.status(400).json({ message: 'Cannot start an election without candidates' });
    }
    
    // Start the election
    election.isActive = true;
    election.startedAt = Date.now();
    await election.save();
    
    console.log('Election started successfully:', election);
    
    // TODO: Blockchain integration - Record the election start on blockchain
    // This would be implemented according to your blockchain setup
    
    res.status(200).json({ 
      message: 'Election started successfully',
      election
    });
  } catch (error) {
    console.error('Error starting election:', error);
    res.status(500).json({ message: 'Failed to start election', error: error.message });
  }
};

// End an election
exports.endElection = async (req, res) => {
  try {
    const { electionId } = req.body;
    console.log(`Ending election with id: ${electionId}`);
    
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }
    
    // Find the election
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    // Check if the election is active
    if (!election.isActive) {
      return res.status(400).json({ message: 'Election is not active' });
    }
    
    // End the election
    election.isActive = false;
    election.endedAt = Date.now();
    await election.save();
    
    console.log('Election ended successfully:', election);
    
    // TODO: Blockchain integration - Record the election end and results on blockchain
    // This would be implemented according to your blockchain setup
    
    res.status(200).json({ 
      message: 'Election ended successfully',
      election
    });
  } catch (error) {
    console.error('Error ending election:', error);
    res.status(500).json({ message: 'Failed to end election', error: error.message });
  }
};

// Get active elections
exports.getActiveElections = async (req, res) => {
  try {
    console.log('Fetching active elections');
    const activeElections = await Election.find({ isActive: true });
    console.log(`Found ${activeElections.length} active elections`);
    res.status(200).json(activeElections);
  } catch (error) {
    console.error('Error fetching active elections:', error);
    res.status(500).json({ message: 'Failed to fetch active elections', error: error.message });
  }
};

// Get election status - enhanced to handle different request formats
exports.getElectionStatus = async (req, res) => {
  try {
    console.log('Get election status request received', req.params);
    // Try to get electionId from different places
    let electionId = req.params.electionId;
    
    // If no specific election ID is provided, find the most recent or active election
    if (!electionId) {
      console.log('No specific election ID provided, finding active or most recent election');
      const election = await Election.findOne().sort({ startDate: -1 });
      
      if (!election) {
        return res.status(200).json({ 
          message: 'No election found',
          active: false,
          election: null,
          currentTime: new Date()
        });
      }
      
      return res.status(200).json({
        active: election.isActive,
        election: {
          id: election._id,
          name: election.name || election.title,
          title: election.title,
          type: election.type,
          description: election.description,
          startDate: election.startDate,
          endDate: election.endDate,
          isActive: election.isActive
        },
        currentTime: new Date()
      });
    }
    
    // Find the specific election if ID is provided
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }
    
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    return res.status(200).json({
      active: election.isActive,
      election: {
        id: election._id,
        name: election.name || election.title,
        title: election.title,
        type: election.type,
        description: election.description,
        startDate: election.startDate,
        endDate: election.endDate,
        isActive: election.isActive
      },
      currentTime: new Date()
    });
  } catch (error) {
    console.error('Error fetching election status:', error);
    res.status(500).json({ message: 'Failed to fetch election status', error: error.message });
  }
};

// Get all candidates
exports.getAllCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ name: 1 });
    
    res.json({ candidates });
  } catch (error) {
    console.error('Get all candidates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get candidate details
exports.getCandidateDetails = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    // Find candidate
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    // Get blockchain data
    const blockchainData = await getCandidateFromBlockchain(candidate.blockchainId);
    
    res.json({
      candidate: {
        id: candidate._id,
        name: candidate.name,
        party: candidate.party,
        slogan: candidate.slogan,
        image: candidate.image,
        blockchainId: candidate.blockchainId,
        voteCount: blockchainData.success ? blockchainData.data.voteCount : candidate.voteCount
      }
    });
  } catch (error) {
    console.error('Get candidate details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cast vote
exports.castVote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { candidateId, privateKey } = req.body;
    
    // Validate required fields
    if (!candidateId || !privateKey) {
      return res.status(400).json({ message: 'Candidate ID and private key are required' });
    }
    
    // Find active election
    const election = await Election.findOne({ isActive: true });
    if (!election) {
      return res.status(400).json({ message: 'No active election found' });
    }
    
    // Find voter
    const voter = await Voter.findOne({ user: userId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter profile not found' });
    }
    
    // Check if voter is approved
    if (voter.status !== 'approved') {
      return res.status(403).json({ message: 'Voter is not approved' });
    }
    
    // Find candidate
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    // Check if voter has already voted
    const existingVote = await Vote.findOne({ voter: voter._id, election: election._id });
    if (existingVote) {
      return res.status(400).json({ message: 'Voter has already cast a vote in this election' });
    }
    
    // Cast vote on blockchain
    const blockchainResult = await castVoteOnBlockchain(privateKey, candidate.blockchainId);
    
    if (!blockchainResult.success) {
      return res.status(500).json({ 
        message: 'Failed to cast vote on blockchain',
        error: blockchainResult.error
      });
    }
    
    // Create vote record
    const vote = new Vote({
      voter: voter._id,
      candidate: candidate._id,
      election: election._id,
      blockchainTxHash: blockchainResult.txHash
    });
    
    await vote.save();
    
    // Update candidate vote count
    candidate.voteCount += 1;
    await candidate.save();
    
    res.json({
      message: 'Vote cast successfully',
      vote: {
        id: vote._id,
        candidate: {
          id: candidate._id,
          name: candidate.name,
          party: candidate.party
        },
        blockchainTxHash: blockchainResult.txHash
      }
    });
  } catch (error) {
    console.error('Cast vote error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify vote
exports.verifyVote = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find active or most recent election
    const election = await Election.findOne().sort({ startDate: -1 });
    if (!election) {
      return res.status(404).json({ message: 'No election found' });
    }
    
    // Find voter
    const voter = await Voter.findOne({ user: userId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter profile not found' });
    }
    
    // Find vote
    const vote = await Vote.findOne({ voter: voter._id, election: election._id }).populate('candidate');
    if (!vote) {
      return res.status(404).json({ message: 'No vote found for this election' });
    }
    
    // Get user for wallet address
    const user = await User.findById(userId);
    
    // Get blockchain status
    let blockchainStatus = null;
    if (user.walletAddress) {
      blockchainStatus = await getVoterStatusFromBlockchain(user.walletAddress);
    }
    
    res.json({
      vote: {
        id: vote._id,
        timestamp: vote.timestamp,
        candidate: {
          id: vote.candidate._id,
          name: vote.candidate.name,
          party: vote.candidate.party,
          slogan: vote.candidate.slogan,
          image: vote.candidate.image
        },
        blockchainTxHash: vote.blockchainTxHash,
        blockchainStatus: blockchainStatus?.success ? {
          hasVoted: blockchainStatus.data.hasVoted,
          votedCandidateId: blockchainStatus.data.votedCandidateId
        } : null
      }
    });
  } catch (error) {
    console.error('Verify vote error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get election results
exports.getElectionResults = async (req, res) => {
  try {
    // Find active or most recent election
    const election = await Election.findOne().sort({ startDate: -1 });
    if (!election) {
      return res.status(404).json({ message: 'No election found' });
    }
    
    // Check if election has ended
    if (election.isActive) {
      return res.status(400).json({ message: 'Election is still ongoing' });
    }
    
    // Get all candidates
    const candidates = await Candidate.find().sort({ voteCount: -1 });
    
    // Get blockchain status
    const blockchainStatus = await getElectionStatusFromBlockchain();
    
    // Get candidate details from blockchain
    const candidatesWithBlockchainData = await Promise.all(
      candidates.map(async (candidate) => {
        const blockchainData = await getCandidateFromBlockchain(candidate.blockchainId);
        return {
          id: candidate._id,
          name: candidate.name,
          party: candidate.party,
          slogan: candidate.slogan,
          image: candidate.image,
          voteCount: blockchainData.success ? blockchainData.data.voteCount : candidate.voteCount
        };
      })
    );
    
    res.json({
      election: {
        id: election._id,
        title: election.title,
        name: election.name || election.title,
        type: election.type,
        description: election.description,
        startDate: election.startDate,
        endDate: election.endDate
      },
      results: candidatesWithBlockchainData,
      totalVotes: blockchainStatus.success ? blockchainStatus.data.totalVotes : candidates.reduce((sum, c) => sum + c.voteCount, 0)
    });
  } catch (error) {
    console.error('Get election results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 