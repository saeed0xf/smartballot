const express = require('express');
const router = express.Router();
const electionController = require('../controllers/election.controller');
const { verifyToken, isVoter, isAdmin } = require('../middleware/auth.middleware');

// Public routes for listing and viewing elections
router.get('/elections', electionController.getAllElections);
router.get('/election', electionController.getAllElections); // Alias for /elections
router.get('/election/:id', electionController.getElectionById);

// Protected routes for admin (creating, updating, deleting elections)
router.post('/election', verifyToken, isAdmin, electionController.createElection);
router.post('/elections', verifyToken, isAdmin, electionController.createElection); // Alias
router.put('/election/:id', verifyToken, isAdmin, electionController.updateElection);
router.delete('/election/:id', verifyToken, isAdmin, electionController.deleteElection);

// Election actions
router.post('/election/start', verifyToken, isAdmin, electionController.startElection);
router.post('/elections/start', verifyToken, isAdmin, electionController.startElection); // Alias
router.post('/election/end', verifyToken, isAdmin, electionController.endElection);
router.post('/elections/end', verifyToken, isAdmin, electionController.endElection); // Alias

// Get active elections
router.get('/elections/active', electionController.getActiveElections);

// Get active elections from remote database
router.get('/elections/remote/active', electionController.getActiveElectionsRemote);

// Election status - multiple paths for compatibility
router.get('/status', electionController.getElectionStatus);
router.get('/election/status', electionController.getElectionStatus);
router.get('/election/status/:electionId', electionController.getElectionStatus);

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