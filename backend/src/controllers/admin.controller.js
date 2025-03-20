const User = require('../models/user.model');
const Voter = require('../models/voter.model');
const Candidate = require('../models/candidate.model');
const Election = require('../models/election.model');
const { 
  approveVoterOnBlockchain, 
  rejectVoterOnBlockchain,
  addCandidateOnBlockchain,
  startElectionOnBlockchain,
  endElectionOnBlockchain
} = require('../utils/blockchain.util');
const { sendVoterApprovalEmail, sendVoterRejectionEmail } = require('../utils/email.util');

// Get all voters
exports.getAllVoters = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Build query
    const query = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }
    
    // Find voters
    const voters = await Voter.find(query).sort({ createdAt: -1 });
    
    // Get user emails
    const userIds = voters.map(voter => voter.user);
    const users = await User.find({ _id: { $in: userIds } }).select('email walletAddress');
    
    // Map users to voters
    const votersWithEmail = voters.map(voter => {
      const user = users.find(u => u._id.toString() === voter.user.toString());
      return {
        id: voter._id,
        firstName: voter.firstName,
        middleName: voter.middleName,
        lastName: voter.lastName,
        fatherName: voter.fatherName,
        gender: voter.gender,
        age: voter.age,
        dateOfBirth: voter.dateOfBirth,
        voterId: voter.voterId,
        voterIdImage: voter.voterIdImage,
        status: voter.status,
        rejectionReason: voter.rejectionReason,
        email: user ? user.email : null,
        walletAddress: user ? user.walletAddress : null,
        createdAt: voter.createdAt
      };
    });
    
    res.json({ voters: votersWithEmail });
  } catch (error) {
    console.error('Get all voters error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get voter details
exports.getVoterDetails = async (req, res) => {
  try {
    const { voterId } = req.params;
    
    // Find voter
    const voter = await Voter.findById(voterId);
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }
    
    // Get user
    const user = await User.findById(voter.user).select('email walletAddress');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      voter: {
        id: voter._id,
        firstName: voter.firstName,
        middleName: voter.middleName,
        lastName: voter.lastName,
        fatherName: voter.fatherName,
        gender: voter.gender,
        age: voter.age,
        dateOfBirth: voter.dateOfBirth,
        voterId: voter.voterId,
        voterIdImage: voter.voterIdImage,
        status: voter.status,
        rejectionReason: voter.rejectionReason,
        email: user.email,
        walletAddress: user.walletAddress,
        blockchainRegistered: voter.blockchainRegistered,
        blockchainTxHash: voter.blockchainTxHash,
        createdAt: voter.createdAt,
        updatedAt: voter.updatedAt
      }
    });
  } catch (error) {
    console.error('Get voter details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve voter
exports.approveVoter = async (req, res) => {
  try {
    const { voterId } = req.params;
    
    // Find voter
    const voter = await Voter.findById(voterId);
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }
    
    // Check if voter is already approved
    if (voter.status === 'approved') {
      return res.status(400).json({ message: 'Voter is already approved' });
    }
    
    // Get user
    const user = await User.findById(voter.user);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Approve voter on blockchain
    const blockchainResult = await approveVoterOnBlockchain(user.walletAddress);
    
    if (!blockchainResult.success) {
      return res.status(500).json({ 
        message: 'Failed to approve voter on blockchain',
        error: blockchainResult.error
      });
    }
    
    // Update voter status
    voter.status = 'approved';
    voter.rejectionReason = null;
    await voter.save();
    
    // Send approval email
    await sendVoterApprovalEmail(user.email, voter.firstName);
    
    res.json({
      message: 'Voter approved successfully',
      voter: {
        id: voter._id,
        firstName: voter.firstName,
        lastName: voter.lastName,
        status: voter.status,
        blockchainTxHash: blockchainResult.txHash
      }
    });
  } catch (error) {
    console.error('Approve voter error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject voter
exports.rejectVoter = async (req, res) => {
  try {
    const { voterId } = req.params;
    const { reason } = req.body;
    
    // Validate reason
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    // Find voter
    const voter = await Voter.findById(voterId);
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }
    
    // Check if voter is already approved
    if (voter.status === 'approved') {
      return res.status(400).json({ message: 'Cannot reject an approved voter' });
    }
    
    // Get user
    const user = await User.findById(voter.user);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Reject voter on blockchain
    const blockchainResult = await rejectVoterOnBlockchain(user.walletAddress);
    
    // Update voter status
    voter.status = 'rejected';
    voter.rejectionReason = reason;
    await voter.save();
    
    // Send rejection email
    await sendVoterRejectionEmail(user.email, voter.firstName, reason);
    
    res.json({
      message: 'Voter rejected successfully',
      voter: {
        id: voter._id,
        firstName: voter.firstName,
        lastName: voter.lastName,
        status: voter.status,
        rejectionReason: voter.rejectionReason,
        blockchainTxHash: blockchainResult.success ? blockchainResult.txHash : null
      }
    });
  } catch (error) {
    console.error('Reject voter error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add candidate
exports.addCandidate = async (req, res) => {
  try {
    const { name, party, slogan } = req.body;
    
    // Validate required fields
    if (!name || !party) {
      return res.status(400).json({ message: 'Name and party are required' });
    }
    
    // Add candidate to blockchain
    const blockchainResult = await addCandidateOnBlockchain(name, party, slogan || '');
    
    if (!blockchainResult.success) {
      return res.status(500).json({ 
        message: 'Failed to add candidate on blockchain',
        error: blockchainResult.error
      });
    }
    
    // Create candidate in database
    const candidate = new Candidate({
      name,
      party,
      slogan: slogan || '',
      image: req.file ? `/uploads/${req.file.filename}` : null,
      blockchainId: blockchainResult.candidateId,
      blockchainTxHash: blockchainResult.txHash
    });
    
    await candidate.save();
    
    res.status(201).json({
      message: 'Candidate added successfully',
      candidate: {
        id: candidate._id,
        name: candidate.name,
        party: candidate.party,
        slogan: candidate.slogan,
        image: candidate.image,
        blockchainId: candidate.blockchainId
      }
    });
  } catch (error) {
    console.error('Add candidate error:', error);
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

// Start election
exports.startElection = async (req, res) => {
  try {
    const { title, description } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: 'Election title is required' });
    }
    
    // Check if there's an active election
    const activeElection = await Election.findOne({ isActive: true });
    if (activeElection) {
      return res.status(400).json({ message: 'There is already an active election' });
    }
    
    // Start election on blockchain
    const blockchainResult = await startElectionOnBlockchain();
    
    if (!blockchainResult.success) {
      return res.status(500).json({ 
        message: 'Failed to start election on blockchain',
        error: blockchainResult.error
      });
    }
    
    // Create election in database
    const election = new Election({
      title,
      description: description || '',
      startDate: new Date(),
      isActive: true,
      blockchainStartTxHash: blockchainResult.txHash
    });
    
    await election.save();
    
    res.status(201).json({
      message: 'Election started successfully',
      election: {
        id: election._id,
        title: election.title,
        description: election.description,
        startDate: election.startDate,
        isActive: election.isActive
      }
    });
  } catch (error) {
    console.error('Start election error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// End election
exports.endElection = async (req, res) => {
  try {
    // Find active election
    const activeElection = await Election.findOne({ isActive: true });
    if (!activeElection) {
      return res.status(404).json({ message: 'No active election found' });
    }
    
    // End election on blockchain
    const blockchainResult = await endElectionOnBlockchain();
    
    if (!blockchainResult.success) {
      return res.status(500).json({ 
        message: 'Failed to end election on blockchain',
        error: blockchainResult.error
      });
    }
    
    // Update election in database
    activeElection.isActive = false;
    activeElection.endDate = new Date();
    activeElection.blockchainEndTxHash = blockchainResult.txHash;
    
    await activeElection.save();
    
    res.json({
      message: 'Election ended successfully',
      election: {
        id: activeElection._id,
        title: activeElection.title,
        startDate: activeElection.startDate,
        endDate: activeElection.endDate,
        isActive: activeElection.isActive
      }
    });
  } catch (error) {
    console.error('End election error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get election status
exports.getElectionStatus = async (req, res) => {
  try {
    // Find active or most recent election
    const election = await Election.findOne().sort({ startDate: -1 });
    
    if (!election) {
      return res.json({ active: false, election: null });
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
      }
    });
  } catch (error) {
    console.error('Get election status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 