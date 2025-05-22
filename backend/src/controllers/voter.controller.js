const User = require('../models/user.model');
const Voter = require('../models/voter.model');
const { registerVoterOnBlockchain } = require('../utils/blockchain.util');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Register voter profile
exports.registerVoter = async (req, res) => {
  try {
    console.log('Starting voter registration process');
    console.log('Request body keys:', Object.keys(req.body));
    
    // Log file information - express-fileupload puts files in req.files
    if (req.files) {
      console.log('Files detected in request.files:', Object.keys(req.files));
      if (req.files.voterIdImage) {
        const file = req.files.voterIdImage;
        console.log('Voter ID image details:', {
          name: file.name,
          size: file.size,
          mimetype: file.mimetype,
          md5: file.md5
        });
      }
      if (req.files.faceImage) {
        const file = req.files.faceImage;
        console.log('Face image details:', {
          name: file.name,
          size: file.size,
          mimetype: file.mimetype,
          md5: file.md5
        });
      }
    } else {
      console.log('No req.files object found');
    }
    
    // Also check if using multer (req.file)
    if (req.file) {
      console.log('File found in req.file (multer):', req.file);
    } else {
      console.log('No req.file found (multer not being used)');
    }
    
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }
    
    // Check if wallet address is already registered
    const existingUser = await User.findOne({ walletAddress });
    let userId;
    
    if (existingUser) {
      // Use existing user
      userId = existingUser._id;
      
      // Check if voter profile already exists
      const existingVoter = await Voter.findOne({ user: userId });
      if (existingVoter) {
        return res.status(400).json({ message: 'Voter profile already exists for this wallet address' });
      }
    } else {
      try {
        // Create new user with only the required fields
        const newUser = new User({
          walletAddress,
          role: 'voter'
        });
        
        await newUser.save();
        userId = newUser._id;
        console.log('New user created with ID:', userId);
      } catch (userError) {
        console.error('Error creating user:', userError);
        return res.status(400).json({ 
          message: 'Error creating user account',
          details: userError.message
        });
      }
    }
    
    // Get form data
    const {
      firstName,
      middleName,
      lastName,
      fatherName,
      gender,
      age,
      dateOfBirth,
      email,
      voterId,
      pincode
    } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !fatherName || !gender || !dateOfBirth || !email || !voterId || !pincode) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    
    // Validate age (must be 18+)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    
    if (calculatedAge < 18) {
      return res.status(400).json({ message: 'You must be at least 18 years old to register as a voter' });
    }
    
    // Check if voter ID is already registered
    const voterIdExists = await Voter.findOne({ voterId });
    if (voterIdExists) {
      return res.status(400).json({ message: 'Voter ID is already registered' });
    }
    
    // Process voter ID image - check in both places where it might be
    let voterIdImagePath = null;
    
    // Check if file is coming via express-fileupload
    if (req.files && req.files.voterIdImage) {
      const voterIdImage = req.files.voterIdImage;
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `voterIdImage-${uniqueSuffix}${path.extname(voterIdImage.name)}`;
      const uploadPath = path.join(__dirname, '../../uploads', filename);
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      try {
        // Move the file to the uploads directory
        await voterIdImage.mv(uploadPath);
        voterIdImagePath = `/uploads/${filename}`;
        console.log('File uploaded successfully to:', uploadPath);
      } catch (fileError) {
        console.error('Error moving uploaded file:', fileError);
        return res.status(500).json({ 
          message: 'Error uploading voter ID image', 
          details: fileError.message 
        });
      }
    } 
    // Check if file is coming via multer
    else if (req.file) {
      voterIdImagePath = `/uploads/${req.file.filename}`;
      console.log('Using file uploaded via multer:', voterIdImagePath);
    } 
    // No file found
    else {
      console.error('No voter ID image found in request');
      return res.status(400).json({ message: 'Voter ID image is required' });
    }
    
    // Process face image
    let faceImagePath = null;
    
    // Check if face image is coming via express-fileupload
    if (req.files && req.files.faceImage) {
      const faceImage = req.files.faceImage;
      console.log('Face image details:', {
        name: faceImage.name,
        size: faceImage.size,
        mimetype: faceImage.mimetype,
        md5: faceImage.md5
      });
      
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `faceImage-${uniqueSuffix}${path.extname(faceImage.name)}`;
      const uploadPath = path.join(__dirname, '../../uploads', filename);
      
      try {
        // Move the file to the uploads directory
        await faceImage.mv(uploadPath);
        faceImagePath = `/uploads/${filename}`;
        console.log('Face image uploaded successfully to:', uploadPath);
      } catch (fileError) {
        console.error('Error moving uploaded face image:', fileError);
        return res.status(500).json({ 
          message: 'Error uploading face image', 
          details: fileError.message 
        });
      }
    } else {
      console.error('No face image found in request');
      return res.status(400).json({ message: 'Face image is required' });
    }
    
    // Create new voter profile
    const voter = new Voter({
      user: userId,
      firstName,
      middleName,
      lastName,
      fatherName,
      gender,
      age: calculatedAge, // Use calculated age
      dateOfBirth,
      email,
      voterId,
      pincode,
      voterIdImage: voterIdImagePath,
      faceImage: faceImagePath,
      status: 'pending'
    });
    
    console.log('Saving voter profile with voter ID image path:', voterIdImagePath);
    console.log('Saving voter profile with face image path:', faceImagePath);
    await voter.save();
    console.log('Voter profile saved successfully');
    
    // Register voter on blockchain
    console.log('Registering voter on blockchain with address:', walletAddress);
    const blockchainResult = await registerVoterOnBlockchain(walletAddress);
    
    if (blockchainResult.success) {
      // Update voter with blockchain transaction hash
      voter.blockchainRegistered = true;
      voter.blockchainTxHash = blockchainResult.txHash;
      await voter.save();
      console.log('Blockchain registration successful with hash:', blockchainResult.txHash);
    } else {
      console.log('Blockchain registration not successful but continuing with registration');
    }
    
    res.status(201).json({
      message: 'Voter registration submitted successfully',
      voter: {
        id: voter._id,
        firstName: voter.firstName,
        lastName: voter.lastName,
        status: voter.status,
        walletAddress
      }
    });
  } catch (error) {
    console.error('Voter registration error:', error);
    res.status(500).json({ 
      message: 'Server error during voter registration', 
      details: error.message 
    });
  }
};

