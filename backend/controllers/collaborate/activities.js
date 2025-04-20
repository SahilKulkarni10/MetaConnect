// filepath: /Volumes/test/sat/backend/controllers/collaborate/activities.js
const ProjectActivity = require('../../models/ProjectActivity');
const Project = require('../../models/Project');
const { validationResult } = require('express-validator');

/**
 * Create a new project activity
 */
exports.createActivity = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, actionType, details, metadata } = req.body;

    // Verify the project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Create the activity record
    const activity = new ProjectActivity({
      project: projectId,
      user: req.user.id,
      actionType,
      details,
      metadata: metadata || {}
    });

    await activity.save();

    // Populate the user and project details
    await activity.populate('user', 'name avatar');
    await activity.populate('project', 'title');

    // Emit a socket event for the new activity
    if (req.io) {
      req.io.to(`project_${projectId}`).emit('project_activity', activity);
    }

    res.status(201).json(activity);
  } catch (err) {
    console.error('Error creating project activity:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get activities for a specific project
 */
exports.getProjectActivities = async (req, res) => {
  try {
    const { projectId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Verify the project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get the activities for this project
    const activities = await ProjectActivity.find({ project: projectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar')
      .populate('project', 'title');

    const total = await ProjectActivity.countDocuments({ project: projectId });

    res.json({
      data: activities,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error getting project activities:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get activities for all projects (filtered by user or project access)
 */
exports.getAllActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Find all projects the user is part of (as creator or collaborator)
    const userProjects = await Project.find({
      $or: [
        { creator: userId },
        { collaborators: userId }
      ]
    }).select('_id');

    const projectIds = userProjects.map(p => p._id);

    // Get activities for these projects
    const activities = await ProjectActivity.find({
      project: { $in: projectIds }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar')
      .populate('project', 'title');

    const total = await ProjectActivity.countDocuments({
      project: { $in: projectIds }
    });

    res.json({
      data: activities,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error getting all activities:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get activities by a specific user
 */
exports.getUserActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Find all projects the user is part of to check access rights
    const userProjects = await Project.find({
      $or: [
        { creator: req.user.id },
        { collaborators: req.user.id }
      ]
    }).select('_id');
    
    const projectIds = userProjects.map(p => p._id);

    // Get activities by the specified user, but only for projects the requesting user has access to
    const activities = await ProjectActivity.find({
      user: userId,
      project: { $in: projectIds }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar')
      .populate('project', 'title');

    const total = await ProjectActivity.countDocuments({
      user: userId,
      project: { $in: projectIds }
    });

    res.json({
      data: activities,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error getting user activities:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a project activity
 * Only the activity creator or project creator can delete
 */
exports.deleteActivity = async (req, res) => {
  try {
    const { activityId } = req.params;
    
    const activity = await ProjectActivity.findById(activityId);
    
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    
    // Check if user is activity creator or project creator
    const project = await Project.findById(activity.project);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (activity.user.toString() !== req.user.id && 
        project.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this activity' });
    }
    
    await activity.remove();
    
    res.json({ message: 'Activity deleted' });
  } catch (err) {
    console.error('Error deleting activity:', err);
    res.status(500).json({ message: 'Server error' });
  }
};