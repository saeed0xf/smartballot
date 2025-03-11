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

// Get election monitoring data (protected route)
router.get('/monitor', verifyToken, isOfficer, officerController.getMonitoringData);

module.exports = router; 