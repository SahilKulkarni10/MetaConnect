const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { protect } = require('../../middleware/auth');
const activitiesController = require('../../controllers/collaborate/activities');

// @route   GET /api/collaborate/activities
// @desc    Get all activities for user's projects
// @access  Private
router.get('/', protect, activitiesController.getAllActivities);

// @route   GET /api/collaborate/activities/project/:projectId
// @desc    Get activities for a specific project
// @access  Private
router.get('/project/:projectId', protect, activitiesController.getProjectActivities);

// @route   GET /api/collaborate/activities/user/:userId
// @desc    Get activities by a specific user
// @access  Private
router.get('/user/:userId', protect, activitiesController.getUserActivities);

// @route   POST /api/collaborate/activities
// @desc    Create a new project activity
// @access  Private
router.post('/', 
  protect,
  [
    check('projectId', 'Project ID is required').not().isEmpty(),
    check('actionType', 'Action type is required').isIn([
      'commit', 'comment', 'pull_request', 'merge', 'issue', 'join', 'update', 'other'
    ]),
    check('details', 'Activity details are required').not().isEmpty()
  ],
  activitiesController.createActivity
);

// @route   DELETE /api/collaborate/activities/:activityId
// @desc    Delete a project activity
// @access  Private
router.delete('/:activityId', protect, activitiesController.deleteActivity);

module.exports = router;