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
const mongoose = require('mongoose');

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
    console.log('Request files:', req.files ? Object.keys(req.files) : 'No files');
    
    const {
      firstName,
      middleName,
      lastName,
      age,
      gender,
      dateOfBirth,
      partyName,
      electionType,
      electionId, // Make sure we capture election ID
      constituency,
      manifesto,
      education,
      experience,
      criminalRecord,
      email
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !age || !gender || !partyName) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if election exists and get its type
    let election = null;
    let actualElectionType = electionType;
    
    if (electionId && mongoose.Types.ObjectId.isValid(electionId)) {
      try {
        election = await Election.findById(electionId);
        if (election) {
          console.log(`Found election: ${election.title}, type: ${election.type}`);
          // Use election's type if available
          actualElectionType = election.type || electionType;
        } else {
          console.warn(`Election with ID ${electionId} not found`);
        }
      } catch (electionError) {
        console.error('Error finding election:', electionError);
        // Continue without election association if not found
      }
    }
    
    // Ensure we have a valid election type
    if (!actualElectionType) {
      return res.status(400).json({ 
        message: 'Election type is required',
        details: 'Either specify electionType or provide a valid electionId'
      });
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
      electionType: actualElectionType,
      constituency,
      manifesto,
      education,
      experience,
      criminalRecord: criminalRecord || 'None',
      email,
      election: electionId, // Associate with the election
      inActiveElection: election ? election.isActive : false // Set based on election status
    });

    // Process uploaded files if any
    const fs = require('fs');
    const path = require('path');
    
    // Ensure upload directories exist
    const uploadsDir = path.join(__dirname, '../../uploads');
    const candidatesDir = path.join(uploadsDir, 'candidates');
    const partiesDir = path.join(uploadsDir, 'parties');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(candidatesDir)) {
      fs.mkdirSync(candidatesDir, { recursive: true });
    }
    if (!fs.existsSync(partiesDir)) {
      fs.mkdirSync(partiesDir, { recursive: true });
    }

    // Handle file uploads for express-fileupload
    if (req.files) {
      console.log('Processing uploaded files:', Object.keys(req.files));
      
      if (req.files.candidatePhoto) {
        const photo = req.files.candidatePhoto;
        console.log('Candidate photo file:', photo.name);
        
        // Generate unique filename
        const photoFileName = `candidate_${Date.now()}_${photo.name}`;
        const photoFilePath = path.join(candidatesDir, photoFileName);
        
        try {
          // Move the uploaded file
          await photo.mv(photoFilePath);
          console.log(`Candidate photo saved to: ${photoFilePath}`);
          newCandidate.photoUrl = `/uploads/candidates/${photoFileName}`;
        } catch (fileError) {
          console.error('Error saving candidate photo:', fileError);
          // Continue without the photo
        }
      }
      
      if (req.files.partySymbol) {
        const symbol = req.files.partySymbol;
        console.log('Party symbol file:', symbol.name);
        
        // Generate unique filename
        const symbolFileName = `party_${Date.now()}_${symbol.name}`;
        const symbolFilePath = path.join(partiesDir, symbolFileName);
        
        try {
          // Move the uploaded file
          await symbol.mv(symbolFilePath);
          console.log(`Party symbol saved to: ${symbolFilePath}`);
          newCandidate.partySymbol = `/uploads/parties/${symbolFileName}`;
        } catch (fileError) {
          console.error('Error saving party symbol:', fileError);
          // Continue without the symbol
        }
      }
    }

    console.log('Prepared candidate object for saving:', {
      firstName: newCandidate.firstName,
      lastName: newCandidate.lastName,
      election: newCandidate.election,
      photoUrl: newCandidate.photoUrl ? 'Set' : 'Not set',
      partySymbol: newCandidate.partySymbol ? 'Set' : 'Not set'
    });

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
    console.log('Admin getting candidates with query params:', req.query);
    const { electionType, archived, election } = req.query;
    
    // Build query
    const query = {};
    
    // Handle election type filter
    if (electionType) {
      query.electionType = electionType;
      console.log(`Filtering candidates by election type: ${electionType}`);
    }
    
    // Handle election ID filter
    if (election) {
      if (mongoose.Types.ObjectId.isValid(election)) {
        query.election = election;
        console.log(`Filtering candidates by election ID: ${election}`);
      } else {
        console.warn(`Invalid election ID format provided: ${election}`);
      }
    }
    
    // Handle archived filter
    if (archived === 'true') {
      query.isArchived = true;
      console.log('Getting archived candidates');
    } else if (archived === 'false') {
      query.isArchived = false;
      console.log('Getting non-archived candidates');
    }
    
    console.log('Final candidate query:', JSON.stringify(query));
    
    // Find candidates with populated election data
    const candidates = await Candidate.find(query)
      .populate({
        path: 'election',
        select: 'title name type isActive isArchived startDate endDate totalVotes archivedAt',
        options: { lean: true }
      })
      .sort({ voteCount: -1, createdAt: -1 });
    
    console.log(`Found ${candidates.length} candidates matching the query`);
    
    // Transform candidates to ensure consistent format
    const formattedCandidates = candidates.map(candidate => {
      const candidateObj = candidate.toObject();
      
      // For legacy compatibility - ensure electionType is always present
      if (!candidateObj.electionType && candidateObj.election && candidateObj.election.type) {
        candidateObj.electionType = candidateObj.election.type;
      }
      
      // Ensure voteCount is always at least 0
      if (candidateObj.voteCount === undefined || candidateObj.voteCount === null) {
        candidateObj.voteCount = 0;
      }
      
      return candidateObj;
    });
    
    res.status(200).json(formattedCandidates);
  } catch (error) {
    console.error('Error getting candidates:', error);
    res.status(500).json({ 
      message: 'Server error while getting candidates', 
      error: error.message 
    });
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
    const { id } = req.params;
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
      id,
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
    const { id } = req.params;
    
    // Delete candidate
    const deletedCandidate = await Candidate.findByIdAndDelete(id);
    
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
    console.log('Fetching archived elections with query params:', req.query);
    
    // Build query to find archived elections
    const query = { isArchived: true };
    
    // Add type filter if present in request
    if (req.query.type) {
      query.type = req.query.type;
      console.log(`Filtering archived elections by type: ${req.query.type}`);
    }
    
    // Find archived elections and sort by most recently archived first
    const archivedElections = await Election.find(query).sort({ archivedAt: -1 });
    
    console.log(`Found ${archivedElections.length} archived elections`);
    
    // Transform results to ensure compatibility with frontend
    const formattedElections = archivedElections.map(election => {
      const electionObj = election.toObject();
      
      // Ensure backwards compatibility - if old data uses electionType field
      if (!electionObj.electionType) {
        electionObj.electionType = electionObj.type;
      }
      
      return electionObj;
    });
    
    res.status(200).json(formattedElections);
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

// Get candidates by election ID (specifically for archived elections)
exports.getCandidatesByElectionId = async (req, res) => {
  try {
    const { electionId } = req.params;
    console.log(`Getting candidates for election ID: ${electionId}`);
    
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ 
        message: 'Invalid election ID format',
        details: 'The provided election ID is not in a valid MongoDB ObjectId format'
      });
    }
    
    // First verify the election exists
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    console.log(`Found election: ${election.title}, type: ${election.type}, archived: ${election.isArchived}`);
    
    // Find candidates associated with this election - using both election ID and election type
    // Don't filter by isArchived status to ensure we get all candidates
    const query = { 
      $or: [
        // Match by direct election reference
        { election: electionId },
        // Match by election type as fallback
        { electionType: election.type }
      ]
      // Removed isArchived filter to get all candidates associated with this election
    };
    
    console.log('Candidate query:', JSON.stringify(query));
    
    // Find candidates for this specific election
    const candidates = await Candidate.find(query)
      .sort({ voteCount: -1 })
      .lean();
    
    console.log(`Found ${candidates.length} candidates for election ${election.title}`);
    
    // If we found candidates using the election type but they don't have an election reference,
    // update them to include the election reference for future queries
    const candidatesNeedingElectionRef = candidates.filter(c => !c.election);
    if (candidatesNeedingElectionRef.length > 0) {
      console.log(`Updating ${candidatesNeedingElectionRef.length} candidates with missing election reference`);
      
      try {
        // Update in background - don't wait for it to complete
        Candidate.updateMany(
          { electionType: election.type, election: { $exists: false } },
          { $set: { election: electionId } }
        ).then(result => {
          console.log(`Updated ${result.modifiedCount} candidates with election reference`);
        }).catch(err => {
          console.error('Error updating candidates with election reference:', err);
        });
      } catch (updateError) {
        console.error('Error updating candidates with election reference:', updateError);
        // Continue with the response even if the update fails
      }
    }
    
    // Calculate total votes from the candidates if election doesn't have totalVotes field
    const totalVotes = election.totalVotes || 
      candidates.reduce((sum, candidate) => sum + (candidate.voteCount || 0), 0);
    
    // Format candidate data with additional details
    const formattedCandidates = candidates.map(candidate => {
      const percentage = totalVotes > 0 
        ? ((candidate.voteCount || 0) / totalVotes * 100).toFixed(2) 
        : '0.00';
        
      return {
        ...candidate,
        electionTitle: election.title,
        electionType: election.type || candidate.electionType,
        percentage,
        fullName: `${candidate.firstName} ${candidate.middleName ? candidate.middleName + ' ' : ''}${candidate.lastName}`
      };
    });
    
    res.status(200).json({
      election: {
        _id: election._id,
        title: election.title,
        type: election.type,
        startDate: election.startDate,
        endDate: election.endDate,
        archivedAt: election.archivedAt,
        totalVotes
      },
      candidates: formattedCandidates,
      totalCandidates: formattedCandidates.length
    });
  } catch (error) {
    console.error('Error getting candidates by election ID:', error);
    res.status(500).json({ 
      message: 'Server error while getting candidates', 
      error: error.message 
    });
  }
}; 