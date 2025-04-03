const Candidate = require('../models/candidate.model');
const Election = require('../models/election.model');
const mongoose = require('mongoose');

// Create a new candidate
exports.createCandidate = async (req, res) => {
  try {
    console.log('Create candidate request received:', req.body);
    console.log('Files received:', req.files ? Object.keys(req.files) : 'No files');
    
    // Check if required fields are present
    const { 
      firstName, lastName, age, gender, partyName, 
      electionType, electionId, constituency 
    } = req.body;

    if (!firstName || !lastName || !age || !gender || !partyName || !constituency) {
      return res.status(400).json({
        message: 'Missing required fields',
        details: 'First name, last name, age, gender, party name, and constituency are required'
      });
    }

    // Validate election ID
    if (!electionId || !mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({
        message: 'Valid election ID is required',
        details: 'You must select a valid election before adding a candidate'
      });
    }

    // Check if the election exists
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({
        message: 'Election not found',
        details: 'The selected election does not exist'
      });
    }

    // Process uploaded files if any
    let photoUrl = null;
    let partySymbol = null;
    
    const fs = require('fs');
    const path = require('path');
    
    // Ensure upload directories exist
    const candidatesDir = path.join(__dirname, '../../uploads/candidates');
    const partiesDir = path.join(__dirname, '../../uploads/parties');
    
    if (!fs.existsSync(candidatesDir)) {
        fs.mkdirSync(candidatesDir, { recursive: true });
        console.log('Created candidates upload directory');
    }
    
    if (!fs.existsSync(partiesDir)) {
        fs.mkdirSync(partiesDir, { recursive: true });
        console.log('Created parties upload directory');
    }
    
    // Handle candidate photo upload (express-fileupload style)
    if (req.files && req.files.candidatePhoto) {
      const photo = req.files.candidatePhoto;
      // Generate unique filename
      const photoFileName = `candidate_${Date.now()}_${photo.name}`;
      // Full path for moving the file
      const photoFilePath = path.join(candidatesDir, photoFileName);
      
      try {
        // Move the file to the uploads directory
        await photo.mv(photoFilePath);
        console.log(`Candidate photo saved to: ${photoFilePath}`);
        // Set the photoUrl with correct path for web access
        photoUrl = `/uploads/candidates/${photoFileName}`;
      } catch (fileError) {
        console.error('Error saving candidate photo:', fileError);
        return res.status(500).json({
          message: 'Error uploading candidate photo',
          error: fileError.message
        });
      }
    }
    
    // Handle party symbol upload (express-fileupload style)
    if (req.files && req.files.partySymbol) {
      const symbol = req.files.partySymbol;
      // Generate unique filename
      const symbolFileName = `party_${Date.now()}_${symbol.name}`;
      // Full path for moving the file
      const symbolFilePath = path.join(partiesDir, symbolFileName);
      
      try {
        // Move the file to the uploads directory
        await symbol.mv(symbolFilePath);
        console.log(`Party symbol saved to: ${symbolFilePath}`);
        // Set the partySymbol with correct path for web access
        partySymbol = `/uploads/parties/${symbolFileName}`;
      } catch (fileError) {
        console.error('Error saving party symbol:', fileError);
        return res.status(500).json({
          message: 'Error uploading party symbol',
          error: fileError.message
        });
      }
    }
    
    // Create new candidate object
    const newCandidate = new Candidate({
      firstName,
      middleName: req.body.middleName,
      lastName,
      age: parseInt(age),
      gender,
      dateOfBirth: req.body.dateOfBirth,
      photoUrl,
      partyName,
      partySymbol,
      electionType: electionType || election.type, // Use election type if not provided
      constituency,
      manifesto: req.body.manifesto,
      education: req.body.education,
      experience: req.body.experience,
      criminalRecord: req.body.criminalRecord || 'None',
      email: req.body.email,
      election: electionId, // Associate with the election
      inActiveElection: election.isActive // Set based on election status
    });
    
    console.log('Attempting to save candidate to MongoDB:', {
      firstName, lastName, electionType, election: electionId
    });
    
    // Save to database
    const savedCandidate = await newCandidate.save();
    console.log('Candidate saved successfully:', savedCandidate._id);
    
    // Return success response
    res.status(201).json({
      message: 'Candidate created successfully',
      candidate: savedCandidate
    });
  } catch (error) {
    console.error('Error creating candidate:', error);
    res.status(500).json({ 
      message: 'Failed to create candidate', 
      error: error.message 
    });
  }
};

// Get all candidates with election details
exports.getAllCandidates = async (req, res) => {
  try {
    console.log('Fetching all candidates');
    
    // Get candidates and populate election details
    const candidates = await Candidate.find()
      .populate('election', 'title name type isActive')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${candidates.length} candidates`);
    
    res.status(200).json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ 
      message: 'Failed to fetch candidates', 
      error: error.message 
    });
  }
};

// Get candidates by election
exports.getCandidatesByElection = async (req, res) => {
  try {
    const { electionId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }
    
    // Find candidates for this election
    const candidates = await Candidate.find({ election: electionId })
      .sort({ firstName: 1 });
    
    console.log(`Found ${candidates.length} candidates for election ${electionId}`);
    
    res.status(200).json(candidates);
  } catch (error) {
    console.error('Error fetching candidates by election:', error);
    res.status(500).json({ 
      message: 'Failed to fetch candidates', 
      error: error.message 
    });
  }
};

// Update candidate status when elections start or end
exports.updateCandidateStatus = async (req, res) => {
  try {
    const { electionId, electionType, status, value } = req.body;
    
    if (!status || value === undefined) {
      return res.status(400).json({ message: 'Status field and value are required' });
    }
    
    // Create query based on either electionId or electionType
    const query = {};
    
    if (electionId && mongoose.Types.ObjectId.isValid(electionId)) {
      query.election = electionId;
    } else if (electionType) {
      query.electionType = electionType;
    } else {
      return res.status(400).json({ message: 'Either electionId or electionType is required' });
    }
    
    console.log(`Updating candidates with query: ${JSON.stringify(query)}, setting ${status} to ${value}`);
    
    // Update status field on all matching candidates
    const updateData = {};
    updateData[status] = value;
    
    const result = await Candidate.updateMany(query, updateData);
    
    return res.status(200).json({
      message: `Updated ${result.nModified} candidates`,
      matchedCount: result.matchedCount,
      modifiedCount: result.nModified
    });
  } catch (error) {
    console.error('Error updating candidate status:', error);
    return res.status(500).json({ 
      message: 'Error updating candidate status', 
      error: error.message 
    });
  }
}; 