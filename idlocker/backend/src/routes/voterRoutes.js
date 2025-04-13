const express = require('express');
const { 
  getAllVoters, 
  getVoterById, 
  createVoter, 
  updateVoter, 
  deleteVoter,
  getVoterByVoterId
} = require('../controllers/voterController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// All routes are protected by auth middleware except the public API endpoint

// Public API endpoint for integration with other applications
// @route   GET /api/voters/id/:voterId
// @desc    Get voter by Voter ID (Public API)
// @access  Public
router.get('/id/:voterId', getVoterByVoterId);

// @route   GET /api/voters
// @desc    Get all voters
// @access  Private
router.get('/', authMiddleware, getAllVoters);

// @route   GET /api/voters/:id
// @desc    Get voter by ID
// @access  Private
router.get('/:id', authMiddleware, getVoterById);

// @route   POST /api/voters
// @desc    Create a new voter
// @access  Private
router.post('/', authMiddleware, upload.single('photo'), createVoter);

// @route   PUT /api/voters/:id
// @desc    Update a voter
// @access  Private
router.put('/:id', authMiddleware, upload.single('photo'), updateVoter);

// @route   DELETE /api/voters/:id
// @desc    Delete a voter
// @access  Private
router.delete('/:id', authMiddleware, deleteVoter);

module.exports = router; 