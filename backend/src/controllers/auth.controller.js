const jwt = require('jsonwebtoken');
const ethers = require('ethers');
const User = require('../models/user.model');
const Voter = require('../models/voter.model');
const { getVoterStatusFromBlockchain } = require('../utils/blockchain.util');

// Store nonces for each address
const nonces = {};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Validate role
    if (role && !['voter', 'admin', 'officer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    // Create new user
    const user = new User({
      email,
      password,
      role: role || 'voter'
    });
    
    await user.save();
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Generate a nonce for an address
exports.getNonce = async (req, res) => {
  try {
    const { address } = req.query;
    
    console.log('Nonce requested for address:', address);
    
    if (!address) {
      console.log('No address provided for nonce');
      return res.status(400).json({ message: 'Address is required' });
    }
    
    // Generate a random nonce
    const nonce = Math.floor(Math.random() * 1000000).toString();
    nonces[address.toLowerCase()] = nonce;
    
    console.log('Generated nonce for address:', address, 'Nonce:', nonce);
    
    res.json({ nonce });
  } catch (error) {
    console.error('Get nonce error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user with MetaMask
exports.login = async (req, res) => {
  try {
    const { address, signature } = req.body;
    
    console.log('Login attempt with address:', address);
    console.log('Transaction hash provided:', signature ? signature : 'No');
    
    if (!address || !signature) {
      console.log('Missing address or transaction hash');
      return res.status(400).json({ message: 'Address and transaction hash are required' });
    }
    
    // Get the nonce for this address
    const nonce = nonces[address.toLowerCase()];
    if (!nonce) {
      console.log('No nonce found for address:', address);
      return res.status(400).json({ message: 'Invalid nonce. Please request a new one.' });
    }
    
    console.log('Found nonce for address:', address, 'Nonce:', nonce);
    
    // For transaction-based authentication, we'll skip the signature verification
    // In a production environment, you would verify the transaction on the blockchain
    // to ensure it was actually sent by the user
    console.log('Transaction hash received:', signature);
    console.log('Skipping transaction verification for development');
    
    // Check if this is the admin address
    const adminAddress = process.env.ADMIN_WALLET_ADDRESS;
    console.log('Admin address from env:', adminAddress);
    const isAdmin = address.toLowerCase() === adminAddress.toLowerCase();
    console.log('Is admin address:', isAdmin);
    
    // Check if this is an officer address (you can add officer addresses to env or database)
    const officerAddressesStr = process.env.OFFICER_WALLET_ADDRESSES || '';
    const officerAddresses = officerAddressesStr ? officerAddressesStr.split(',') : [];
    console.log('Officer addresses from env:', officerAddresses);
    const isOfficer = officerAddresses.some(addr => addr.toLowerCase() === address.toLowerCase());
    console.log('Is officer address:', isOfficer);
    
    // Determine the role
    let role = 'voter';
    if (isAdmin) {
      role = 'admin';
    } else if (isOfficer) {
      role = 'officer';
    }
    console.log('Determined role:', role);
    
    // Find or create user
    let user = await User.findOne({ walletAddress: address });
    
    if (!user) {
      console.log('User not found, creating new user with role:', role);
      // Create new user
      user = new User({
        walletAddress: address,
        role
      });
      await user.save();
      console.log('New user created:', user);
    } else {
      console.log('User found:', user);
      // Update role if needed
      if (user.role !== role) {
        console.log('Updating user role from', user.role, 'to', role);
        user.role = role;
        await user.save();
      }
    }
    
    // If user is a voter, check if they are approved
    if (role === 'voter') {
      console.log('Checking voter approval status');
      const voter = await Voter.findOne({ user: user._id });
      
      // If voter profile exists, check approval status
      if (voter) {
        console.log('Voter profile found:', voter);
        if (voter.status !== 'approved') {
          console.log('Voter not approved, status:', voter.status);
          return res.status(403).json({ 
            message: 'Your voter registration is pending approval',
            status: voter.status
          });
        }
        
        // If voter has a wallet address, check blockchain status
        if (user.walletAddress) {
          console.log('Checking blockchain status for voter');
          const blockchainStatus = await getVoterStatusFromBlockchain(user.walletAddress);
          console.log('Blockchain status:', blockchainStatus);
          
          if (blockchainStatus.success && !blockchainStatus.data.isApproved) {
            console.log('Voter not approved on blockchain');
            return res.status(403).json({ 
              message: 'Your voter registration is not approved on the blockchain',
              status: 'pending'
            });
          }
        }
      } else {
        console.log('No voter profile found for user');
      }
    }
    
    // Generate JWT token
    console.log('Generating JWT token for user:', user._id);
    const token = jwt.sign(
      { 
        id: user._id, 
        address: user.walletAddress,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Clear the nonce
    delete nonces[address.toLowerCase()];
    console.log('Nonce cleared for address:', address);
    
    console.log('Login successful, sending response');
    res.json({
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    console.log('Getting current user with ID:', req.user.id);
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('User found:', user);
    res.json({
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 