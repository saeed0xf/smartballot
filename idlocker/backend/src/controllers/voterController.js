const Voter = require('../models/Voter');

// Get all voters
const getAllVoters = async (_req, res) => {
  try {
    const voters = await Voter.find().sort({ createdAt: -1 });
    res.json(voters);
  } catch (error) {
    console.error('Get all voters error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get voter by ID
const getVoterById = async (req, res) => {
  try {
    const voter = await Voter.findById(req.params.id);
    
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }
    
    res.json(voter);
  } catch (error) {
    console.error('Get voter by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get voter by Voter ID (for API integration)
const getVoterByVoterId = async (req, res) => {
  try {
    const voter = await Voter.findOne({ voterId: req.params.voterId });
    
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }
    
    res.json(voter);
  } catch (error) {
    console.error('Get voter by Voter ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new voter
const createVoter = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      fatherName,
      dateOfBirth,
      voterId,
      email,
      phoneNumber,
      gender,
      address,
      pollingStation,
      ward,
      constituency,
      notes
    } = req.body;

    // Check if photo was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a photo' });
    }

    // Check if voter ID already exists
    const voterWithId = await Voter.findOne({ voterId });
    if (voterWithId) {
      return res.status(400).json({ message: 'Voter ID already exists', field: 'voterId' });
    }

    // Check if phone number already exists
    const voterWithPhone = await Voter.findOne({ phoneNumber });
    if (voterWithPhone) {
      return res.status(400).json({ message: 'Phone number already exists', field: 'phoneNumber' });
    }

    // Create new voter
    const newVoter = new Voter({
      firstName,
      middleName,
      lastName,
      fatherName,
      dateOfBirth,
      age: 0, // This will be calculated by the pre-save hook
      voterId,
      email,
      phoneNumber,
      gender,
      photoUrl: `/uploads/${req.file.filename}`,
      address,
      pollingStation,
      ward,
      constituency,
      notes
    });

    const savedVoter = await newVoter.save();
    res.status(201).json(savedVoter);
  } catch (error) {
    console.error('Create voter error:', error);
    
    // Check for MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'voterId' ? 'Voter ID' : 'Phone number';
      return res.status(400).json({ 
        message: `${fieldName} already exists`,
        field
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// Update voter
const updateVoter = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      fatherName,
      dateOfBirth,
      voterId,
      email,
      phoneNumber,
      gender,
      address,
      pollingStation,
      ward,
      constituency,
      notes
    } = req.body;

    // Find voter by ID
    let voter = await Voter.findById(req.params.id);
    
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    // Check if voter ID already exists (only if it's changed)
    if (voterId !== voter.voterId) {
      const voterWithId = await Voter.findOne({ voterId });
      if (voterWithId) {
        return res.status(400).json({ message: 'Voter ID already exists', field: 'voterId' });
      }
    }

    // Check if phone number already exists (only if it's changed)
    if (phoneNumber !== voter.phoneNumber) {
      const voterWithPhone = await Voter.findOne({ phoneNumber });
      if (voterWithPhone) {
        return res.status(400).json({ message: 'Phone number already exists', field: 'phoneNumber' });
      }
    }

    // Prepare update object
    const updateData = {
      firstName,
      middleName,
      lastName,
      fatherName,
      dateOfBirth,
      voterId,
      email,
      phoneNumber,
      gender,
      address,
      pollingStation,
      ward,
      constituency,
      notes
    };

    // If new photo is uploaded
    if (req.file) {
      updateData.photoUrl = `/uploads/${req.file.filename}`;
    }

    // Update voter with new data
    voter = await Voter.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json(voter);
  } catch (error) {
    console.error('Update voter error:', error);
    
    // Check for MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'voterId' ? 'Voter ID' : 'Phone number';
      return res.status(400).json({ 
        message: `${fieldName} already exists`,
        field
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete voter
const deleteVoter = async (req, res) => {
  try {
    const voter = await Voter.findById(req.params.id);
    
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    await Voter.deleteOne({ _id: req.params.id });
    
    res.json({ message: 'Voter deleted successfully' });
  } catch (error) {
    console.error('Delete voter error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllVoters,
  getVoterById,
  getVoterByVoterId,
  createVoter,
  updateVoter,
  deleteVoter
}; 