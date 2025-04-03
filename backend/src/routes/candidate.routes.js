const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidate.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Get all candidates
router.get('/', verifyToken, isAdmin, candidateController.getAllCandidates);

// Create a new candidate
router.post('/', verifyToken, isAdmin, candidateController.createCandidate);

// Get candidates by election
router.get('/election/:electionId', verifyToken, candidateController.getCandidatesByElection);

// Update candidate status when elections start or end
router.post('/update-status', verifyToken, isAdmin, candidateController.updateCandidateStatus);

// Export the router
module.exports = router; 