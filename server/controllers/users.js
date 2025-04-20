const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res) => {
  try {
    // Make sure user is updating their own profile
    if (req.params.id !== req.user.id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }

    // Fields to update
    const fieldsToUpdate = {
      name: req.body.name,
      bio: req.body.bio,
      location: req.body.location,
      availability: req.body.availability,
      skills: req.body.skills,
      avatar: req.body.avatar
    };
    
    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );
    
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};