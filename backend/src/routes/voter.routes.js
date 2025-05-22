const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voter.controller');
const { verifyToken, isVoter } = require('../middleware/auth.middleware');

// Register voter profile - using express-fileupload (no middleware needed)
router.post(
  '/register',
  (req, res, next) => {
    console.log('Processing voter registration request');
    console.log('Content-Type:', req.headers['content-type']);
    
    // If using express-fileupload, the file will be in req.files
    if (req.files && req.files.voterIdImage) {
      console.log('File detected in request:', req.files.voterIdImage.name);
    } else {
      console.log('No file detected in req.files');
    }
    
    next();
  },
  voterController.registerVoter
);

// Get voter profile (protected route)
router.get('/profile', verifyToken, isVoter, voterController.getVoterProfile);

// Update voter profile (protected route)
router.put(
  '/profile',
  verifyToken,
  isVoter,
  voterController.updateVoterProfile
);

// Cast vote route (protected route)
router.post('/cast-vote', verifyToken, isVoter, voterController.castVote);

// Record vote on blockchain route (protected route)
router.post('/record-vote-blockchain', verifyToken, isVoter, voterController.recordVoteOnBlockchain);

// Check if voter has already voted in the remote database (protected route)
router.get('/check-remote-vote', verifyToken, isVoter, voterController.checkRemoteVote);

// Upload vote recording (protected route)
router.post('/upload-recording', verifyToken, isVoter, voterController.uploadRecording);

// Update vote record with recording URL (protected route)
router.post('/update-vote-recording', verifyToken, isVoter, voterController.updateVoteRecording);

module.exports = router; 