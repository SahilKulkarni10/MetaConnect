const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { protect } = require('../../middleware/auth');
const communitiesController = require('../../controllers/community/communities');

// @route   GET /api/communities
// @desc    Get all communities
// @access  Public
router.get('/', communitiesController.getCommunities);

// @route   GET /api/communities/user/:userId
// @desc    Get communities by user
// @access  Public
router.get('/user/:userId', communitiesController.getUserCommunities);

// @route   GET /api/communities/:id
// @desc    Get community by ID
// @access  Public
router.get('/:id', communitiesController.getCommunityById);

// @route   POST /api/communities
// @desc    Create a new community
// @access  Private
router.post('/', [
  protect, 
  [
    check('name', 'Name is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty()
  ]
], communitiesController.createCommunity);

// @route   PUT /api/communities/:id
// @desc    Update a community
// @access  Private (owner only)
router.put('/:id', [
  protect,
  [
    check('name', 'Name is required if provided').optional(),
    check('description', 'Description is required if provided').optional()
  ]
], communitiesController.updateCommunity);

// @route   DELETE /api/communities/:id
// @desc    Delete a community
// @access  Private (owner only)
router.delete('/:id', protect, communitiesController.deleteCommunity);

// @route   PUT /api/communities/:id/join
// @desc    Join a community
// @access  Private
router.put('/:id/join', protect, communitiesController.joinCommunity);

// @route   PUT /api/communities/:id/leave
// @desc    Leave a community
// @access  Private
router.put('/:id/leave', protect, communitiesController.leaveCommunity);

module.exports = router;