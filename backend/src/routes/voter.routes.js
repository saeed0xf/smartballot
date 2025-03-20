const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voter.controller');
const { verifyToken, isVoter } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Register voter profile
router.post(
  '/register',
  upload.single('voterIdImage'),
  voterController.registerVoter
);

// Get voter profile (protected route)
router.get('/profile', verifyToken, isVoter, voterController.getVoterProfile);

// Update voter profile (protected route)
router.put(
  '/profile',
  verifyToken,
  isVoter,
  upload.single('voterIdImage'),
  voterController.updateVoterProfile
);

module.exports = router; 