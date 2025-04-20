const Project = require('../models/Project');
const User = require('../models/User');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate({
        path: 'creator',
        select: 'name avatar'
      })
      .populate({
        path: 'collaborators',
        select: 'name avatar'
      });
    
    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate({
        path: 'creator',
        select: 'name avatar'
      })
      .populate({
        path: 'collaborators',
        select: 'name avatar'
      });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res) => {
  try {
    // Add user to req.body
    req.body.creator = req.user.id;
    
    // Create project
    const project = await Project.create(req.body);
    
    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Make sure user is project creator
    if (project.creator.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this project'
      });
    }
    
    // Update project
    project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Join a project as collaborator
// @route   POST /api/projects/:id/join
// @access  Private
exports.joinProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check if user is already a collaborator
    if (project.collaborators.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a collaborator on this project'
      });
    }
    
    // Add user to collaborators
    project.collaborators.push(req.user.id);
    await project.save();
    
    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Leave a project
// @route   DELETE /api/projects/:id/leave
// @access  Private
exports.leaveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check if user is a collaborator
    if (!project.collaborators.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a collaborator on this project'
      });
    }
    
    // Remove user from collaborators
    project.collaborators = project.collaborators.filter(
      collab => collab.toString() !== req.user.id
    );
    
    await project.save();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};