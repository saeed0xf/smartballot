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
    console.log('Add candidate API called');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    
    const {
      firstName,
      middleName,
      lastName,
      age,
      gender,
      dateOfBirth,
      partyName,
      electionType,
      constituency,
      manifesto,
      education,
      experience,
      criminalRecord,
      email
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !age || !gender || !partyName || !electionType) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Create new candidate
    const newCandidate = new Candidate({
      firstName,
      middleName,
      lastName,
      age: parseInt(age, 10),
      gender,
      dateOfBirth,
      partyName,
      electionType,
      constituency,
      manifesto,
      education,
      experience,
      criminalRecord: criminalRecord || 'None',
      email
    });

    // Handle file uploads
    if (req.files) {
      console.log('Processing uploaded files:', Object.keys(req.files));
      
      if (req.files.candidatePhoto && req.files.candidatePhoto.length > 0) {
        console.log('Candidate photo file:', req.files.candidatePhoto[0].filename);
        newCandidate.photoUrl = `/uploads/${req.files.candidatePhoto[0].filename}`;
      }
      
      if (req.files.partySymbol && req.files.partySymbol.length > 0) {
        console.log('Party symbol file:', req.files.partySymbol[0].filename);
        newCandidate.partySymbol = `/uploads/${req.files.partySymbol[0].filename}`;
      }
    }

    console.log('Prepared candidate object for saving:', newCandidate);

    // Save to database
    try {
      const savedCandidate = await newCandidate.save();
      console.log('Candidate saved successfully with ID:', savedCandidate._id);
      
      // Return saved candidate
      res.status(201).json(savedCandidate);
    } catch (dbError) {
      console.error('MongoDB save error:', dbError);
      res.status(500).json({ 
        message: 'Database error while saving candidate', 
        error: dbError.message,
        stack: dbError.stack
      });
    }
  } catch (error) {
    console.error('Error adding candidate:', error);
    res.status(500).json({ 
      message: 'Server error while adding candidate', 
      error: error.message,
      stack: error.stack
    });
  }
};

// Get all candidates
exports.getAllCandidates = async (req, res) => {
  try {
    const { electionType, archived } = req.query;
    
    // Build query
    const query = {};
    if (electionType) {
      query.electionType = electionType;
    }
    
    // Handle archived filter
    if (archived === 'true') {
      query.isArchived = true;
    } else if (archived === 'false' || archived === undefined) {
      query.isArchived = false;
    }
    
    // Find candidates
    const candidates = await Candidate.find(query).sort({ createdAt: -1 });
    
    res.status(200).json(candidates);
  } catch (error) {
    console.error('Error getting candidates:', error);
    res.status(500).json({ message: 'Server error while getting candidates', error: error.message });
  }
};

// Get candidate by ID
exports.getCandidateById = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    // Find candidate
    const candidate = await Candidate.findById(candidateId);
    
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    res.status(200).json(candidate);
  } catch (error) {
    console.error('Error getting candidate:', error);
    res.status(500).json({ message: 'Server error while getting candidate', error: error.message });
  }
};

// Update candidate
exports.updateCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const updateData = { ...req.body };
    
    // Handle file uploads
    if (req.files) {
      if (req.files.candidatePhoto) {
        updateData.photoUrl = `/uploads/${req.files.candidatePhoto[0].filename}`;
      }
      if (req.files.partySymbol) {
        updateData.partySymbol = `/uploads/${req.files.partySymbol[0].filename}`;
      }
    }
    
    // Update candidate
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId,
      updateData,
      { new: true }
    );
    
    if (!updatedCandidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    res.status(200).json(updatedCandidate);
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({ message: 'Server error while updating candidate', error: error.message });
  }
};

// Delete candidate
exports.deleteCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    // Delete candidate
    const deletedCandidate = await Candidate.findByIdAndDelete(candidateId);
    
    if (!deletedCandidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    res.status(200).json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({ message: 'Server error while deleting candidate', error: error.message });
  }
};

// Add candidate to blockchain
exports.addCandidateToBlockchain = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    // Find candidate
    const candidate = await Candidate.findById(candidateId);
    
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    // Check if candidate is already on blockchain
    if (candidate.blockchainId) {
      return res.status(400).json({ message: 'Candidate already added to blockchain' });
    }
    
    // Add candidate to blockchain
    const blockchainResponse = await addCandidateOnBlockchain(candidate);
    
    // Update candidate with blockchain data
    candidate.blockchainId = blockchainResponse.candidateId;
    candidate.blockchainTxHash = blockchainResponse.txHash;
    await candidate.save();
    
    res.status(200).json({
      message: 'Candidate added to blockchain successfully',
      blockchainId: candidate.blockchainId,
      blockchainTxHash: candidate.blockchainTxHash
    });
  } catch (error) {
    console.error('Error adding candidate to blockchain:', error);
    res.status(500).json({
      message: 'Server error while adding candidate to blockchain',
      error: error.message
    });
  }
};

// Archive election
exports.archiveElection = async (req, res) => {
  try {
    const { electionId } = req.params;
    
    // Find election
    const election = await Election.findById(electionId);
    
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    // Check if election is already archived
    if (election.isArchived) {
      return res.status(400).json({ message: 'Election is already archived' });
    }
    
    // Update candidates associated with this election
    await Candidate.updateMany(
      { electionType: election.electionType },
      { isArchived: true }
    );
    
    // Archive election
    election.isArchived = true;
    election.archivedAt = Date.now();
    await election.save();
    
    res.status(200).json({
      message: 'Election archived successfully',
      electionId: election._id
    });
  } catch (error) {
    console.error('Error archiving election:', error);
    res.status(500).json({
      message: 'Server error while archiving election',
      error: error.message
    });
  }
};

// Get archived elections
exports.getArchivedElections = async (req, res) => {
  try {
    // Find archived elections
    const archivedElections = await Election.find({ isArchived: true }).sort({ archivedAt: -1 });
    
    res.status(200).json(archivedElections);
  } catch (error) {
    console.error('Error getting archived elections:', error);
    res.status(500).json({
      message: 'Server error while getting archived elections',
      error: error.message
    });
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

// Add the getDashboardData method if it doesn't exist
exports.getDashboardData = async (req, res) => {
  try {
    console.log('Getting dashboard data');
    
    // Get counts of various entities
    const votersCount = await Voter.countDocuments();
    const pendingVotersCount = await Voter.countDocuments({ status: 'pending' });
    const candidatesCount = await Candidate.countDocuments();
    const activeElectionsCount = await Election.countDocuments({ isActive: true });
    
    // Get recent activities
    const recentVoters = await Voter.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email status createdAt');
    
    const recentCandidates = await Candidate.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name party constituency createdAt');
    
    // Return dashboard data
    res.status(200).json({
      counts: {
        voters: votersCount,
        pendingVoters: pendingVotersCount,
        candidates: candidatesCount,
        activeElections: activeElectionsCount
      },
      recentActivity: {
        voters: recentVoters,
        candidates: recentCandidates
      }
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ message: 'Failed to get dashboard data', error: error.message });
  }
}; 