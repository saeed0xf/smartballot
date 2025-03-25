const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Get all voters (protected route)
router.get('/voters', verifyToken, isAdmin, adminController.getAllVoters);

// Get voter details (protected route)
router.get('/voters/:voterId', verifyToken, isAdmin, adminController.getVoterDetails);

// Approve voter (protected route)
router.put('/voters/:voterId/approve', verifyToken, isAdmin, adminController.approveVoter);

// Complete voter approval after MetaMask transaction (protected route)
router.put('/voters/:voterId/approve-complete', verifyToken, isAdmin, adminController.approveVoterComplete);

// Reject voter (protected route)
router.put('/voters/:voterId/reject', verifyToken, isAdmin, adminController.rejectVoter);

// Add candidate (protected route)
const candidateUpload = upload.fields([
  { name: 'candidatePhoto', maxCount: 1 },
  { name: 'partySymbol', maxCount: 1 }
]);
router.post('/candidates', verifyToken, isAdmin, candidateUpload, adminController.addCandidate);

// Get all candidates (protected route)
router.get('/candidates', verifyToken, isAdmin, adminController.getAllCandidates);

// Get candidate by ID (protected route)
router.get('/candidates/:candidateId', verifyToken, isAdmin, adminController.getCandidateById);

// Update candidate (protected route)
router.put('/candidates/:candidateId', verifyToken, isAdmin, candidateUpload, adminController.updateCandidate);

// Delete candidate (protected route)
router.delete('/candidates/:candidateId', verifyToken, isAdmin, adminController.deleteCandidate);

// Add candidate to blockchain (protected route)
router.post('/candidates/:candidateId/blockchain', verifyToken, isAdmin, adminController.addCandidateToBlockchain);

// Archive election (protected route)
router.put('/elections/:electionId/archive', verifyToken, isAdmin, adminController.archiveElection);

// Get archived elections (protected route)
router.get('/elections/archived', verifyToken, isAdmin, adminController.getArchivedElections);

// Start election (protected route)
router.post('/election/start', verifyToken, isAdmin, adminController.startElection);

// End election (protected route)
router.put('/election/end', verifyToken, isAdmin, adminController.endElection);

// Get election status (protected route)
router.get('/election/status', verifyToken, isAdmin, adminController.getElectionStatus);

module.exports = router; 