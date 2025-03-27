const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const electionController = require('../controllers/election.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Apply verifyToken and isAdmin middleware to all routes
router.use(verifyToken, isAdmin);

// Admin dashboard
router.get('/dashboard', adminController.getDashboardData || ((req, res) => {
  res.status(200).json({ message: 'Dashboard data endpoint placeholder', data: [] });
}));

// Candidate management
router.get('/candidates', adminController.getAllCandidates);
router.post('/candidates', adminController.addCandidate);
router.get('/candidates/:id', adminController.getCandidateById);
router.put('/candidates/:id', adminController.updateCandidate);
router.delete('/candidates/:id', adminController.deleteCandidate);

// Election management
router.get('/elections', electionController.getAllElections);
router.post('/election', electionController.createElection);
router.get('/election/:id', electionController.getElectionById);
router.put('/election/:id', electionController.updateElection);
router.delete('/election/:id', electionController.deleteElection);
router.post('/election/start', electionController.startElection);
router.post('/election/end', electionController.endElection);

// Voter management
router.get('/voters', adminController.getAllVoters || ((req, res) => {
  res.status(200).json({ message: 'Get voters placeholder', data: [] });
}));
router.put('/voters/:id/approve', adminController.approveVoter || ((req, res) => {
  res.status(200).json({ message: 'Approve voter placeholder', id: req.params.id });
}));
router.put('/voters/:id/reject', adminController.rejectVoter || ((req, res) => {
  res.status(200).json({ message: 'Reject voter placeholder', id: req.params.id });
}));

// Results
router.get('/results/:electionId', adminController.getResults || ((req, res) => {
  res.status(200).json({ message: 'Election results placeholder', electionId: req.params.electionId, results: [] });
}));

// Add candidate to blockchain (protected route)
router.post('/candidates/:candidateId/blockchain', adminController.addCandidateToBlockchain || ((req, res) => {
  res.status(200).json({ message: 'Add candidate to blockchain placeholder', candidateId: req.params.candidateId });
}));

// Archive election (protected route)
router.put('/elections/:electionId/archive', adminController.archiveElection || ((req, res) => {
  res.status(200).json({ message: 'Archive election placeholder', electionId: req.params.electionId });
}));

// Get archived elections (protected route)
router.get('/elections/archived', adminController.getArchivedElections || ((req, res) => {
  res.status(200).json({ message: 'Archived elections placeholder', data: [] });
}));

// Get election status (protected route)
router.get('/election/status', adminController.getElectionStatus || electionController.getElectionStatus || ((req, res) => {
  res.status(200).json({ message: 'Election status placeholder', active: false });
}));

module.exports = router; 