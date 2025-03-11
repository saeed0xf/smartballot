const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ message: 'User account is inactive' });
    }
    
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required' });
  }
  next();
};

// Middleware to check if user is voter
const isVoter = (req, res, next) => {
  if (req.user.role !== 'voter') {
    return res.status(403).json({ message: 'Access denied. Voter role required' });
  }
  next();
};

// Middleware to check if user is election officer
const isOfficer = (req, res, next) => {
  if (req.user.role !== 'officer') {
    return res.status(403).json({ message: 'Access denied. Election Officer role required' });
  }
  next();
};

module.exports = {
  verifyToken,
  isAdmin,
  isVoter,
  isOfficer
}; 