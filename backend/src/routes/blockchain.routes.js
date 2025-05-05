const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const fs = require('fs');
const path = require('path');

// @route   GET /api/blockchain/contract-abi
// @desc    Get the contract ABI
// @access  Private (Admin only)
router.get('/contract-abi', verifyToken, isAdmin, (req, res) => {
  try {
    // Path to deployment.json which contains the ABI
    const deploymentPath = path.join(__dirname, '../../../blockchain/deployment.json');
    
    if (!fs.existsSync(deploymentPath)) {
      return res.status(404).json({ message: 'Contract deployment information not found' });
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    if (!deploymentInfo.abi) {
      return res.status(404).json({ message: 'Contract ABI not found in deployment info' });
    }
    
    console.log('Returning contract ABI');
    res.json({ 
      abi: deploymentInfo.abi,
      address: deploymentInfo.address 
    });
  } catch (error) {
    console.error('Error fetching contract ABI:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 