const express = require('express');
const router = express.Router();
const electionController = require('../controllers/election.controller');
const { verifyToken, isVoter } = require('../middleware/auth.middleware');

// Get election status (public route)
router.get('/status', electionController.getElectionStatus);

// Get all candidates (public route)
router.get('/candidates', electionController.getAllCandidates);

// Get candidate details (public route)
router.get('/candidates/:candidateId', electionController.getCandidateDetails);

// Cast vote (protected route)
router.post('/vote', verifyToken, isVoter, electionController.castVote);

// Verify vote (protected route)
router.get('/verify', verifyToken, isVoter, electionController.verifyVote);

// Get election results (public route)
router.get('/results', electionController.getElectionResults);

module.exports = router; 