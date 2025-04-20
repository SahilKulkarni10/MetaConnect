const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { protect } = require('../../middleware/auth');
const sessionsController = require('../../controllers/collaborate/sessions');

// @route   GET /api/collaborate/sessions
// @desc    Get all live sessions with filters
// @access  Private
router.get('/', protect, sessionsController.getAllSessions);

// @route   GET /api/collaborate/sessions/live
// @desc    Get active live sessions
// @access  Private
router.get('/live', protect, sessionsController.getLiveSessions);

// @route   GET /api/collaborate/sessions/:sessionId
// @desc    Get a single session by ID
// @access  Private
router.get('/:sessionId', protect, sessionsController.getSessionById);

// @route   POST /api/collaborate/sessions
// @desc    Create a new live coding session
// @access  Private
router.post('/', 
  protect,
  [
    check('title', 'Title is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    check('language', 'Language is required').optional()
  ],
  sessionsController.createSession
);

// @route   PUT /api/collaborate/sessions/:sessionId/join
// @desc    Join a live session
// @access  Private
router.put('/:sessionId/join', protect, sessionsController.joinSession);

// @route   PUT /api/collaborate/sessions/:sessionId/leave
// @desc    Leave a live session
// @access  Private
router.put('/:sessionId/leave', protect, sessionsController.leaveSession);

// @route   PUT /api/collaborate/sessions/:sessionId/status
// @desc    Update session status (host only)
// @access  Private
router.put('/:sessionId/status',
  protect,
  [
    check('status', 'Status must be scheduled, live, or ended').isIn(['scheduled', 'live', 'ended'])
  ],
  sessionsController.updateSessionStatus
);

// @route   PUT /api/collaborate/sessions/:sessionId/code
// @desc    Update the code snippet for a session
// @access  Private
router.put('/:sessionId/code',
  protect,
  [
    check('codeSnippet', 'Code snippet is required').not().isEmpty()
  ],
  sessionsController.updateCodeSnippet
);

module.exports = router;