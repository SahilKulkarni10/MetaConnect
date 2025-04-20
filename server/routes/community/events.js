const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { protect } = require('../../middleware/auth');
const eventsController = require('../../controllers/community/events');

// @route   GET /api/events
// @desc    Get all events
// @access  Public
router.get('/', eventsController.getEvents);

// @route   GET /api/events/community/:communityId
// @desc    Get events by community
// @access  Public
router.get('/community/:communityId', eventsController.getCommunityEvents);

// @route   GET /api/events/user/:userId
// @desc    Get events by user
// @access  Public
router.get('/user/:userId', eventsController.getUserEvents);

// @route   GET /api/events/:id
// @desc    Get event by ID
// @access  Public
router.get('/:id', eventsController.getEventById);

// @route   POST /api/events
// @desc    Create a new event
// @access  Private
router.post('/', [
  protect,
  [
    check('title', 'Title is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    check('startDate', 'Start date is required').not().isEmpty(),
    check('endDate', 'End date is required').not().isEmpty(),
    check('location', 'Location is required').not().isEmpty(),
    check('community', 'Community is required').not().isEmpty()
  ]
], eventsController.createEvent);

// @route   PUT /api/events/:id
// @desc    Update an event
// @access  Private (creator only)
router.put('/:id', [
  protect,
  [
    check('title', 'Title is required if provided').optional(),
    check('description', 'Description is required if provided').optional(),
    check('startDate', 'Start date is required if provided').optional(),
    check('endDate', 'End date is required if provided').optional(),
    check('location', 'Location is required if provided').optional()
  ]
], eventsController.updateEvent);

// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Private (creator only)
router.delete('/:id', protect, eventsController.deleteEvent);

// @route   PUT /api/events/:id/rsvp
// @desc    RSVP to an event (attend/unattend)
// @access  Private
router.put('/:id/rsvp', protect, eventsController.rsvpEvent);

module.exports = router;