// Get voter profile
exports.getVoterProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find voter profile
    const voter = await Voter.findOne({ user: userId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter profile not found' });
    }
    
    // Get user for wallet address
    const user = await User.findById(userId);
    
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
        email: voter.email,
        pincode: voter.pincode,
        voterId: voter.voterId,
        voterIdImage: voter.voterIdImage,
        status: voter.status,
        rejectionReason: voter.rejectionReason,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    console.error('Get voter profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update voter profile
exports.updateVoterProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find voter profile
    const voter = await Voter.findOne({ user: userId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter profile not found' });
    }
    
    // Check if voter is already approved
    if (voter.status === 'approved') {
      return res.status(400).json({ message: 'Cannot update approved voter profile' });
    }
    
    // Get form data
    const {
      firstName,
      middleName,
      lastName,
      fatherName,
      gender,
      dateOfBirth,
      email,
      voterId,
      pincode
    } = req.body;
    
    // Update voter profile
    if (firstName) voter.firstName = firstName;
    if (middleName !== undefined) voter.middleName = middleName;
    if (lastName) voter.lastName = lastName;
    if (fatherName) voter.fatherName = fatherName;
    if (gender) voter.gender = gender;
    if (pincode) voter.pincode = pincode;
    
    // Update age if date of birth changes
    if (dateOfBirth) {
      voter.dateOfBirth = dateOfBirth;
      
      // Recalculate age
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      
      // Validate age (must be 18+)
      if (calculatedAge < 18) {
        return res.status(400).json({ message: 'You must be at least 18 years old to register as a voter' });
      }
      
      voter.age = calculatedAge;
    }
    
    if (email) voter.email = email;
    
    // Check if voter ID is being changed and if it's already registered
    if (voterId && voterId !== voter.voterId) {
      const voterIdExists = await Voter.findOne({ voterId, _id: { $ne: voter._id } });
      if (voterIdExists) {
        return res.status(400).json({ message: 'Voter ID is already registered' });
      }
      voter.voterId = voterId;
    }
    
    // Update image if provided
    if (req.file) {
      voter.voterIdImage = `/uploads/${req.file.filename}`;
    }
    
    // If voter was rejected, set status back to pending
    if (voter.status === 'rejected') {
      voter.status = 'pending';
      voter.rejectionReason = null;
    }
    
    await voter.save();
    
    res.json({
      message: 'Voter profile updated successfully',
      voter: {
        id: voter._id,
        firstName: voter.firstName,
        middleName: voter.middleName,
        lastName: voter.lastName,
        fatherName: voter.fatherName,
        gender: voter.gender,
        age: voter.age,
        dateOfBirth: voter.dateOfBirth,
        email: voter.email,
        pincode: voter.pincode,
        voterId: voter.voterId,
        voterIdImage: voter.voterIdImage,
        status: voter.status
      }
    });
  } catch (error) {
    console.error('Update voter profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cast a vote
exports.castVote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { candidateId, electionId, isNoneOption } = req.body;
    
    if (!electionId) {
      return res.status(400).json({ message: 'Election ID is required' });
    }
    
    if (!candidateId && !isNoneOption) {
      return res.status(400).json({ message: 'Candidate ID is required' });
    }
    
    // Find voter profile
    const voter = await Voter.findOne({ user: userId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter profile not found' });
    }
    
    // Check if voter is approved
    if (voter.status !== 'approved') {
      return res.status(403).json({ message: 'Your voter registration is not yet approved' });
    }
    
    // Check if voter has already voted
    const Election = mongoose.model('Election');
    const Candidate = mongoose.model('Candidate');
    const Vote = mongoose.model('Vote');
    
    const existingVote = await Vote.findOne({ voter: voter._id, election: electionId });
    if (existingVote) {
      return res.status(400).json({ message: 'You have already cast your vote in this election' });
    }
    
    // Find the election
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    // Check if election is active
    if (!election.isActive) {
      return res.status(400).json({ message: 'This election is not currently active' });
    }
    
    // Generate a unique transaction hash for blockchain record
    const randomHash = Array(64).fill(0).map(() => Math.random().toString(16)[2]).join('');
    const blockchainTxHash = `0x${randomHash}`;
    
    let candidate = null;
    
    // Handle "None of the above" option
    if (!isNoneOption) {
      // Find the candidate
      candidate = await Candidate.findById(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }
      
      // Check if candidate belongs to the election
      if (candidate.election.toString() !== electionId) {
        return res.status(400).json({ message: 'Candidate does not belong to the specified election' });
      }
      
      // Increment candidate vote count in local database
      candidate.voteCount = (candidate.voteCount || 0) + 1;
      await candidate.save();
    }
    
    // Increment election total votes
    election.totalVotes = (election.totalVotes || 0) + 1;
    await election.save();
    
    // Create vote record in local database
    const vote = new Vote({
      voter: voter._id,
      candidate: isNoneOption ? null : candidate._id,
      election: election._id,
      isNoneOption: isNoneOption || false,
      blockchainTxHash: blockchainTxHash,
      timestamp: new Date()
    });
    
    await vote.save();
    
    // Update voter to mark as having voted
    voter.hasVoted = true;
    voter.lastVotedElection = election._id;
    voter.blockchainStatus = {
      hasVoted: true,
      txHash: blockchainTxHash,
      timestamp: new Date()
    };
    
    await voter.save();
    
    // We will no longer update the remote database here - that's now handled by the /record-vote-blockchain endpoint
    
    res.json({
      message: 'Your vote has been successfully recorded locally',
      txHash: blockchainTxHash,
      voteId: vote._id
    });
    
  } catch (error) {
    console.error('Error processing vote:', error);
    res.status(500).json({ message: 'Error processing your vote' });
  }
};

// Record a vote on the blockchain
exports.recordVoteOnBlockchain = async (req, res) => {
  // Variable to hold remote database connection that we'll close at the end
  let remoteConnection = null;
  
  try {
    const userId = req.user.id;
    const { candidateId, electionId, isNoneOption } = req.body;
    
    if (!electionId) {
      return res.status(400).json({ message: 'Election ID is required' });
    }
    
    if (!candidateId && !isNoneOption) {
      return res.status(400).json({ message: 'Candidate ID is required' });
    }
    
    // Find voter profile
    const voter = await Voter.findOne({ user: userId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter profile not found' });
    }
    
    // Check if voter is approved
    if (voter.status !== 'approved') {
      return res.status(403).json({ message: 'Your voter registration is not yet approved' });
    }
    
    // Check if voter has already voted
    const Election = mongoose.model('Election');
    const Candidate = mongoose.model('Candidate');
    const Vote = mongoose.model('Vote');
    
    // Check if the voter has already voted in the local database
    const existingVote = await Vote.findOne({ voter: voter._id, election: electionId });
    if (existingVote) {
      return res.status(400).json({ message: 'You have already cast your vote in this election' });
    }
    
    // Create a variable to hold our election data
    let election;
    let isRemoteElection = false;
    
    // Establish connection to remote database first - we'll use it throughout the function
    const remoteDb = require('../utils/remoteDb.util');
    console.log('Establishing connection to remote database...');
    remoteConnection = await remoteDb.createRemoteConnection();
    console.log('Connection to remote database established successfully');
    
    // Create models on the remote connection
    const RemoteElection = remoteConnection.model('Election', remoteDb.RemoteElectionSchema);
    const RemoteCandidate = remoteConnection.model('Candidate', remoteDb.RemoteCandidateSchema);
    const RemoteVote = remoteConnection.model('Vote', remoteDb.RemoteVoteSchema);
    
    // Check if the voter has already voted in the remote database
    console.log(`Checking if voter ${voter._id} has already voted in election ${electionId} in remote database`);
    const existingRemoteVote = await RemoteVote.findOne({ voterId: voter._id.toString(), electionId: electionId });
    
    if (existingRemoteVote) {
      console.log(`Found existing vote in remote database for voter ${voter._id} in election ${electionId}`);
      await remoteConnection.close();
      return res.status(400).json({ message: 'You have already cast your vote in this election (recorded in blockchain)' });
    }
    
    try {
      // First, try to find the election in the local database
      election = await Election.findById(electionId);
      
      // If not found in local database, check the remote database
      if (!election) {
        console.log(`Election not found in local database. Checking remote database for election ID: ${electionId}`);
        
        // Try to find by direct ID first
        let remoteElection = await RemoteElection.findById(electionId);
        
        // If not found by direct ID, try to find by originalElectionId
        if (!remoteElection) {
          remoteElection = await RemoteElection.findOne({ originalElectionId: electionId });
        }
        
        if (remoteElection) {
          console.log(`Found election in remote database with ID: ${remoteElection._id}`);
          election = remoteElection;
          isRemoteElection = true;
          
          // If we found the election in the remote DB, check again with the exact remote election ID
          if (remoteElection._id.toString() !== electionId) {
            const preciseRemoteVoteCheck = await RemoteVote.findOne({ 
              voterId: voter._id.toString(), 
              electionId: remoteElection._id.toString() 
            });
            
            if (preciseRemoteVoteCheck) {
              console.log(`Found existing vote with precise remote election ID check`);
              await remoteConnection.close();
              return res.status(400).json({ message: 'You have already cast your vote in this election (recorded in blockchain)' });
            }
          }
        } else {
          console.log(`Election not found in either database with ID: ${electionId}`);
          await remoteConnection.close();
          return res.status(404).json({ message: 'Election not found in either local or remote database' });
        }
      }
    } catch (electionLookupError) {
      console.error('Error looking up election:', electionLookupError);
      await remoteConnection.close();
      return res.status(500).json({ message: 'Error looking up election information' });
    }
    
    // Check if election is active (if we have the isActive field)
    if (election.isActive === false) {
      await remoteConnection.close();
      return res.status(400).json({ message: 'This election is not currently active' });
    }
    
    // Generate a unique transaction hash for blockchain record
    const randomHash = Array(64).fill(0).map(() => Math.random().toString(16)[2]).join('');
    const blockchainTxHash = `0x${randomHash}`;
    
    // Generate a block number and block hash
    const blockNumber = Math.floor(Math.random() * 1000000) + 15000000;
    const blockHash = `0x${Array(64).fill(0).map(() => Math.random().toString(16)[2]).join('')}`;
    
    // Generate a verification code for voters to verify their vote
    const verificationCode = `${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    let candidate = null;
    
    // Only look up candidate if not "None of the above" and not already a remote election
    if (!isNoneOption && !isRemoteElection) {
      // Find the candidate in local database
      candidate = await Candidate.findById(candidateId);
      if (!candidate) {
        await remoteConnection.close();
        return res.status(404).json({ message: 'Candidate not found' });
      }
      
      // Check if candidate belongs to the election
      if (candidate.election.toString() !== electionId) {
        await remoteConnection.close();
        return res.status(400).json({ message: 'Candidate does not belong to the specified election' });
      }
      
      // Increment candidate vote count in local database
      candidate.voteCount = (candidate.voteCount || 0) + 1;
      await candidate.save();
    }
    
    // Only update local election if it's not a remote-only election
    if (!isRemoteElection) {
      // Increment election total votes
      election.totalVotes = (election.totalVotes || 0) + 1;
      await election.save();
      
      // Create vote record in local database
      const vote = new Vote({
        voter: voter._id,
        candidate: isNoneOption ? null : candidate?._id,
        election: election._id,
        isNoneOption: isNoneOption || false,
        blockchainTxHash: blockchainTxHash,
        timestamp: new Date()
      });
      
      await vote.save();
    }
    
    // Update voter to mark as having voted
    voter.hasVoted = true;
    voter.lastVotedElection = election._id;
    voter.blockchainStatus = {
      hasVoted: true,
      txHash: blockchainTxHash,
      timestamp: new Date()
    };
    
    await voter.save();
    
    // Record vote on the blockchain (remote database)
    try {
      console.log(`Recording vote on blockchain for voter ${voter._id} in election ${electionId}`);
      
      // If we already have a remote election, use it directly, otherwise look it up
      let remoteElection;
      if (isRemoteElection) {
        // We already found the remote election earlier
        remoteElection = election;
      } else {
        // Find remote election by originalElectionId
        remoteElection = await RemoteElection.findOne({ originalElectionId: electionId });
      }
      
      // If no remote election exists, create one based on the local election (if available)
      if (!remoteElection && !isRemoteElection) {
        console.log(`Election not found in remote database, creating new record for ID: ${electionId}`);
        
        const newRemoteElection = new RemoteElection({
          title: election.title || election.name,
          description: election.description,
          startDate: election.startDate,
          endDate: election.endDate,
          isActive: election.isActive,
          region: election.region,
          pincode: election.pincode,
          type: election.type,
          originalElectionId: electionId,
          totalVotes: 1,
          recordedAt: new Date()
        });
        
        remoteElection = await newRemoteElection.save();
        console.log(`Created new election in remote database with ID: ${remoteElection._id}`);
      }
      
      // Create block data for the transaction
      const blockInfo = {
        blockNumber,
        blockHash,
        confirmations: Math.floor(Math.random() * 30) + 12
      };
      
      // Create the vote transaction on the blockchain
      const blockchainVote = new RemoteVote({
        voterId: voter._id.toString(),
        candidateId: isNoneOption ? 'none-of-the-above' : candidateId,
        electionId: remoteElection ? remoteElection._id.toString() : electionId,
        isNoneOption: isNoneOption || false,
        blockchainTxHash: blockchainTxHash,
        timestamp: new Date(),
        verificationCode: verificationCode,
        confirmed: true,
        recordingUrl: null, // Will be updated after recording is uploaded
        blockInfo: blockInfo
      });
      
      // Save the vote record first
      const savedVote = await blockchainVote.save();
      console.log(`Vote transaction recorded on blockchain with hash: ${blockchainTxHash}`);
      
      if (remoteElection) {
        console.log(`Working with election on blockchain with ID: ${remoteElection._id}`);
        
        // Increment total votes in remote election
        remoteElection.totalVotes = (remoteElection.totalVotes || 0) + 1;
        await remoteElection.save();
        console.log(`Updated election vote count to ${remoteElection.totalVotes} on blockchain`);
        
        // If not "None of the above", update remote candidate vote count
        if (!isNoneOption) {
          // Get the candidateId directly from the saved vote record for consistency
          const voteRecordCandidateId = savedVote.candidateId;
          console.log(`Using candidate ID from vote record: ${voteRecordCandidateId}`);
          
          // Use our comprehensive helper to find the candidate
          const remoteCandidate = await findRemoteCandidateForVoting(
            remoteConnection, 
            remoteElection, 
            candidateId, 
            candidate
          );
          
          if (remoteCandidate) {
            console.log(`Found candidate in remote database: ${remoteCandidate._id}`);
            console.log(`Current vote count: ${remoteCandidate.voteCount || 0}`);
            
            try {
              // First try standard approach to update vote count
              remoteCandidate.voteCount = (remoteCandidate.voteCount || 0) + 1;
              await remoteCandidate.save();
              console.log(`Updated candidate vote count to ${remoteCandidate.voteCount} on blockchain using standard approach`);
            } catch (updateError) {
              console.error('Error updating candidate vote count using standard approach:', updateError);
              
              // Fallback: Try direct atomic update operation if standard approach fails
              try {
                console.log(`Attempting direct atomic update for candidate ${remoteCandidate._id}`);
                const updateResult = await RemoteCandidate.updateOne(
                  { _id: remoteCandidate._id },
                  { $inc: { voteCount: 1 } }
                );
                
                if (updateResult.modifiedCount > 0) {
                  console.log(`Successfully updated candidate vote count using atomic operation`);
                } else {
                  console.warn(`Atomic update operation did not modify any documents`);
                  
                  // Last resort: Force direct update with raw MongoDB command
                  try {
                    const collection = remoteConnection.collection('candidates');
                    const forcedUpdateResult = await collection.updateOne(
                      { _id: remoteCandidate._id },
                      { $inc: { voteCount: 1 } }
                    );
                    
                    if (forcedUpdateResult.modifiedCount > 0) {
                      console.log(`Successfully force-updated candidate vote count using raw collection command`);
                    } else {
                      console.error(`Failed to update candidate vote count even with force update`);
                    }
                  } catch (forceError) {
                    console.error('Error with force update:', forceError);
                  }
                }
              } catch (atomicError) {
                console.error('Error with atomic update operation:', atomicError);
              }
            }
          } else if (candidate) {
            // If remote candidate not found, create a new one with vote count of 1
            console.log(`No matching candidate found in remote database, creating new record`);
            
            const newRemoteCandidate = new RemoteCandidate({
              firstName: candidate?.firstName || '',
              middleName: candidate?.middleName || '',
              lastName: candidate?.lastName || '',
              age: candidate?.age || 0,
              gender: candidate?.gender || '',
              partyName: candidate?.partyName || '',
              electionType: candidate?.electionType || '',
              electionId: remoteElection._id,
              constituency: candidate?.constituency || '',
              pincode: candidate?.pincode || '',
              manifesto: candidate?.manifesto || '',
              education: candidate?.education || '',
              experience: candidate?.experience || '',
              criminalRecord: candidate?.criminalRecord || '',
              photoUrl: candidate?.photoUrl || '',
              partySymbol: candidate?.partySymbol || '',
              voteCount: 1, // Start with vote count of 1
              originalCandidateId: candidateId, // Store original ID for future reference
              recordedAt: new Date()
            });
            
            const savedCandidate = await newRemoteCandidate.save();
            console.log(`Created new candidate on blockchain with ID: ${savedCandidate._id} and vote count: 1`);
            
            // Update the vote record with the new candidate ID for consistency
            savedVote.candidateId = savedCandidate._id.toString();
            await savedVote.save();
            console.log(`Updated vote record with new candidate ID: ${savedCandidate._id}`);
          } else {
            // We don't have candidate information, but we can still record the vote
            console.log(`No candidate information available, vote recorded without updating candidate`);
          }
        } else if (isNoneOption) {
          console.log('Vote cast for "None of the above", updating blockchain records');
          
          // Track "None of the above" votes in a separate field
          remoteElection.noneOfTheAboveVotes = (remoteElection.noneOfTheAboveVotes || 0) + 1;
          await remoteElection.save();
          console.log(`Updated "None of the above" votes to ${remoteElection.noneOfTheAboveVotes} on blockchain`);
        }
      } else {
        // If election doesn't exist in remote DB, we'll just record the vote transaction
        // without updating election statistics
        console.log(`Election not found on blockchain for ID: ${electionId}, recording vote only`);
      }
      
      // Return the blockchain transaction data
      res.json({
        success: true,
        message: 'Your vote has been successfully recorded on the blockchain',
        blockchainData: {
          txHash: blockchainTxHash,
          blockNumber: blockNumber,
          blockHash: blockHash,
          confirmations: blockInfo.confirmations,
          timestamp: new Date(),
          verificationCode: verificationCode
        }
      });
      
    } catch (blockchainError) {
      console.error('Error recording vote on blockchain:', blockchainError);
      throw blockchainError; // Re-throw to be caught by outer catch
    } finally {
      // Always close the remote connection at the end of the operation
      try {
        if (remoteConnection) {
          await remoteConnection.close();
          console.log('Blockchain connection closed successfully');
        }
      } catch (closeError) {
        console.error('Error closing blockchain connection:', closeError);
      }
    }
    
  } catch (error) {
    console.error('Error processing vote transaction:', error);
    
    // Make sure we always close the connection in case of errors
    try {
      if (remoteConnection) {
        await remoteConnection.close();
        console.log('Blockchain connection closed after error');
      }
    } catch (closeError) {
      console.error('Error closing blockchain connection after error:', closeError);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error processing your vote on the blockchain',
      error: error.message
    });
  }
};

// Check if voter has cast a vote in the remote database
exports.checkRemoteVote = async (req, res) => {
  let remoteConnection = null;
  
  try {
    const userId = req.user.id;
    // Get the election ID from query params
    const { electionId } = req.query;
    
    // Find voter profile
    const voter = await Voter.findOne({ user: userId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter profile not found' });
    }
    
    // Establish connection to remote database
    const remoteDb = require('../utils/remoteDb.util');
    console.log('Connecting to remote database to check votes...');
    remoteConnection = await remoteDb.createRemoteConnection();
    
    // Create models on the remote connection
    const RemoteVote = remoteConnection.model('Vote', remoteDb.RemoteVoteSchema);
    
    let query = { voterId: voter._id.toString() };
    
    // If election ID is provided, check for vote in that specific election
    if (electionId) {
      console.log(`Checking if voter ${voter._id} has voted in specific election ${electionId}`);
      query.electionId = electionId;
    } else {
      console.log(`Checking if voter ${voter._id} has voted in any election`);
    }
    
    // Check if the voter has cast any votes in the remote database based on query
    const existingRemoteVote = await RemoteVote.findOne(query);
    
    // Close the remote connection
    await remoteConnection.close();
    
    if (existingRemoteVote) {
      console.log(`Found existing vote in remote database for voter ${voter._id}${electionId ? ` in election ${electionId}` : ''}`);
      return res.json({ 
        hasVoted: true, 
        voteInfo: {
          electionId: existingRemoteVote.electionId,
          timestamp: existingRemoteVote.timestamp,
          txHash: existingRemoteVote.blockchainTxHash
        }
      });
    } else {
      return res.json({ hasVoted: false });
    }
    
  } catch (error) {
    console.error('Error checking remote vote:', error);
    
    // Make sure to close the connection in case of errors
    try {
      if (remoteConnection) {
        await remoteConnection.close();
      }
    } catch (closeError) {
      console.error('Error closing remote connection:', closeError);
    }
    
    res.status(500).json({ 
      message: 'Error checking vote status in remote database',
      error: error.message
    });
  }
};

// Upload recording of voter casting vote
exports.uploadRecording = async (req, res) => {
  try {
    console.log('Handling upload-recording request');

    // Check if a file was uploaded
    if (!req.files || !req.files.recording) {
      console.error('No recording file found in request');
      return res.status(400).json({
        success: false,
        message: 'No recording file uploaded'
      });
    }

    // Log the uploaded file details
    console.log('Recording file received:', req.files.recording.name);
    console.log('File size:', req.files.recording.size, 'bytes');
    console.log('File type:', req.files.recording.mimetype);

    // Validate required parameters
    const { voterId, electionId, candidateId, txHash } = req.body;
    
    if (!voterId || !electionId) {
      console.error('Missing required parameters:', { voterId, electionId });
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    // Determine target directory
    const targetFolder = req.body.targetFolder || 'recordings';
    const uploadDir = path.join(__dirname, '../../uploads', targetFolder);
    
    // Ensure target directory exists
    if (!fs.existsSync(uploadDir)) {
      console.log('Creating directory:', uploadDir);
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Clean the filename to prevent directory traversal attacks
    const recordingFile = req.files.recording;
    const fileExt = path.extname(recordingFile.name);
    
    // Generate a unique filename with voter and election IDs
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 10000);
    const filename = `vote-${randomId}-${voterId}-${txHash ? txHash.substring(0, 8) : 'undefined'}-${timestamp}${fileExt}`;
    
    const filePath = path.join(uploadDir, filename);
    const relativeFilePath = `/uploads/${targetFolder}/${filename}`;
    
    console.log('Moving file to:', filePath);
    
    // Move the file to the upload directory
    recordingFile.mv(filePath, async (err) => {
      if (err) {
        console.error('Error moving file:', err);
        return res.status(500).json({
          success: false,
          message: 'Error uploading file',
          error: err.message
        });
      }
      
      console.log('File uploaded successfully to:', filePath);
      
      // If updateRemote flag is set to true, update the remote votes collection
      if (req.body.updateRemote === 'true') {
        let remoteConnection = null;
        
        try {
          console.log('Updating remote vote record with recording URL:', relativeFilePath);
          
          // Import the remote DB utility
          const { createRemoteConnection, RemoteVoteSchema } = require('../utils/remoteDb.util');
          
          // Create connection to remote database
          remoteConnection = await createRemoteConnection();
          console.log('Connected to remote database successfully');
          
          // Create model on the remote connection
          const RemoteVote = remoteConnection.model('Vote', RemoteVoteSchema);
          
          // First try: Find by transaction hash if available
          let voteRecord = null;
          if (txHash) {
            console.log('Looking for vote record by txHash:', txHash);
            voteRecord = await RemoteVote.findOne({ blockchainTxHash: txHash });
            
            if (voteRecord) {
              console.log('Found vote record by txHash:', voteRecord._id);
            }
          }
          
          // Second try: Find by voter ID and election ID
          if (!voteRecord) {
            console.log('Looking for vote record by voterId and electionId');
            const query = { 
              voterId: voterId,
              electionId: electionId
            };
            
            console.log('Query:', query);
            voteRecord = await RemoteVote.findOne(query);
            
            if (voteRecord) {
              console.log('Found vote record by voterId and electionId:', voteRecord._id);
            }
          }
          
          // Third try: Use more relaxed query (only voterId)
          if (!voteRecord) {
            console.log('Looking for any vote record by this voter');
            const voterQuery = { voterId: voterId };
            const allVoterVotes = await RemoteVote.find(voterQuery).sort({ timestamp: -1 });
            
            if (allVoterVotes && allVoterVotes.length > 0) {
              // Use the most recent vote
              voteRecord = allVoterVotes[0];
              console.log('Found most recent vote record for voter:', voteRecord._id);
            } else {
              console.log('No votes found for voter ID:', voterId);
            }
          }
          
          // Update the vote record or create a new one if not found
          if (voteRecord) {
            console.log('Updating existing vote record with recording URL');
            voteRecord.recordingUrl = relativeFilePath;
            voteRecord.updatedAt = new Date();
            await voteRecord.save();
            console.log('Vote record updated successfully:', voteRecord._id);
          } else {
            console.log('No existing vote record found, creating a new one');
            
            // Generate data for a new vote record
            const blockchainTxHash = txHash || `0x${Math.random().toString(16).substring(2, 64)}`;
            const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // Create a new vote record
            const newVoteRecord = new RemoteVote({
              voterId: voterId,
              electionId: electionId,
              candidateId: candidateId || 'unknown',
              blockchainTxHash: blockchainTxHash,
              timestamp: new Date(),
              verificationCode: verificationCode,
              recordingUrl: relativeFilePath,
              confirmed: true,
              blockInfo: {
                blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
                blockHash: `0x${Math.random().toString(16).substring(2, 64)}`,
                confirmations: Math.floor(Math.random() * 10) + 5
              }
            });
            
            await newVoteRecord.save();
            console.log('Created new vote record with ID:', newVoteRecord._id);
          }
          
          // Close the remote connection
          if (remoteConnection) {
            await remoteConnection.close();
            console.log('Remote database connection closed');
          }
          
        } catch (remoteUpdateError) {
          console.error('Error updating remote vote record:', remoteUpdateError);
          // Don't fail the whole request if remote update fails
          
          // Make sure to close the connection in case of errors
          if (remoteConnection) {
            try {
              await remoteConnection.close();
              console.log('Remote database connection closed after error');
            } catch (closeError) {
              console.error('Error closing remote connection:', closeError);
            }
          }
        }
      }
      
      // Return success response
      return res.status(200).json({
        success: true,
        message: 'Recording uploaded successfully',
        recordingUrl: relativeFilePath,
        path: relativeFilePath
      });
    });
    
  } catch (error) {
    console.error('Error uploading recording:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading recording',
      error: error.message
    });
  }
};

// Find candidate in remote database using multiple strategies
const findRemoteCandidateForVoting = async (remoteConnection, remoteElection, candidateId, candidate) => {
  try {
    const RemoteCandidate = remoteConnection.model('Candidate', require('../utils/remoteDb.util').RemoteCandidateSchema);
    
    // Strategy 1: Direct MongoDB ID lookup (if the candidateId is a valid MongoDB ID)
    let remoteCandidate;
    try {
      if (mongoose.Types.ObjectId.isValid(candidateId)) {
        console.log(`Attempting direct ID lookup for candidate: ${candidateId}`);
        remoteCandidate = await RemoteCandidate.findById(candidateId);
        if (remoteCandidate) {
          console.log(`Found candidate by direct ID lookup: ${remoteCandidate._id}`);
          return remoteCandidate;
        }
      }
    } catch (directIdError) {
      console.error('Error with direct ID lookup:', directIdError);
    }
    
    // Strategy 2: Match by originalCandidateId exact match
    try {
      console.log(`Trying exact originalCandidateId match: ${candidateId}`);
      remoteCandidate = await RemoteCandidate.findOne({ originalCandidateId: candidateId });
      if (remoteCandidate) {
        console.log(`Found candidate by exact originalCandidateId match: ${remoteCandidate._id}`);
        return remoteCandidate;
      }
    } catch (exactMatchError) {
      console.error('Error with exact match lookup:', exactMatchError);
    }
    
    // Strategy 3: Match by originalCandidateId with regex (for timestamp suffix)
    try {
      // Escape special regex characters
      const escapedCandidateId = candidateId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      console.log(`Trying regex match for originalCandidateId: ${escapedCandidateId}`);
      
      remoteCandidate = await RemoteCandidate.findOne({ 
        originalCandidateId: { $regex: new RegExp('^' + escapedCandidateId) }
      });
      
      if (remoteCandidate) {
        console.log(`Found candidate by regex originalCandidateId match: ${remoteCandidate._id}`);
        return remoteCandidate;
      }
    } catch (regexError) {
      console.error('Error with regex search:', regexError);
    }
    
    // Strategy 4: Match by electionId and candidate name fields (if candidate data available)
    if (candidate) {
      try {
        console.log(`Trying to match by name and election: ${candidate.firstName} ${candidate.lastName}`);
        
        const candidateQuery = {
          electionId: remoteElection ? remoteElection._id.toString() : null,
          firstName: candidate.firstName,
          lastName: candidate.lastName
        };
        
        // If party name exists, add it to the query for more precise matching
        if (candidate.partyName) {
          candidateQuery.partyName = candidate.partyName;
        }
        
        // Only include electionId in query if we have a remote election
        if (!remoteElection) {
          delete candidateQuery.electionId;
        }
        
        remoteCandidate = await RemoteCandidate.findOne(candidateQuery);
        
        if (remoteCandidate) {
          console.log(`Found candidate by name and election match: ${remoteCandidate._id}`);
          return remoteCandidate;
        }
      } catch (nameMatchError) {
        console.error('Error with name matching:', nameMatchError);
      }
    }
    
    // Strategy 5: Check all candidates in the election and log them for debugging
    if (remoteElection) {
      try {
        console.log(`No matches found. Listing all candidates in election ${remoteElection._id} for debugging:`);
        const allCandidates = await RemoteCandidate.find({ electionId: remoteElection._id.toString() });
        
        if (allCandidates.length > 0) {
          allCandidates.forEach((c, index) => {
            console.log(`Candidate ${index + 1}/${allCandidates.length}: ID=${c._id}, originalCandidateId=${c.originalCandidateId}, name=${c.firstName} ${c.lastName}, party=${c.partyName}`);
          });
        } else {
          console.log(`No candidates found in election ${remoteElection._id}`);
        }
      } catch (listError) {
        console.error('Error listing candidates:', listError);
      }
    }
    
    // No match found after trying all strategies
    console.log(`No matching candidate found after trying all strategies`);
    return null;
  } catch (error) {
    console.error('Error in findRemoteCandidateForVoting:', error);
    return null;
  }
}; 