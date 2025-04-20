// filepath: /Volumes/test/sat/backend/controllers/profile.js
const User = require('../models/User');
const Project = require('../models/Project');
const Community = require('../models/Community');
const Event = require('../models/Event');

// @desc    Get current user's profile
// @route   GET /api/profile/me
// @access  Private
exports.getCurrentProfile = async (req, res) => {
  try {
    // Get user data without password field
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching profile:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update current user's profile
// @route   PUT /api/profile/me
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, location, skills, availability, avatar } = req.body;
    
    // Build profile object
    const profileFields = {};
    if (name) profileFields.name = name;
    if (bio) profileFields.bio = bio;
    if (location) profileFields.location = location;
    if (skills) {
      profileFields.skills = Array.isArray(skills) 
        ? skills 
        : skills.split(',').map(skill => skill.trim());
    }
    if (availability !== undefined) profileFields.availability = availability;
    if (avatar) profileFields.avatar = avatar;

    // Update user profile
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: profileFields },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error updating profile:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's dashboard data (profile, projects, communities, events)
// @route   GET /api/profile/dashboard
// @access  Private
exports.getDashboard = async (req, res) => {
  try {
    // Get user data
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's projects
    const projects = await Project.find({ members: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(5);

    // Get user's communities
    const communities = await Community.find({ members: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(5);

    // Get user's upcoming events
    const today = new Date();
    const events = await Event.find({
      attendees: req.user.id,
      startDate: { $gte: today }
    })
      .sort({ startDate: 1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        user,
        projects,
        communities,
        events
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user stats (project count, community count, etc.)
// @route   GET /api/profile/stats
// @access  Private
exports.getUserStats = async (req, res) => {
  try {
    const projectCount = await Project.countDocuments({ members: req.user.id });
    const communityCount = await Community.countDocuments({ members: req.user.id });
    const createdProjectsCount = await Project.countDocuments({ creator: req.user.id });
    const createdCommunitiesCount = await Community.countDocuments({ owner: req.user.id });
    
    // Get upcoming events count
    const today = new Date();
    const upcomingEventsCount = await Event.countDocuments({
      attendees: req.user.id,
      startDate: { $gte: today }
    });

    res.status(200).json({
      success: true,
      data: {
        projectCount,
        communityCount,
        createdProjectsCount,
        createdCommunitiesCount,
        upcomingEventsCount
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};