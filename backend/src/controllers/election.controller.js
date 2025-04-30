const User = require('../models/user.model');
const Voter = require('../models/voter.model');
const Candidate = require('../models/candidate.model');
const Election = require('../models/election.model');
const Vote = require('../models/vote.model');
const { 
  castVoteOnBlockchain,
  getVoterStatusFromBlockchain,
  getCandidateFromBlockchain,
  getElectionStatusFromBlockchain,
  startElectionOnBlockchain,
  endElectionOnBlockchain
} = require('../utils/blockchain.util');
const mongoose = require('mongoose');

// Get all elections
exports.getAllElections = async (req, res) => {
  try {
    console.log('Fetching elections with query params:', req.query);
    
    // Build query based on parameters
    const query = {};
    
    // Filter by archive status if specified
    if (req.query.archived !== undefined) {
      // Convert string 'true'/'false' to boolean
      const isArchived = req.query.archived === 'true';
      query.isArchived = isArchived;
      console.log(`Filtering elections where isArchived = ${isArchived}`);
    }
    
    // Filter by active status if specified
    if (req.query.active !== undefined) {
      // Convert string 'true'/'false' to boolean
      const isActive = req.query.active === 'true';
      query.isActive = isActive;
      console.log(`Filtering elections where isActive = ${isActive}`);
    }
    
    // Execute query
    const elections = await Election.find(query);
    console.log(`Found ${elections.length} elections matching query`);
    
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
    const { name, title, type, description, startDate, endDate, region, pincode } = req.body;
    
    // Use name or title (frontend sends name, but schema expects title)
    const electionTitle = title || name;
    const electionType = type || 'Lok Sabha Elections (General Elections)';
    
    // Log the election type being used
    console.log('Using election type:', electionType);
    
    // Validate required fields
    if (!electionTitle || !electionType || !description || !startDate || !endDate || !region || !pincode) {
      return res.status(400).json({ 
        message: 'All fields are required',
        details: { 
          title: !electionTitle ? 'Election title is required' : null,
          type: !electionType ? 'Election type is required' : null,
          description: !description ? 'Description is required' : null,
          startDate: !startDate ? 'Start date is required' : null,
          endDate: !endDate ? 'End date is required' : null,
          region: !region ? 'Region is required' : null,
          pincode: !pincode ? 'Pincode is required' : null
        }
      });
    }
    
    // Create new election
    const newElection = new Election({
      title: electionTitle, // Use the electionTitle variable
      type: electionType,   // Use the electionType variable
      description,
      region,
      pincode,
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
    
    // Find the election first to check its status
    const existingElection = await Election.findById(id);
    if (!existingElection) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    // Check if the election is archived
    if (existingElection.isArchived) {
      return res.status(403).json({ 
        message: 'Cannot update an archived election',
        details: 'Archived elections are read-only for historical record purposes'
      });
    }
    
    // Check if the election is active
    if (existingElection.isActive) {
      return res.status(403).json({ 
        message: 'Cannot update an active election',
        details: 'Active elections cannot be modified to maintain election integrity'
      });
    }
    
    const { name, title, type, description, region, pincode, startDate, endDate } = req.body;
    
    // Use title or name, and ensure type is preserved
    const electionTitle = title || name || '';
    const electionName = name || title || '';
    const electionType = type || 'Lok Sabha Elections (General Elections)';
    
    // Validate required fields
    if (!electionTitle || !pincode) {
      return res.status(400).json({ 
        message: 'Required fields are missing',
        details: { 
          title: !electionTitle ? 'Election title is required' : null,
          pincode: !pincode ? 'Pincode is required' : null
        }
      });
    }
    
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
        region,
        pincode,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
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
    
    // Check election status
    const election = await Election.findById(id);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    if (election.isActive) {
      return res.status(400).json({ message: 'Cannot delete an active election' });
    }
    
    if (election.isArchived) {
      return res.status(403).json({ 
        message: 'Cannot delete an archived election',
        details: 'Archived elections are preserved for historical records'
      });
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

// Auto-end elections that have passed their end date
exports.checkAndAutoEndElections = async () => {
  try {
    console.log('Checking for elections that need to be auto-ended...');
    
    // Find active elections that have passed their end date
    const now = new Date();
    const expiredElections = await Election.find({
      isActive: true,
      endDate: { $lt: now }
    });
    
    console.log(`Found ${expiredElections.length} expired elections that need to be auto-ended`);
    
    let archivedCandidatesCount = 0;
    
    // Process each expired election
    for (const election of expiredElections) {
      console.log(`Auto-ending expired election: ${election.title} (ID: ${election._id})`);
      
      // Update election status
      election.isActive = false;
      election.endedAt = now;
      
      // Find and link unlinked candidates (having election type but no election reference)
      const unlinkedCandidates = await Candidate.find({
        electionType: election.type,
        $or: [
          { election: { $exists: false } },
          { election: null }
        ]
      });
      
      if (unlinkedCandidates.length > 0) {
        console.log(`Found ${unlinkedCandidates.length} candidates with matching type but no election reference`);
        
        // Link these candidates to this election
        const linkResult = await Candidate.updateMany(
          { 
            electionType: election.type,
            $or: [
              { election: { $exists: false } },
              { election: null }
            ]
          },
          {
            $set: {
              election: election._id,
              inActiveElection: false
            }
          }
        );
        
        console.log(`Linked ${linkResult.modifiedCount} candidates to election ${election.title}`);
      }
      
      // Find all candidates associated with this election
      const candidates = await Candidate.find({
        $or: [
          { election: election._id },
          { electionType: election.type }
        ]
      });
      
      console.log(`Found ${candidates.length} candidates for election ${election.title}`);
      
      // Update candidates - mark as not in active election and archived
      if (candidates.length > 0) {
        const updateResult = await Candidate.updateMany(
          { 
            $or: [
              { election: election._id },
              { electionType: election.type }
            ]
          },
          { 
            $set: {
              inActiveElection: false,
              isArchived: true,
              election: election._id // Explicitly ensure election reference is preserved
            }
          }
        );
        
        console.log(`Updated ${updateResult.modifiedCount} candidates to archived status`);
        archivedCandidatesCount += candidates.length;
      }
      
      // Calculate total votes for the election
      const votes = await Vote.find({ election: election._id });
      const totalVotes = votes.length;
      
      // Save total votes to the election
      election.totalVotes = totalVotes;
      
      // Archive the election
      election.isArchived = true;
      election.archivedAt = now;
      await election.save();
      
      console.log(`Successfully auto-ended and archived election: ${election.title}`);
      
      // Try blockchain integration for election end
      try {
        // Call blockchain integration if available
        if (typeof endElectionOnBlockchain === 'function') {
          const blockchainResult = await endElectionOnBlockchain(election._id.toString());
          
          if (blockchainResult && blockchainResult.success) {
            election.blockchainEndTxHash = blockchainResult.txHash;
            await election.save();
            console.log(`Election ended on blockchain with transaction hash: ${blockchainResult.txHash}`);
          } else {
            console.warn('Blockchain integration failed:', blockchainResult?.error || 'Unknown blockchain error');
          }
        }
      } catch (blockchainError) {
        console.error('Error ending election on blockchain:', blockchainError);
        // Continue with next election
      }
    }
    
    console.log(`Auto-ended ${expiredElections.length} elections and archived ${archivedCandidatesCount} candidates`);
    
    return expiredElections.length;
  } catch (error) {
    console.error('Error in auto-end elections function:', error);
    return 0;
  }
};

// Start an election
exports.startElection = async (req, res) => {
  try {
    const { electionId, metaMaskAddress } = req.body;
    console.log(`Request to start election with ID: ${electionId}`);
    
    if (metaMaskAddress) {
      console.log(`Using MetaMask with address: ${metaMaskAddress}`);
    }
    
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }
    
    // Find the election
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    // If election is already active in the database, we can still proceed
    // but we'll make sure to send the right message back to the client
    const wasAlreadyActive = election.isActive;
    if (wasAlreadyActive) {
      console.log('Election is already active in the database');
    }
    
    // Check if election is archived
    if (election.isArchived) {
      return res.status(403).json({ 
        message: 'Cannot start an archived election',
        details: 'Archived elections are read-only for historical record purposes'
      });
    }
    
    // Check if election end date has passed
    const now = new Date();
    const endDate = new Date(election.endDate);
    if (endDate < now) {
      return res.status(400).json({ 
        message: 'Cannot start an election that has already ended',
        details: 'The end date for this election has passed'
      });
    }
    
    // Build candidate query based on election type
    const candidateQuery = { electionType: election.type };
    if (election.region) {
      candidateQuery.region = election.region;
    }
    
    console.log('Candidate query for election start:', candidateQuery);
    
    // Prepare signer object for MetaMask if address is provided
    let signer = null;
    if (metaMaskAddress && typeof metaMaskAddress === 'string' && metaMaskAddress.startsWith('0x')) {
      signer = { address: metaMaskAddress };
      console.log(`Prepared MetaMask signer with address: ${metaMaskAddress}`);
    }
    
    try {
      // Start the election in the database
      election.isActive = true;
      election.startedAt = Date.now();
      
      // Get all candidates for this election
      const candidates = await Candidate.find(candidateQuery);
      console.log(`Retrieved ${candidates.length} candidates for election`);
      
      // Start election on blockchain
      let blockchainTxHash = null;
      let blockchainError = null;
      let blockchainMessage = null;
      let blockchainSuccess = false;
      let alreadyStartedOnBlockchain = false;
      
      try {
        // Prepare candidate data for blockchain
        const candidateIds = candidates.map(c => c.blockchainId || c._id.toString());
        const candidateNames = candidates.map(c => `${c.firstName} ${c.lastName}`);
        
        console.log('Starting election on blockchain with candidates:', candidateNames);
        
        // Call blockchain integration with MetaMask info if available
        const blockchainResult = await startElectionOnBlockchain(
          election._id.toString(),
          election.title || election.name,
          candidateIds,
          candidateNames,
          signer // Pass signer object to blockchain utility
        );
        
        if (blockchainResult && blockchainResult.success) {
          blockchainSuccess = true;
          if (blockchainResult.alreadyStarted) {
            alreadyStartedOnBlockchain = true;
            blockchainMessage = blockchainResult.message || 'Election was already started on blockchain';
            console.log(blockchainMessage);
          } else {
            blockchainTxHash = blockchainResult.txHash;
            console.log(`Election started on blockchain with transaction hash: ${blockchainTxHash}`);
          }
        } else {
          blockchainError = blockchainResult?.error || 'Unknown blockchain error';
          console.warn('Blockchain integration failed or returned no transaction hash');
          console.warn(blockchainError);
        }
      } catch (blockchainError) {
        console.error('Error starting election on blockchain:', blockchainError);
        // We'll still continue with database update even if blockchain fails
      }
      
      // Save blockchain transaction hash if we got one
      if (blockchainTxHash) {
        election.blockchainStartTxHash = blockchainTxHash;
      } else if (blockchainError) {
        election.blockchainError = blockchainError;
      }
      
      // Save the election with updated fields
      await election.save();
      
      // Associate candidates with this election and mark them as in an active election
      // This makes it easy to find candidates for a specific election
      const updatePromises = candidates.map(candidate => {
        return Candidate.findByIdAndUpdate(
          candidate._id,
          { 
            election: election._id,
            inActiveElection: true
          },
          { new: true }
        );
      });
      
      // Execute all updates in parallel
      await Promise.all(updatePromises);
      
      console.log('Election started successfully:', election);
      
      // Determine the appropriate message to return
      let successMessage = 'Election started successfully';
      if (wasAlreadyActive) {
        successMessage = 'Election was already active in the database';
      }
      if (alreadyStartedOnBlockchain) {
        successMessage += ' (It was already active on the blockchain)';
      }
      
      // Return success response with blockchain status
      res.status(200).json({ 
        message: successMessage,
        election,
        candidatesCount: candidates.length,
        blockchain: {
          success: blockchainSuccess,
          txHash: blockchainTxHash,
          alreadyStarted: alreadyStartedOnBlockchain,
          error: blockchainError,
          message: blockchainMessage
        }
      });
    } catch (dbError) {
      console.error('Database error while starting election:', dbError);
      res.status(500).json({
        message: 'Failed to update election status in database',
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Error starting election:', error);
    res.status(500).json({ message: 'Failed to start election', error: error.message });
  }
};

// End an election
exports.endElection = async (req, res) => {
  try {
    const { electionId, metaMaskAddress } = req.body;
    console.log(`Request to end election with ID: ${electionId}`);
    
    if (metaMaskAddress) {
      console.log(`Using MetaMask with address: ${metaMaskAddress}`);
    }
    
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }
    
    // Find the election
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    // If election is already inactive in the database, we can still proceed
    // but we'll make sure to send the right message back to the client
    const wasAlreadyInactive = !election.isActive;
    if (wasAlreadyInactive) {
      console.log('Election is already inactive in the database');
    }
    
    // Prepare signer object for MetaMask if address is provided
    let signer = null;
    if (metaMaskAddress && typeof metaMaskAddress === 'string' && metaMaskAddress.startsWith('0x')) {
      signer = { address: metaMaskAddress };
      console.log(`Prepared MetaMask signer with address: ${metaMaskAddress}`);
    }
    
    try {
      // End the election in the database
      election.isActive = false;
      election.endedAt = Date.now();
      
      // Also archive the election when it ends
      election.isArchived = true;
      election.archivedAt = Date.now();
      
      // End election on blockchain
      let blockchainTxHash = null;
      let blockchainError = null;
      let blockchainMessage = null;
      let blockchainSuccess = false;
      let alreadyEndedOnBlockchain = false;
      
      try {
        // Call blockchain integration with MetaMask info if available
        const blockchainResult = await endElectionOnBlockchain(signer);
        
        if (blockchainResult && blockchainResult.success) {
          blockchainSuccess = true;
          if (blockchainResult.alreadyEnded) {
            alreadyEndedOnBlockchain = true;
            blockchainMessage = blockchainResult.message || 'Election was already ended on blockchain';
            console.log(blockchainMessage);
          } else {
            blockchainTxHash = blockchainResult.txHash;
            console.log(`Election ended on blockchain with transaction hash: ${blockchainTxHash}`);
          }
        } else {
          blockchainError = blockchainResult?.error || 'Unknown blockchain error';
          console.warn('Blockchain integration failed or returned no transaction hash');
          console.warn(blockchainError);
        }
      } catch (blockchainError) {
        console.error('Error ending election on blockchain:', blockchainError);
        // We'll still continue with database update even if blockchain fails
      }
      
      // Save blockchain transaction hash if we got one
      if (blockchainTxHash) {
        election.blockchainEndTxHash = blockchainTxHash;
      } else if (blockchainError) {
        election.blockchainError = blockchainError;
      }
      
      // Step 1: Find all unlinked candidates (having election type but no election reference)
      const unlinkedCandidates = await Candidate.find({
        electionType: election.type,
        $or: [
          { election: { $exists: false } },
          { election: null }
        ]
      });
      
      if (unlinkedCandidates.length > 0) {
        console.log(`Found ${unlinkedCandidates.length} candidates with matching type but no election reference`);
        
        // Link these candidates to this election
        const linkResult = await Candidate.updateMany(
          { 
            electionType: election.type,
            $or: [
              { election: { $exists: false } },
              { election: null }
            ]
          },
          {
            $set: {
              election: election._id,
              inActiveElection: false
            }
          }
        );
        
        console.log(`Linked ${linkResult.modifiedCount} candidates to election ${election.title}`);
      }
      
      // Step 2: Get all candidates for this election (either by direct reference or type)
      const candidates = await Candidate.find({ 
        $or: [
          { election: election._id },
          { electionType: election.type }
        ]
      });
      
      console.log(`Found ${candidates.length} candidates associated with this election to archive`);
      
      // Step 3: Calculate total votes for the election
      const votes = await Vote.find({ election: election._id });
      const totalVotes = votes.length;
      
      // Save total votes to the election
      election.totalVotes = totalVotes;
      
      // Save the election with updated fields
      await election.save();
      
      // Step 4: Update all candidates to mark them as archived and no longer active
      // Ensure the election reference is preserved for all candidates
      const updateResult = await Candidate.updateMany(
        { 
          $or: [
            { election: election._id },
            { electionType: election.type }
          ]
        },
        { 
          $set: {
            inActiveElection: false,
            isArchived: true,
            election: election._id // Explicitly ensure election reference is preserved
          }
        }
      );
      
      console.log(`Updated ${updateResult.modifiedCount} candidates to archived status`);
      console.log('Election ended and archived successfully:', election);
      
      // Determine the appropriate message to return
      let successMessage = 'Election ended and archived successfully';
      if (wasAlreadyInactive) {
        successMessage = 'Election was already inactive and has been archived successfully';
      }
      if (alreadyEndedOnBlockchain) {
        successMessage += ' (It was already inactive on the blockchain)';
      }
      
      // Return success response with blockchain status
      res.status(200).json({ 
        message: successMessage,
        election,
        archivedCandidates: candidates.length,
        totalVotes,
        blockchain: {
          success: blockchainSuccess,
          txHash: blockchainTxHash,
          alreadyEnded: alreadyEndedOnBlockchain,
          error: blockchainError,
          message: blockchainMessage
        }
      });
    } catch (dbError) {
      console.error('Database error while ending election:', dbError);
      res.status(500).json({
        message: 'Failed to update election status in database',
        error: dbError.message
      });
    }
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
    
    // For each active election, fetch associated candidates
    const electionsWithCandidates = await Promise.all(
      activeElections.map(async (election) => {
        // Find candidates for this election type
        const candidates = await Candidate.find({
          $or: [
            { election: election._id },
            { electionType: election.type }
          ]
        });
        
        // Convert to plain object to add candidates
        const electionObj = election.toObject();
        electionObj.candidates = candidates.map(c => ({
          id: c._id,
          name: `${c.firstName} ${c.middleName ? c.middleName + ' ' : ''}${c.lastName}`,
          partyName: c.partyName,
          partySymbol: c.partySymbol,
          photoUrl: c.photoUrl,
          constituency: c.constituency
        }));
        
        return electionObj;
      })
    );
    
    res.status(200).json(electionsWithCandidates);
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
    console.log(`Attempting to cast vote for candidate ID: ${candidateId} and blockchain ID: ${candidate.blockchainId || 'not set'}`);
    const blockchainResult = await castVoteOnBlockchain(privateKey, candidate.blockchainId);
    
    let blockchainSuccess = false;
    let blockchainError = null;
    let blockchainTxHash = null;
    
    if (blockchainResult.success) {
      blockchainSuccess = true;
      blockchainTxHash = blockchainResult.txHash;
      console.log(`Vote cast successfully on blockchain with transaction hash: ${blockchainTxHash}`);
    } else {
      blockchainError = blockchainResult.error;
      console.error('Failed to cast vote on blockchain:', blockchainError);
      
      // Check if error indicates voter has already voted on blockchain
      if (blockchainError && 
          (blockchainError.includes("Voter has already voted") || 
           blockchainError.toLowerCase().includes("already voted"))) {
        return res.status(400).json({
          message: 'Voter has already cast a vote on the blockchain',
          details: 'The blockchain record shows you have already voted in this election',
          error: blockchainError
        });
      }
      
      // If it's another blockchain error, we'll still store the vote in our database
      console.log('Continuing with database vote storage despite blockchain error');
    }
    
    // Create vote record in our database
    const vote = new Vote({
      voter: voter._id,
      candidate: candidate._id,
      election: election._id,
      blockchainTxHash,
      blockchainError: blockchainSuccess ? null : blockchainError
    });
    
    await vote.save();
    console.log(`Vote saved to database with ID: ${vote._id}`);
    
    // Update candidate vote count in our database
    candidate.voteCount = (candidate.voteCount || 0) + 1;
    await candidate.save();
    console.log(`Candidate vote count updated to: ${candidate.voteCount}`);
    
    // Update election total votes
    election.totalVotes = (election.totalVotes || 0) + 1;
    await election.save();
    console.log(`Election total votes updated to: ${election.totalVotes}`);
    
    res.json({
      message: blockchainSuccess 
        ? 'Vote cast successfully and recorded on blockchain' 
        : 'Vote recorded in database, but blockchain transaction failed',
      vote: {
        id: vote._id,
        timestamp: vote.createdAt,
        candidate: {
          id: candidate._id,
          name: `${candidate.firstName} ${candidate.middleName ? candidate.middleName + ' ' : ''}${candidate.lastName}`,
          party: candidate.partyName
        },
        blockchain: {
          success: blockchainSuccess,
          txHash: blockchainTxHash,
          error: blockchainError
        }
      }
    });
  } catch (error) {
    console.error('Cast vote error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Server error while casting vote';
    if (error.message) {
      if (error.message.includes('private key') || error.message.includes('privateKey')) {
        errorMessage = 'Invalid private key format or encryption error';
      } else if (error.message.includes('gas') || error.message.includes('Gas')) {
        errorMessage = 'Blockchain transaction error: insufficient gas or gas estimation failed';
      } else if (error.message.includes('reverted') || error.message.includes('revert')) {
        errorMessage = 'Blockchain transaction was reverted. You may have already voted or the election has ended';
      } else {
        errorMessage = `Transaction error: ${error.message}`;
      }
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

// Check and archive inactive elections that are past their end date
exports.checkAndArchiveInactiveElections = async () => {
  try {
    console.log('Checking for inactive elections that need to be archived...');
    
    // Find inactive elections past their end date that aren't archived yet
    const now = new Date();
    const unarchived = await Election.find({
      isActive: false,
      endDate: { $lt: now },
      isArchived: { $ne: true }
    });
    
    console.log(`Found ${unarchived.length} inactive elections that need to be archived`);
    
    let totalArchivedCandidates = 0;
    
    // Archive each unarchived election
    for (const election of unarchived) {
      console.log(`Archiving election: ${election.title} (ID: ${election._id})`);
      
      // Find candidates associated with this election by type but without an election reference
      const unlinkedCandidates = await Candidate.find({
        electionType: election.type,
        election: { $exists: false }
      });
      
      // Add election reference to unlinked candidates
      if (unlinkedCandidates.length > 0) {
        console.log(`Found ${unlinkedCandidates.length} candidates with matching type but no election reference`);
        
        // Update these candidates to link them to this election
        const linkResult = await Candidate.updateMany(
          { 
            electionType: election.type,
            election: { $exists: false }
          },
          {
            election: election._id
          }
        );
        
        console.log(`Linked ${linkResult.modifiedCount} candidates to election ${election.title}`);
      }
      
      // Find all candidates associated with this election (either by ID or type)
      const candidates = await Candidate.find({
        $or: [
          { election: election._id },
          { electionType: election.type }
        ]
      });
      
      console.log(`Found ${candidates.length} candidates associated with election ${election.title}`);
      
      if (candidates.length > 0) {
        // Update all candidates to mark them as archived while PRESERVING election reference
        const candidateUpdateResult = await Candidate.updateMany(
          { 
            $or: [
              { election: election._id },
              { electionType: election.type }
            ]
          },
          { 
            $set: {
              inActiveElection: false,
              isArchived: true,
              election: election._id // Explicitly set the election reference to ensure it's preserved
            }
          }
        );
        
        totalArchivedCandidates += candidates.length;
        console.log(`Updated ${candidateUpdateResult.modifiedCount} candidates to archived status while preserving election reference`);
      }
      
      // Calculate and save total votes for the election (helps with reporting)
      const totalVotes = await Vote.countDocuments({ election: election._id });
      
      // Archive the election
      election.isArchived = true;
      election.archivedAt = now;
      election.totalVotes = totalVotes;
      await election.save();
      
      console.log(`Successfully archived election: ${election.title} with ${candidates.length} candidates and ${totalVotes} votes`);
    }
    
    console.log(`Archive operation completed: ${unarchived.length} elections and ${totalArchivedCandidates} candidates archived`);
    
    return unarchived.length;
  } catch (error) {
    console.error('Error in archive inactive elections function:', error);
    return 0;
  }
}; 