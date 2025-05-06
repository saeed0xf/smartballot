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
  endElectionOnBlockchain,
  createElectionOnBlockchain,
  addCandidateToBlockchain,
  getElectionFromBlockchain,
  getElectionResultsFromBlockchain,
  archiveElectionOnBlockchain,
  getAllElectionsFromBlockchain
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
    
    // First create the election on the blockchain
    let blockchainElectionId = null;
    let blockchainTxHash = null;
    let blockchainSuccess = false;
    let blockchainError = null;
    
    try {
      console.log('Creating election on blockchain first...');
      const blockchainResult = await createElectionOnBlockchain(
        electionTitle,
        description,
        electionType,
        region,
        pincode,
        new Date(startDate),
        new Date(endDate)
      );
      
      if (blockchainResult.success) {
        blockchainSuccess = true;
        blockchainTxHash = blockchainResult.txHash;
        blockchainElectionId = blockchainResult.electionId;
        console.log(`Election created on blockchain with ID: ${blockchainElectionId}, tx hash: ${blockchainTxHash}`);
      } else {
        blockchainError = blockchainResult.error;
        console.error('Failed to create election on blockchain:', blockchainError);
      }
    } catch (blockchainErr) {
      blockchainError = blockchainErr.message || 'Unknown blockchain error';
      console.error('Exception creating election on blockchain:', blockchainErr);
    }
    
    // Create new election in database
    const newElection = new Election({
      title: electionTitle,
      type: electionType,
      description,
      region,
      pincode,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: false,
      createdBy: req.userId, // Set by auth middleware
      blockchainElectionId: blockchainElectionId, // Store the blockchain ID
      blockchainCreateTxHash: blockchainTxHash // Store the transaction hash
    });
    
    try {
      const savedElection = await newElection.save();
      console.log('Election created successfully in database:', savedElection);
      
      // Return with blockchain status
      res.status(201).json({
        ...savedElection.toObject(),
        blockchain: {
          success: blockchainSuccess,
          electionId: blockchainElectionId,
          txHash: blockchainTxHash,
          error: blockchainError
        }
      });
    } catch (dbError) {
      console.error('Error saving election to database:', dbError);
      // Return a more detailed error message
      res.status(500).json({ 
        message: 'Failed to create election in database', 
        error: dbError.message,
        details: dbError.errors ? Object.keys(dbError.errors).map(key => ({
          field: key,
          message: dbError.errors[key].message
        })) : null,
        blockchain: {
          success: blockchainSuccess,
          electionId: blockchainElectionId,
          txHash: blockchainTxHash,
          error: blockchainError
        }
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
      let useMetaMask = false;
      let contractDetails = null;
      
      try {
        // Ensure we have a blockchain election ID
        if (!election.blockchainElectionId) {
          console.warn('No blockchain election ID found in database, cannot start on blockchain');
          blockchainError = 'No blockchain election ID available';
        } else {
          console.log(`Starting election on blockchain with ID: ${election.blockchainElectionId}`);
        
          // Call blockchain integration with MetaMask info if available
          const blockchainResult = await startElectionOnBlockchain(
            election.blockchainElectionId,
            signer // Pass signer object to blockchain utility
          );
          
          if (blockchainResult && blockchainResult.success) {
            blockchainSuccess = true;
            
            // Check if this is a MetaMask transaction that needs approval
            if (blockchainResult.useMetaMask) {
              useMetaMask = true;
              contractDetails = {
                address: blockchainResult.contractAddress,
                method: blockchainResult.methodName,
                params: blockchainResult.params
              };
              blockchainMessage = blockchainResult.message || 'Please approve the transaction in MetaMask';
              console.log('Returning MetaMask transaction details to frontend');
            } else if (blockchainResult.alreadyStarted) {
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
        }
      } catch (blockchainErr) {
        blockchainError = blockchainErr.message || 'Unknown blockchain error';
        console.error('Error starting election on blockchain:', blockchainErr);
        // We'll still continue with database update even if blockchain fails
      }
      
      // If this is a MetaMask transaction, don't update the database yet
      // The frontend will call a separate endpoint after the transaction completes
      if (useMetaMask) {
        return res.status(200).json({
          message: 'Please approve the MetaMask transaction to start the election',
          election: {
            id: election._id,
            title: election.title
          },
          useMetaMask: true,
          contractDetails,
          candidatesCount: candidates.length,
          blockchain: {
            success: blockchainSuccess,
            useMetaMask: true,
            message: blockchainMessage
          }
        });
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
    
    // Check if election is archived
    if (election.isArchived) {
      return res.status(403).json({ 
        message: 'Cannot end an archived election',
        details: 'Archived elections are read-only for historical record purposes'
      });
    }
    
    // Prepare signer object for MetaMask if address is provided
    let signer = null;
    if (metaMaskAddress && typeof metaMaskAddress === 'string' && metaMaskAddress.startsWith('0x')) {
      signer = { address: metaMaskAddress };
      console.log(`Prepared MetaMask signer with address: ${metaMaskAddress}`);
    }
    
    try {
      // Mark the election as inactive in the database
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
      let useMetaMask = false;
      let contractDetails = null;
      
      try {
        // Ensure we have a blockchain election ID
        if (!election.blockchainElectionId) {
          console.warn('No blockchain election ID found in database, cannot end on blockchain');
          blockchainError = 'No blockchain election ID available';
        } else {
          console.log(`Ending election on blockchain with ID: ${election.blockchainElectionId}`);
          
          // Call blockchain integration with MetaMask info if available
          const blockchainResult = await endElectionOnBlockchain(
            election.blockchainElectionId,
            signer
          );
          
          if (blockchainResult && blockchainResult.success) {
            blockchainSuccess = true;
            
            // Check if this is a MetaMask transaction that needs approval
            if (blockchainResult.useMetaMask) {
              useMetaMask = true;
              contractDetails = {
                address: blockchainResult.contractAddress,
                method: blockchainResult.methodName,
                params: blockchainResult.params
              };
              blockchainMessage = blockchainResult.message || 'Please approve the transaction in MetaMask';
              console.log('Returning MetaMask transaction details to frontend');
            } else if (blockchainResult.alreadyEnded) {
              alreadyEndedOnBlockchain = true;
              blockchainMessage = blockchainResult.message || 'Election was already ended on blockchain';
              console.log(blockchainMessage);
            } else {
              blockchainTxHash = blockchainResult.txHash;
              console.log(`Election ended on blockchain with transaction hash: ${blockchainTxHash}`);
            }
            
            // Now archive the election on blockchain
            if (!useMetaMask) {
              try {
                console.log(`Archiving election on blockchain with ID: ${election.blockchainElectionId}`);
                const archiveResult = await archiveElectionOnBlockchain(election.blockchainElectionId);
                
                if (archiveResult && archiveResult.success) {
                  console.log(`Election archived on blockchain with transaction hash: ${archiveResult.txHash}`);
                  election.blockchainArchiveTxHash = archiveResult.txHash;
                } else {
                  console.warn('Blockchain archiving failed:', archiveResult?.error);
                }
              } catch (archiveError) {
                console.error('Error archiving election on blockchain:', archiveError);
                // Continue anyway, the election is still marked as ended which is the primary function
              }
            }
          } else {
            blockchainError = blockchainResult?.error || 'Unknown blockchain error';
            console.warn('Blockchain integration failed or returned no transaction hash');
            console.warn(blockchainError);
          }
        }
      } catch (blockchainErr) {
        blockchainError = blockchainErr.message || 'Unknown blockchain error';
        console.error('Error ending election on blockchain:', blockchainErr);
        // We'll still continue with database update even if blockchain fails
      }
      
      // If this is a MetaMask transaction, don't update the database yet
      // The frontend will call a separate endpoint after the transaction completes
      if (useMetaMask) {
        return res.status(200).json({
          message: 'Please approve the MetaMask transaction to end the election',
          election: {
            id: election._id,
            title: election.title
          },
          useMetaMask: true,
          contractDetails,
          blockchain: {
            success: blockchainSuccess,
            useMetaMask: true,
            message: blockchainMessage
          }
        });
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
    console.log('Fetching candidates with query params:', req.query);
    const { electionId, active } = req.query;
    
    // Build query for candidates
    const candidateQuery = {};

    // Build query for finding active elections
    const electionQuery = { isActive: true };
    
    // If specific election ID is provided
    if (electionId && mongoose.Types.ObjectId.isValid(electionId)) {
      candidateQuery.election = electionId;
      
      // If we're querying by specific election ID, we should get that election
      // regardless of active status (but we'll still respect the active parameter)
      if (active !== 'false') {
        electionQuery._id = electionId;
      } else {
        // If active=false and electionId is provided, adjust election query
        delete electionQuery.isActive;
        electionQuery._id = electionId;
      }
      
      console.log(`Filtering candidates by election ID: ${electionId}`);
    }
    
    // Get active elections or specified election
    const activeElections = await Election.find(electionQuery);
    console.log(`Found ${activeElections.length} active elections`);
    
    if (activeElections.length === 0 && !candidateQuery.election) {
      // If no active elections and no specific election ID, return empty result
      return res.json({ 
        candidates: [],
        message: 'No active elections found'
      });
    }
    
    // If no specific election ID provided, find candidates from all active elections
    if (!candidateQuery.election && activeElections.length > 0) {
      const electionIds = activeElections.map(e => e._id);
      candidateQuery.election = { $in: electionIds };
    }
    
    console.log('Final candidate query:', JSON.stringify(candidateQuery));
    
    // Get candidates with populated election data
    const candidates = await Candidate.find(candidateQuery)
      .populate({
        path: 'election',
        select: 'title name type description startDate endDate isActive pincode',
        options: { lean: true }
      })
      .sort({ firstName: 1 });
    
    console.log(`Found ${candidates.length} candidates matching the query`);
    
    // Format candidates with consistent field names and additional details
    const formattedCandidates = candidates.map(candidate => {
      const candidateObj = candidate.toObject();
      
      // Create a consistent representation
      return {
        id: candidateObj._id,
        _id: candidateObj._id, // Include both for compatibility
        firstName: candidateObj.firstName,
        lastName: candidateObj.lastName,
        middleName: candidateObj.middleName || '',
        name: `${candidateObj.firstName} ${candidateObj.middleName ? candidateObj.middleName + ' ' : ''}${candidateObj.lastName}`,
        age: candidateObj.age,
        gender: candidateObj.gender,
        dateOfBirth: candidateObj.dateOfBirth,
        photoUrl: candidateObj.photoUrl,
        partyName: candidateObj.partyName,
        partySymbol: candidateObj.partySymbol,
        constituency: candidateObj.constituency,
        manifesto: candidateObj.manifesto,
        education: candidateObj.education,
        experience: candidateObj.experience,
        biography: candidateObj.biography,
        slogan: candidateObj.slogan,
        email: candidateObj.email,
        electionId: candidateObj.election?._id,
        electionName: candidateObj.election?.title || candidateObj.election?.name || 'Unknown Election',
        electionType: candidateObj.election?.type || candidateObj.electionType || 'General Election',
        electionDescription: candidateObj.election?.description,
        electionStartDate: candidateObj.election?.startDate,
        electionEndDate: candidateObj.election?.endDate,
        electionPincode: candidateObj.election?.pincode
      };
    });
    
    // Group candidates by election for better organization
    const candidatesByElection = {};
    formattedCandidates.forEach(candidate => {
      if (!candidatesByElection[candidate.electionId]) {
        candidatesByElection[candidate.electionId] = {
          electionId: candidate.electionId,
          electionName: candidate.electionName,
          electionType: candidate.electionType,
          electionDescription: candidate.electionDescription,
          electionStartDate: candidate.electionStartDate,
          electionEndDate: candidate.electionEndDate,
          electionPincode: candidate.electionPincode,
          candidates: []
        };
      }
      candidatesByElection[candidate.electionId].candidates.push(candidate);
    });
    
    // Convert to array format
    const electionGroups = Object.values(candidatesByElection);
    
    res.json({ 
      candidates: formattedCandidates,
      elections: electionGroups,
      totalCandidates: formattedCandidates.length,
      totalElections: electionGroups.length
    });
  } catch (error) {
    console.error('Get all candidates error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get candidate details
exports.getCandidateDetails = async (req, res) => {
  try {
    const { candidateId } = req.params;
    console.log(`Fetching details for candidate ID: ${candidateId}`);
    
    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ 
        message: 'Invalid candidate ID format',
        details: 'The provided candidate ID is not in a valid MongoDB ObjectId format'
      });
    }
    
    // Find candidate with populated election data
    const candidate = await Candidate.findById(candidateId)
      .populate({
        path: 'election',
        select: 'title name type description startDate endDate isActive pincode',
      });
    
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    console.log(`Found candidate: ${candidate.firstName} ${candidate.lastName}`);
    
    // Try to get blockchain data if available
    let blockchainData = { success: false };
    try {
      if (candidate.blockchainId) {
        blockchainData = await getCandidateFromBlockchain(candidate.blockchainId);
      }
    } catch (blockchainError) {
      console.error('Error fetching blockchain data:', blockchainError);
      // Continue without blockchain data
    }
    
    // Convert to a clean response object
    const response = {
        id: candidate._id,
      _id: candidate._id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      middleName: candidate.middleName || '',
      name: `${candidate.firstName} ${candidate.middleName ? candidate.middleName + ' ' : ''}${candidate.lastName}`,
      age: candidate.age,
      gender: candidate.gender,
      dateOfBirth: candidate.dateOfBirth,
      photoUrl: candidate.photoUrl,
      partyName: candidate.partyName,
      partySymbol: candidate.partySymbol,
      constituency: candidate.constituency,
      manifesto: candidate.manifesto,
      education: candidate.education,
      experience: candidate.experience,
      biography: candidate.biography,
        slogan: candidate.slogan,
      email: candidate.email,
        blockchainId: candidate.blockchainId,
      voteCount: blockchainData.success ? blockchainData.data?.voteCount : (candidate.voteCount || 0),
      election: candidate.election ? {
        id: candidate.election._id,
        name: candidate.election.title || candidate.election.name,
        type: candidate.election.type,
        description: candidate.election.description,
        startDate: candidate.election.startDate,
        endDate: candidate.election.endDate,
        isActive: candidate.election.isActive,
        pincode: candidate.election.pincode
      } : null
    };
    
    res.json({ candidate: response });
  } catch (error) {
    console.error('Get candidate details error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Cast vote
exports.castVote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { candidateId, privateKey, electionId } = req.body;
    
    // Validate required fields
    if (!candidateId || !privateKey) {
      return res.status(400).json({ message: 'Candidate ID and private key are required' });
    }
    
    // Find election - either from the provided ID or get the active one
    let election;
    if (electionId && mongoose.Types.ObjectId.isValid(electionId)) {
      election = await Election.findById(electionId);
      if (!election) {
        return res.status(404).json({ message: 'Election not found' });
      }
      
      // Check if this election is active
      if (!election.isActive) {
        return res.status(400).json({ 
          message: 'This election is not active',
          details: 'Votes can only be cast during active elections'
        });
      }
    } else {
      // Find active election if no specific election ID was provided
      election = await Election.findOne({ isActive: true });
    if (!election) {
      return res.status(400).json({ message: 'No active election found' });
      }
    }
    
    // Verify the election is still active and not recently ended
    const electionStatus = await getElectionStatusFromBlockchain(election.blockchainElectionId);
    if (electionStatus.success && electionStatus.data) {
      if (electionStatus.data.ended) {
        console.log('Blockchain indicates the election has already ended');
        return res.status(400).json({ 
          message: 'The election has already ended',
          details: 'Voting period for this election has closed and votes are no longer being accepted'
        });
      }
      
      if (!electionStatus.data.started) {
        console.log('Blockchain indicates the election has not started');
        return res.status(400).json({ 
          message: 'The election has not started yet',
          details: 'Voting period for this election has not begun'
        });
      }
    } else {
      console.warn('Could not verify election status on blockchain, proceeding with database check');
    }
    
    // Additional check against database end date
    if (election.endDate && new Date(election.endDate) < new Date()) {
      console.log('Election end date has passed:', election.endDate);
      
      // Also update the database to mark the election as inactive
      election.isActive = false;
      await election.save();
      
      return res.status(400).json({ 
        message: 'The election has ended',
        details: 'The voting period for this election ended on ' + new Date(election.endDate).toLocaleString()
      });
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
    
    // Ensure candidate has a valid blockchainId
    if (!candidate.blockchainId) {
      console.log('Candidate does not have a blockchain ID in the database, checking if we can derive one');
      
      // If not available, check if we can derive a blockchainId
      // For example, we might be able to use the candidate's position in the list of candidates
      try {
        const allCandidates = await Candidate.find({ election: election._id }).sort({ _id: 1 });
        const index = allCandidates.findIndex(c => c._id.toString() === candidate._id.toString());
        
        if (index !== -1) {
          // Use index + 1 as blockchain ID (assuming blockchain candidates are 1-indexed)
          console.log(`Derived blockchain ID for candidate: ${index + 1} (based on position in candidates list)`);
          candidate.blockchainId = index + 1;
          
          // Save the derived ID back to the database for future use
          await candidate.save();
        } else {
          return res.status(400).json({ 
            message: 'Invalid candidate blockchain ID',
            details: 'This candidate does not have a valid blockchain ID configured and one could not be derived'
          });
        }
      } catch (error) {
        console.error('Error deriving candidate blockchain ID:', error);
        return res.status(400).json({ 
          message: 'Invalid candidate blockchain ID',
          details: 'This candidate does not have a valid blockchain ID configured'
        });
      }
    }
    
    // Convert the blockchainId to a proper numeric value
    const candidateBlockchainId = parseInt(candidate.blockchainId);
    if (isNaN(candidateBlockchainId)) {
      return res.status(400).json({ 
        message: 'Invalid candidate blockchain ID format',
        details: 'The candidate\'s blockchain ID is not a valid number'
      });
    }
    
    console.log(`Using blockchain ID ${candidateBlockchainId} for candidate ${candidate.firstName} ${candidate.lastName}`);
    
    // Check if voter has already voted
    const existingVote = await Vote.findOne({ voter: voter._id, election: election._id });
    if (existingVote) {
      return res.status(400).json({ message: 'Voter has already cast a vote in this election' });
    }
    
    let blockchainSuccess = false;
    let blockchainError = null;
    let blockchainTxHash = null;
    
    // Check if the privateKey is a MetaMask signature (starts with 0x and is longer than a standard private key)
    const isMetaMaskSignature = privateKey.startsWith('0x') && privateKey.length > 100;
    
    if (isMetaMaskSignature) {
      console.log('Detected MetaMask signature, need to record vote on blockchain');
      
      try {
        // Get the user's wallet address
        const user = await User.findById(userId);
        if (!user || !user.walletAddress) {
          return res.status(400).json({ 
            message: 'Wallet address not found for this voter',
            details: 'Your account is not properly linked to a blockchain wallet address'
          });
        }
        
        console.log(`Using wallet address ${user.walletAddress} for MetaMask transaction`);
        
        // Since we don't have a private key but just a signature, we'll need to use a server-side wallet
        // to submit the transaction on behalf of the user, based on their signature authorization
        const serverPrivateKey = process.env.ADMIN_PRIVATE_KEY;
        if (!serverPrivateKey) {
          console.error('ADMIN_PRIVATE_KEY environment variable is not set');
          
          // Record the vote in the database without blockchain confirmation
          console.log('Proceeding without blockchain confirmation due to missing ADMIN_PRIVATE_KEY');
          
          blockchainTxHash = `metamask-signature-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          
          // Add warning to response
          res.locals.blockchainWarning = 'Vote recorded in database, but not on blockchain due to server configuration issue';
        } else {
          // Use the server private key to submit the transaction on behalf of the signed user
          console.log(`Attempting to cast vote for election ID: ${election.blockchainElectionId}, candidate ID: ${candidateBlockchainId}`);
          const blockchainResult = await castVoteOnBlockchain(serverPrivateKey, election.blockchainElectionId, candidateBlockchainId);
    
    if (blockchainResult.success) {
      blockchainSuccess = true;
      blockchainTxHash = blockchainResult.txHash;
      console.log(`Vote cast successfully on blockchain with transaction hash: ${blockchainTxHash}`);
    } else {
      blockchainError = blockchainResult.error;
            console.error('Failed to cast vote on blockchain using server key:', blockchainError);
      
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
      
            // Check if error indicates election has ended
            if (blockchainError && 
                (blockchainError.includes("Election has already ended") || 
                 blockchainError.includes("Election has ended") ||
                 blockchainError.toLowerCase().includes("election") && 
                 blockchainError.toLowerCase().includes("ended"))) {
              return res.status(400).json({
                message: 'The election has already ended',
                details: 'Voting period for this election has closed and votes are no longer being accepted',
                error: blockchainError
              });
            }
            
            // Return error if we couldn't record on blockchain - this is critical for verification
            return res.status(500).json({ 
              message: 'Failed to record vote on blockchain',
              error: blockchainError,
              details: 'Your vote could not be recorded on the blockchain for verification',
              candidateId: candidateBlockchainId,
              electionId: election.blockchainElectionId
            });
          }
        }
      } catch (metaMaskError) {
        console.error('Error processing MetaMask transaction:', metaMaskError);
        blockchainError = metaMaskError.message;
        
        // Still allow vote to be recorded in database, but note the error
        res.locals.blockchainWarning = 'Vote recorded in database, but blockchain verification failed: ' + blockchainError;
        
        blockchainTxHash = `error-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      }
    } else {
      // Private key provided directly (not through MetaMask)
      console.log('Regular private key provided, attempting to cast vote directly on blockchain');
      
      try {
        // Call the blockchain directly
        console.log(`Attempting to cast vote for election ID: ${election.blockchainElectionId}, candidate ID: ${candidateBlockchainId}`);
        const blockchainResult = await castVoteOnBlockchain(privateKey, election.blockchainElectionId, candidateBlockchainId);
        
        if (blockchainResult.success) {
          blockchainSuccess = true;
          blockchainTxHash = blockchainResult.txHash;
          console.log(`Vote cast successfully on blockchain with transaction hash: ${blockchainTxHash}`);
        } else {
          blockchainError = blockchainResult.error;
          console.error('Failed to cast vote on blockchain with provided private key:', blockchainError);
          
          // Check if this is a critical blockchain error
          const criticalError = 
            (blockchainError && blockchainError.includes("Voter has already voted")) ||
            (blockchainError && blockchainError.includes("Election has ended"));
          
          if (criticalError) {
            return res.status(400).json({
              message: 'Failed to cast vote on blockchain',
              error: blockchainError,
              details: blockchainError.includes("already voted") 
                ? 'You have already voted in this election according to the blockchain records' 
                : 'The election has ended and votes are no longer being accepted'
            });
          }
        }
      } catch (blockchainErr) {
        blockchainError = blockchainErr.message;
        console.error('Exception casting vote on blockchain:', blockchainErr);
        
        // Allow vote to be recorded in database, but note the error
        res.locals.blockchainWarning = 'Vote recorded in database, but blockchain verification failed: ' + blockchainError;
        
        blockchainTxHash = `error-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      }
    }
    
    // Record the vote in the database
    const vote = new Vote({
      voter: voter._id,
      candidate: candidate._id,
      election: election._id,
      blockchainTxHash
    });
    
    await vote.save();
    
    // Update candidate's vote count
    candidate.voteCount = (candidate.voteCount || 0) + 1;
    await candidate.save();
    
    // Generate response with appropriate message and blockchain status
    let message = 'Vote cast successfully';
    if (res.locals.blockchainWarning) {
      message += ' (with warning)';
    }
    
    res.status(201).json({
      message,
        candidate: {
          id: candidate._id,
        name: `${candidate.firstName} ${candidate.lastName}`,
          party: candidate.partyName
        },
      election: {
        id: election._id,
        title: election.title
      },
        blockchain: {
          success: blockchainSuccess,
          txHash: blockchainTxHash,
        error: blockchainError,
        warning: res.locals.blockchainWarning
      }
    });
  } catch (error) {
    console.error('Error casting vote:', error);
    res.status(500).json({ 
      message: 'Failed to cast vote', 
      error: error.message
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
    const vote = await Vote.findOne({ voter: voter._id, election: election._id }).populate('candidate election');
    if (!vote) {
      return res.status(404).json({ message: 'No vote found for this election' });
    }
    
    // Get user for wallet address
    const user = await User.findById(userId);
    
    // Get blockchain verification status
    let blockchainStatus = null;
    let blockchainVerification = "Unknown";
    let verificationDetails = null;
    
    if (user && user.walletAddress) {
      try {
        console.log(`Getting blockchain voter status for wallet: ${user.walletAddress}`);
      blockchainStatus = await getVoterStatusFromBlockchain(user.walletAddress);
        
        if (blockchainStatus && blockchainStatus.success) {
          if (blockchainStatus.data.hasVoted) {
            const votedCandidateId = blockchainStatus.data.votedCandidateId;
            
            // Check if blockchain candidateId matches our database record
            // Note: We might need to compare string representations or normalized values
            if (vote.candidate && vote.candidate.blockchainId) {
              const databaseBlockchainId = Number(vote.candidate.blockchainId);
              
              if (databaseBlockchainId === votedCandidateId) {
                blockchainVerification = "Verified";
                verificationDetails = {
                  message: "Your vote has been successfully verified on the blockchain",
                  matchStatus: "Matched",
                  blockchainCandidateId: votedCandidateId,
                  databaseCandidateId: vote.candidate.blockchainId
                };
              } else {
                blockchainVerification = "Mismatch";
                verificationDetails = {
                  message: "Your vote record doesn't match the blockchain record",
                  matchStatus: "Mismatch",
                  blockchainCandidateId: votedCandidateId,
                  databaseCandidateId: vote.candidate.blockchainId
                };
              }
            } else {
              blockchainVerification = "Incomplete";
              verificationDetails = {
                message: "Blockchain shows you voted, but candidate blockchain ID is missing in database",
                matchStatus: "Incomplete",
                blockchainCandidateId: votedCandidateId
              };
            }
          } else {
            blockchainVerification = "Not Found";
            verificationDetails = {
              message: "No vote record found on the blockchain for your address",
              matchStatus: "Not Found"
            };
          }
        }
      } catch (blockchainError) {
        console.error("Error verifying vote on blockchain:", blockchainError);
        blockchainVerification = "Error";
        verificationDetails = {
          message: "Error verifying your vote on the blockchain",
          error: blockchainError.message
        };
      }
    } else {
      blockchainVerification = "Not Linked";
      verificationDetails = {
        message: "No wallet address linked to your account for blockchain verification"
      };
    }
    
    // Format the candidate information
    const candidateInfo = vote.candidate ? {
      id: vote.candidate._id,
      name: `${vote.candidate.firstName} ${vote.candidate.middleName ? vote.candidate.middleName + ' ' : ''}${vote.candidate.lastName}`,
      party: vote.candidate.partyName,
      partySymbol: vote.candidate.partySymbol,
      photoUrl: vote.candidate.photoUrl,
      blockchainId: vote.candidate.blockchainId
    } : {
      id: null,
      name: "Unknown Candidate",
      party: "Unknown Party"
    };
    
    // Format the election information
    const electionInfo = vote.election ? {
      id: vote.election._id,
      title: vote.election.title || vote.election.name,
      type: vote.election.type,
      startDate: vote.election.startDate,
      endDate: vote.election.endDate,
      isActive: vote.election.isActive
    } : {
      id: null,
      title: "Unknown Election"
    };
    
    res.json({
      vote: {
        id: vote._id,
        timestamp: vote.timestamp || vote.createdAt,
        candidate: candidateInfo,
        election: electionInfo,
        blockchainTxHash: vote.blockchainTxHash,
        blockchainVerification: blockchainVerification,
        verificationDetails: verificationDetails,
        blockchainStatus: blockchainStatus?.success ? {
          isRegistered: blockchainStatus.data.isRegistered,
          isApproved: blockchainStatus.data.isApproved,
          hasVoted: blockchainStatus.data.hasVoted,
          votedCandidateId: blockchainStatus.data.votedCandidateId
        } : null
      }
    });
  } catch (error) {
    console.error('Verify vote error:', error);
    res.status(500).json({ 
      message: 'Server error during vote verification',
      error: error.message
    });
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
        
        totalArchivedCandidates += candidates.length;
    }
    
    console.log(`Archived ${totalArchivedCandidates} candidates`);
    
    return totalArchivedCandidates;
  } catch (error) {
    console.error('Error in checkAndArchiveInactiveElections:', error);
    return 0;
  }
};

// Complete election start after MetaMask transaction
exports.completeElectionStart = async (req, res) => {
  try {
    const { electionId, txHash } = req.body;
    console.log(`Completing election start for ID: ${electionId} with transaction hash: ${txHash}`);
    
    if (!txHash) {
      return res.status(400).json({ message: 'Transaction hash is required' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }
    
    // Find the election
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    // Update election with transaction hash and set as active
    election.isActive = true;
    election.startedAt = Date.now();
    election.blockchainStartTxHash = txHash;
    
    await election.save();
    
    // Build candidate query based on election type
    const candidateQuery = { electionType: election.type };
    if (election.region) {
      candidateQuery.region = election.region;
    }
    
    // Get candidates for this election
    const candidates = await Candidate.find(candidateQuery);
    console.log(`Updating ${candidates.length} candidates for election`);
    
    // Associate candidates with this election and mark them as in an active election
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
    
    console.log('Election start completed in database with blockchain transaction:', txHash);
    
    // Return success response
    res.status(200).json({
      message: 'Election started successfully with blockchain transaction',
      election: {
        id: election._id,
        title: election.title,
        isActive: election.isActive,
        startedAt: election.startedAt,
        blockchainStartTxHash: election.blockchainStartTxHash
      },
      candidatesCount: candidates.length
    });
  } catch (error) {
    console.error('Error completing election start:', error);
    res.status(500).json({ 
      message: 'Failed to complete election start process', 
      error: error.message 
    });
  }
};

// Complete election end after MetaMask transaction
exports.completeElectionEnd = async (req, res) => {
  try {
    const { electionId, txHash } = req.body;
    console.log(`Completing election end for ID: ${electionId} with transaction hash: ${txHash}`);
    
    if (!txHash) {
      return res.status(400).json({ message: 'Transaction hash is required' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }
    
    // Find the election
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    // Update election with transaction hash and set as inactive
    election.isActive = false;
    election.endedAt = Date.now();
    election.isArchived = true;
    election.archivedAt = Date.now();
    election.blockchainEndTxHash = txHash;
    
    await election.save();
    
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
    
    // Try to archive the election on blockchain as well
    let archiveMessage = null;
    try {
      if (election.blockchainElectionId) {
        console.log(`Archiving election on blockchain with ID: ${election.blockchainElectionId}`);
        const archiveResult = await archiveElectionOnBlockchain(election.blockchainElectionId);
        
        if (archiveResult && archiveResult.success) {
          console.log(`Election archived on blockchain with transaction hash: ${archiveResult.txHash}`);
          election.blockchainArchiveTxHash = archiveResult.txHash;
        }
      }
    } catch (archiveError) {
      console.error('Error archiving election on blockchain:', archiveError);
      archiveMessage = 'Note: Could not archive the election on blockchain';
      // Continue anyway, the election ending is the primary function
    }
    
    console.log('Election end completed in database with blockchain transaction:', txHash);
    
    // Return success response
    res.status(200).json({
      message: 'Election ended and archived successfully with blockchain transaction',
      election: {
        id: election._id,
        title: election.title,
        isActive: election.isActive,
        isArchived: election.isArchived,
        endedAt: election.endedAt,
        archivedAt: election.archivedAt,
        blockchainEndTxHash: election.blockchainEndTxHash,
        blockchainArchiveTxHash: election.blockchainArchiveTxHash
      },
      archivedCandidates: candidates.length,
      totalVotes,
      archiveMessage
    });
  } catch (error) {
    console.error('Error completing election end:', error);
    res.status(500).json({ 
      message: 'Failed to complete election end process', 
      error: error.message 
    });
  }
};

// Get election details from blockchain
exports.getElectionDetailsFromBlockchain = async (req, res) => {
  try {
    const { electionId } = req.params;
    console.log(`Getting election details from blockchain for ID: ${electionId}`);
    
    if (!electionId) {
      return res.status(400).json({ message: 'Election ID is required' });
    }
    
    // Find the election in the database to get the blockchain ID
    let blockchainElectionId = electionId;
    
    // If it's a MongoDB ObjectId, we need to get the blockchain ID from the database
    if (mongoose.Types.ObjectId.isValid(electionId)) {
      const election = await Election.findById(electionId);
      if (!election) {
        return res.status(404).json({ message: 'Election not found in database' });
      }
      
      if (!election.blockchainElectionId) {
        return res.status(400).json({ 
          message: 'No blockchain ID available for this election',
          databaseElection: election
        });
      }
      
      blockchainElectionId = election.blockchainElectionId;
    }
    
    // Try to get the election from the blockchain
    const result = await getElectionFromBlockchain(blockchainElectionId);
    
    if (!result.success) {
      return res.status(500).json({
        message: 'Failed to fetch election details from blockchain',
        error: result.error
      });
    }
    
    // Also get candidates for this election
    let candidatesResult = { data: [] };
    try {
      // Get candidate IDs for this election
      const election = result.data;
      if (election.candidateIds && election.candidateIds.length > 0) {
        // Fetch details for each candidate
        const candidatesPromises = election.candidateIds.map(candidateId => 
          getCandidateFromBlockchain(candidateId)
        );
        
        const candidatesResponses = await Promise.all(candidatesPromises);
        const candidates = candidatesResponses
          .filter(response => response.success)
          .map(response => response.data);
        
        candidatesResult.data = candidates;
      }
    } catch (candidatesError) {
      console.error('Error fetching candidates from blockchain:', candidatesError);
      // Continue with the election data even if candidates fetch fails
    }
    
    // Get election status
    let statusResult = { data: { isActive: false } };
    try {
      statusResult = await getElectionStatusFromBlockchain(blockchainElectionId);
    } catch (statusError) {
      console.error('Error fetching election status from blockchain:', statusError);
      // Continue without status if it fails
    }
    
    // Return the combined data
    res.status(200).json({
      message: 'Election details fetched from blockchain successfully',
      election: result.data,
      candidates: candidatesResult.data,
      status: statusResult.success ? statusResult.data : { isActive: false },
      blockchainElectionId
    });
  } catch (error) {
    console.error('Error getting election details from blockchain:', error);
    res.status(500).json({
      message: 'Server error fetching election details from blockchain',
      error: error.message
    });
  }
};

// Get candidate details from blockchain
exports.getCandidateDetailsFromBlockchain = async (req, res) => {
  try {
    const { candidateId } = req.params;
    console.log(`Getting candidate details from blockchain for ID: ${candidateId}`);
    
    if (!candidateId) {
      return res.status(400).json({ message: 'Candidate ID is required' });
    }
    
    // Find the candidate in the database to get the blockchain ID
    let blockchainCandidateId = candidateId;
    
    // If it's a MongoDB ObjectId, we need to get the blockchain ID from the database
    if (mongoose.Types.ObjectId.isValid(candidateId)) {
      const candidate = await Candidate.findById(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found in database' });
      }
      
      if (!candidate.blockchainId) {
        return res.status(400).json({ 
          message: 'No blockchain ID available for this candidate',
          databaseCandidate: candidate
        });
      }
      
      blockchainCandidateId = candidate.blockchainId;
    }
    
    // Try to get the candidate from the blockchain
    const result = await getCandidateFromBlockchain(blockchainCandidateId);
    
    if (!result.success) {
      return res.status(500).json({
        message: 'Failed to fetch candidate details from blockchain',
        error: result.error
      });
    }
    
    // Return the blockchain data
    res.status(200).json({
      message: 'Candidate details fetched from blockchain successfully',
      candidate: result.data,
      blockchainCandidateId
    });
  } catch (error) {
    console.error('Error getting candidate details from blockchain:', error);
    res.status(500).json({
      message: 'Server error fetching candidate details from blockchain',
      error: error.message
    });
  }
};
 