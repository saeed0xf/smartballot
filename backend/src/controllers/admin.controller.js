const User = require('../models/user.model');
const Voter = require('../models/voter.model');
const Candidate = require('../models/candidate.model');
const Election = require('../models/election.model');
const { 
  approveVoterOnBlockchain, 
  rejectVoterOnBlockchain,
  addCandidateOnBlockchain,
  startElectionOnBlockchain,
  endElectionOnBlockchain,
  getVoterStatusFromBlockchain
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
    const voters = await Voter.find(query).populate('user', 'email walletAddress').sort({ createdAt: -1 });
    
    // Map users to voters
    const votersWithDetails = voters.map(voter => {
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
        email: voter.user ? voter.user.email : null,
        walletAddress: voter.user ? voter.user.walletAddress : null,
        createdAt: voter.createdAt,
        blockchainRegistered: voter.blockchainRegistered,
        blockchainTxHash: voter.blockchainTxHash
      };
    });
    
    console.log(`Returning ${votersWithDetails.length} voters with status: ${status || 'all'}`);
    res.json({ voters: votersWithDetails });
  } catch (error) {
    console.error('Get all voters error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get voter details
exports.getVoterDetails = async (req, res) => {
  try {
    const { voterId } = req.params;
    
    console.log(`Getting details for voter ID: ${voterId}`);
    
    // Find voter
    const voter = await Voter.findById(voterId);
    if (!voter) {
      console.log(`Voter not found with ID: ${voterId}`);
      return res.status(404).json({ message: 'Voter not found' });
    }
    
    console.log(`Found voter: ${voter._id}, user ID: ${voter.user}`);
    
    // Get user
    const user = await User.findById(voter.user).select('email walletAddress');
    if (!user) {
      console.log(`User not found for voter: ${voterId}, user ID: ${voter.user}`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`Found user with email: ${user.email || voter.email || 'none'}, wallet: ${user.walletAddress || 'none'}`);
    
    // Format voter ID image path
    let voterIdImage = voter.voterIdImage;
    if (voterIdImage) {
      // Remove any leading slash
      if (voterIdImage.startsWith('/')) {
        voterIdImage = voterIdImage.substring(1);
      }
      
      // Add /uploads prefix if not present and not an absolute URL
      if (!voterIdImage.startsWith('uploads/') && !voterIdImage.startsWith('http')) {
        voterIdImage = `uploads/${voterIdImage}`;
      }
      
      console.log(`Formatted voter ID image path: ${voterIdImage}`);
    }
    
    const voterDetails = {
      id: voter._id,
      firstName: voter.firstName,
      middleName: voter.middleName,
      lastName: voter.lastName,
      fatherName: voter.fatherName,
      gender: voter.gender,
      age: voter.age,
      dateOfBirth: voter.dateOfBirth,
      voterId: voter.voterId,
      voterIdImage: voterIdImage,
      status: voter.status,
      rejectionReason: voter.rejectionReason,
      email: user.email || voter.email || null, // Try to get email from user first, then from voter
      walletAddress: user.walletAddress,
      blockchainRegistered: voter.blockchainRegistered,
      blockchainTxHash: voter.blockchainTxHash,
      createdAt: voter.createdAt,
      updatedAt: voter.updatedAt
    };
    
    console.log(`Sending voter details with email: ${voterDetails.email || 'none'}`);
    
    res.json({
      voter: voterDetails
    });
  } catch (error) {
    console.error('Get voter details error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Approve voter
exports.approveVoter = async (req, res) => {
  try {
    const { voterId } = req.params;
    const { useMetaMask } = req.body; // Extract MetaMask flag from request
    
    console.log(`Approving voter with ID: ${voterId}, useMetaMask: ${useMetaMask}`);
    
    // Find voter
    const voter = await Voter.findById(voterId);
    if (!voter) {
      console.log(`Voter not found with ID: ${voterId}`);
      return res.status(404).json({ message: 'Voter not found' });
    }
    
    console.log(`Found voter: ${voter._id}, status: ${voter.status}`);
    
    // Check if voter is already approved in our database
    if (voter.status === 'approved') {
      console.log(`Voter ${voterId} is already approved in database`);
      return res.status(400).json({ message: 'Voter is already approved' });
    }
    
    // Get user
    const user = await User.findById(voter.user);
    if (!user) {
      console.log(`User not found for voter: ${voterId}, user ID: ${voter.user}`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`Found user with wallet address: ${user.walletAddress || 'none'}`);
    
    // Validate wallet address
    if (!user.walletAddress) {
      console.log(`No wallet address for user: ${user._id}`);
      return res.status(400).json({ message: 'User has no wallet address' });
    }
    
    // Update user email if it exists in voter but not in user
    if (!user.email && voter.email) {
      console.log(`Updating user ${user._id} with email from voter: ${voter.email}`);
      user.email = voter.email;
      await user.save();
    }
    
    console.log(`Attempting to approve voter on blockchain with wallet: ${user.walletAddress}`);
    
    // Check if voter is already approved on blockchain
    try {
      console.log(`Checking if voter is already approved on blockchain: ${user.walletAddress}`);
      const statusResult = await getVoterStatusFromBlockchain(user.walletAddress);
      
      if (statusResult.success && statusResult.data.isApproved) {
        console.log(`Voter ${user.walletAddress} is already approved on blockchain`);
        
        // Update voter status in our database to match blockchain
        voter.status = 'approved';
        voter.rejectionReason = null;
        voter.blockchainRegistered = true;
        // No transaction hash since we didn't perform a new transaction
        
        await voter.save();
        
        console.log(`Voter ${voterId} status updated to approved (to match blockchain)`);
        
        return res.json({
          message: 'Voter was already approved on blockchain, database updated',
          voter: {
            id: voter._id,
            firstName: voter.firstName,
            lastName: voter.lastName,
            status: voter.status
          }
        });
      }
    } catch (checkError) {
      console.warn(`Error checking voter approval status: ${checkError.message}`);
      // Continue with approval process as normal
    }
    
    // Approve voter on blockchain - pass useMetaMask option
    const blockchainResult = await approveVoterOnBlockchain(user.walletAddress, { useMetaMask });
    
    console.log(`Blockchain approval result:`, blockchainResult);
    
    // Handle MetaMask transaction case
    if (blockchainResult.success && blockchainResult.useMetaMask) {
      console.log('Returning MetaMask transaction details to frontend');
      return res.json({
        message: 'Please approve the transaction in MetaMask',
        useMetaMask: true,
        contractDetails: {
          address: blockchainResult.contractAddress,
          method: blockchainResult.methodName,
          params: blockchainResult.params
        },
        voter: {
          id: voter._id,
          firstName: voter.firstName,
          lastName: voter.lastName,
          status: voter.status
        }
      });
    }
    
    // Special handling for "Voter already approved" error
    if (!blockchainResult.success && 
        blockchainResult.error && 
        blockchainResult.error.includes('Voter already approved')) {
      console.log(`Voter ${user.walletAddress} was already approved on blockchain`);
      
      // Update voter status in our database
      voter.status = 'approved';
      voter.rejectionReason = null;
      voter.blockchainRegistered = true;
      
      await voter.save();
      
      console.log(`Voter ${voterId} status updated to approved (to match blockchain)`);
      
      return res.json({
        message: 'Voter was already approved on blockchain, database updated',
        voter: {
          id: voter._id,
          firstName: voter.firstName,
          lastName: voter.lastName,
          status: voter.status
        }
      });
    }
    
    // Handle other blockchain errors
    if (!blockchainResult.success) {
      console.error(`Failed to approve voter ${voterId} on blockchain:`, blockchainResult.error);
      return res.status(500).json({ 
        message: 'Failed to approve voter on blockchain',
        error: blockchainResult.error,
        details: blockchainResult.details || blockchainResult.stack
      });
    }
    
    // Update voter status
    voter.status = 'approved';
    voter.rejectionReason = null;
    voter.blockchainRegistered = true;
    voter.blockchainTxHash = blockchainResult.txHash;
    
    await voter.save();
    
    console.log(`Voter ${voterId} status updated to approved`);
    
    // Send approval email
    const userEmail = user.email || voter.email;
    try {
      if (userEmail) {
        console.log(`Attempting to send approval email to ${userEmail} using Brevo API`);
        const emailResult = await sendVoterApprovalEmail(userEmail, voter.firstName);
        console.log(`Approval email sent to ${userEmail}, result:`, emailResult);
      } else {
        console.log(`No email available for voter ${voterId}, skipping notification`);
      }
    } catch (emailError) {
      console.error(`Error sending approval email to ${userEmail}:`, emailError);
      // Continue despite email error
    }
    
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
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Reject voter
exports.rejectVoter = async (req, res) => {
  try {
    const { voterId } = req.params;
    const { reason } = req.body;
    
    console.log(`Rejecting voter with ID: ${voterId}, reason: ${reason}`);
    
    // Validate reason
    if (!reason) {
      console.log('No rejection reason provided');
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    // Find voter
    const voter = await Voter.findById(voterId);
    if (!voter) {
      console.log(`Voter not found with ID: ${voterId}`);
      return res.status(404).json({ message: 'Voter not found' });
    }
    
    console.log(`Found voter: ${voter._id}, status: ${voter.status}`);
    
    // Check if voter is already approved
    if (voter.status === 'approved') {
      console.log(`Cannot reject approved voter ${voterId}`);
      return res.status(400).json({ message: 'Cannot reject an approved voter' });
    }
    
    // Get user
    const user = await User.findById(voter.user);
    if (!user) {
      console.log(`User not found for voter: ${voterId}, user ID: ${voter.user}`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`Found user with wallet address: ${user.walletAddress || 'none'}, email: ${user.email || 'none'}`);
    
    // Update user email if it exists in voter but not in user
    if (!user.email && voter.email) {
      console.log(`Updating user ${user._id} with email from voter: ${voter.email}`);
      user.email = voter.email;
      await user.save();
    }
    
    // Note: We're NOT calling the blockchain for rejection as per requirements
    // We're just using the simulated function which returns a success result
    const blockchainResult = await rejectVoterOnBlockchain(user.walletAddress);
    
    console.log(`Rejection simulation result:`, blockchainResult);
    
    // Update voter status
    voter.status = 'rejected';
    voter.rejectionReason = reason;
    
    await voter.save();
    
    console.log(`Voter ${voterId} status updated to rejected`);
    
    // Send rejection email
    const userEmail = user.email || voter.email;
    try {
      if (userEmail) {
        console.log(`Attempting to send rejection email to ${userEmail} using Brevo API`);
        const emailResult = await sendVoterRejectionEmail(userEmail, voter.firstName, reason);
        console.log(`Rejection email sent to ${userEmail}, result:`, emailResult);
      } else {
        console.log(`No email available for voter ${voterId}, skipping notification`);
      }
    } catch (emailError) {
      console.error(`Error sending rejection email to ${userEmail}:`, emailError);
      // Continue despite email error
    }
    
    res.json({
      message: 'Voter rejected successfully',
      voter: {
        id: voter._id,
        firstName: voter.firstName,
        lastName: voter.lastName,
        status: voter.status,
        rejectionReason: voter.rejectionReason,
        // Note: This txHash is simulated, not an actual blockchain transaction
        blockchainTxHash: blockchainResult.success ? blockchainResult.txHash : null
      }
    });
  } catch (error) {
    console.error('Reject voter error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

// Complete voter approval after MetaMask transaction
exports.approveVoterComplete = async (req, res) => {
  try {
    const { voterId } = req.params;
    const { txHash, voterAddress } = req.body;
    
    console.log(`Completing voter approval for ID: ${voterId}, txHash: ${txHash}`);
    
    if (!txHash) {
      return res.status(400).json({ message: 'Transaction hash is required' });
    }
    
    // Find voter
    const voter = await Voter.findById(voterId);
    if (!voter) {
      console.log(`Voter not found with ID: ${voterId}`);
      return res.status(404).json({ message: 'Voter not found' });
    }
    
    console.log(`Found voter: ${voter._id}, status: ${voter.status}`);
    
    // Update voter status
    voter.status = 'approved';
    voter.rejectionReason = null;
    voter.blockchainRegistered = true;
    voter.blockchainTxHash = txHash;
    
    await voter.save();
    
    console.log(`Voter ${voterId} status updated to approved with txHash: ${txHash}`);
    
    // Get user for email notification
    const user = await User.findById(voter.user);
    
    // Send approval email if user has email
    const userEmail = user?.email || voter.email;
    try {
      if (userEmail) {
        console.log(`Attempting to send approval email to ${userEmail} using Brevo API`);
        const emailResult = await sendVoterApprovalEmail(userEmail, voter.firstName);
        console.log(`Approval email sent to ${userEmail}, result:`, emailResult);
      } else {
        console.log(`No email available for voter ${voterId}, skipping notification`);
      }
    } catch (emailError) {
      console.error(`Error sending approval email to ${userEmail}:`, emailError);
      // Continue despite email error
    }
    
    res.json({
      message: 'Voter approved successfully with MetaMask transaction',
      voter: {
        id: voter._id,
        firstName: voter.firstName,
        lastName: voter.lastName,
        status: voter.status,
        blockchainTxHash: txHash
      }
    });
  } catch (error) {
    console.error('Complete voter approval error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
}; 