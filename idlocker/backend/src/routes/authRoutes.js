const express = require('express');
const { login, getCurrentUser, initAdmin } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Login user and get token
// @access  Public
router.post('/login', login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, getCurrentUser);

// @route   POST /api/auth/init-admin
// @desc    Initialize admin user (one-time use)
// @access  Public
router.post('/init-admin', initAdmin);

module.exports = router; 