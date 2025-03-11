const User = require('../models/user.model');
const Voter = require('../models/voter.model');
const { registerVoterOnBlockchain } = require('../utils/blockchain.util');

// Register voter profile
exports.registerVoter = async (req, res) => {
  try {
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
      // Create new user
      const newUser = new User({
        walletAddress,
        role: 'voter'
      });
      
      await newUser.save();
      userId = newUser._id;
    }
    
    // Get form data
    const {
      firstName,
      middleName,
      lastName,
      age,
      dateOfBirth,
      email,
      voterId
    } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !age || !dateOfBirth || !email || !voterId) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    
    // Check if voter ID is already registered
    const voterIdExists = await Voter.findOne({ voterId });
    if (voterIdExists) {
      return res.status(400).json({ message: 'Voter ID is already registered' });
    }
    
    // Create new voter profile
    const voter = new Voter({
      user: userId,
      firstName,
      middleName,
      lastName,
      age,
      dateOfBirth,
      email,
      voterId,
      profileImage: req.file ? `/uploads/${req.file.filename}` : null,
      status: 'pending'
    });
    
    await voter.save();
    
    // Register voter on blockchain
    const blockchainResult = await registerVoterOnBlockchain(walletAddress);
    
    if (blockchainResult.success) {
      // Update voter with blockchain transaction hash
      voter.blockchainRegistered = true;
      voter.blockchainTxHash = blockchainResult.txHash;
      await voter.save();
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
    res.status(500).json({ message: 'Server error' });
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
        age: voter.age,
        dateOfBirth: voter.dateOfBirth,
        email: voter.email,
        voterId: voter.voterId,
        profileImage: voter.profileImage,
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
      age,
      dateOfBirth,
      email,
      voterId
    } = req.body;
    
    // Update voter profile
    if (firstName) voter.firstName = firstName;
    if (middleName !== undefined) voter.middleName = middleName;
    if (lastName) voter.lastName = lastName;
    if (age) voter.age = age;
    if (dateOfBirth) voter.dateOfBirth = dateOfBirth;
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
      voter.profileImage = `/uploads/${req.file.filename}`;
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
        age: voter.age,
        dateOfBirth: voter.dateOfBirth,
        email: voter.email,
        voterId: voter.voterId,
        profileImage: voter.profileImage,
        status: voter.status
      }
    });
  } catch (error) {
    console.error('Update voter profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 