// filepath: /Volumes/test/sat/backend/routes/profile.js
const express = require('express');
const { 
  getCurrentProfile, 
  updateProfile, 
  getDashboard, 
  getUserStats 
} = require('../controllers/profile');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Get current user profile
router.get('/me', getCurrentProfile);

// Update current user profile
router.put('/me', updateProfile);

// Get user dashboard data
router.get('/dashboard', getDashboard);

// Get user stats
router.get('/stats', getUserStats);

module.exports = router;