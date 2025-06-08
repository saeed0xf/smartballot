const express = require('express');
const router = express.Router();
const officerController = require('../controllers/officer.controller');
const { verifyToken, isOfficer } = require('../middleware/auth.middleware');

// Get all slots (protected route)
router.get('/slots', verifyToken, isOfficer, officerController.getAllSlots);

// Get slot details (protected route)
router.get('/slots/:slotId', verifyToken, isOfficer, officerController.getSlotDetails);

// Add slot (protected route)
router.post('/slots', verifyToken, isOfficer, officerController.addSlot);

// Update slot (protected route)
router.put('/slots/:slotId', verifyToken, isOfficer, officerController.updateSlot);

// Delete slot (protected route)
router.delete('/slots/:slotId', verifyToken, isOfficer, officerController.deleteSlot);

// Get voter statistics (protected route)
router.get('/voters/stats', verifyToken, isOfficer, officerController.getVoterStats);

// Get all elections from blockchain (protected route)
router.get('/elections/all', verifyToken, isOfficer, officerController.getAllElections);

// Get election results from blockchain (protected route)
router.get('/elections/:electionId/results', verifyToken, isOfficer, officerController.getElectionResults);

// Get remote election stats (protected route)
router.get('/elections/remote/stats', verifyToken, isOfficer, officerController.getRemoteElectionStats);

// Get remote votes count (protected route)
router.get('/elections/remote/votes/count', verifyToken, isOfficer, officerController.getRemoteVotesCount);

// Get recent elections from blockchain (protected route)
router.get('/elections/remote/recent', verifyToken, isOfficer, officerController.getRecentElections);

// Get election monitoring data (protected route)
router.get('/monitor', verifyToken, isOfficer, officerController.getMonitoringData);

module.exports = router; 