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

// Get election status
exports.getElectionStatus = async (req, res) => {
  try {
    // Find active or most recent election
    const election = await Election.findOne().sort({ startDate: -1 });
    
    // Get blockchain status
    const blockchainStatus = await getElectionStatusFromBlockchain();
    
    if (!election) {
      return res.json({ 
        active: false, 
        election: null,
        blockchainStatus: blockchainStatus.success ? blockchainStatus.data : null
      });
    }
    
    res.json({
      active: election.isActive,
      election: {
        id: election._id,
        title: election.title,
        description: election.description,
        startDate: election.startDate,
        endDate: election.endDate,
        isActive: election.isActive
      },
      blockchainStatus: blockchainStatus.success ? blockchainStatus.data : null
    });
  } catch (error) {
    console.error('Get election status error:', error);
    res.status(500).json({ message: 'Server error' });
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