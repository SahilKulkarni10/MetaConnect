const User = require('../models/User');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    console.log('Registration attempt:', { name: req.body.name, email: req.body.email });
    const { name, email, password, skills } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Registration failed: Email already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      skills: skills || []
    });

    console.log('User registered successfully:', { userId: user._id, email: user.email });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    console.log('Login attempt:', { email: req.body.email });
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      console.log('Login failed: Missing credentials');
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('Login failed: User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log('Login failed: Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('User logged in successfully:', { userId: user._id, email: user.email });
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    console.log('Get current user:', { userId: user._id });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to create and send token
const sendTokenResponse = (user, statusCode, res) => {
  try {
    // Create token
    const token = user.getSignedToken();

    // Create response without password
    const userData = user.toObject();
    delete userData.password;

    console.log('Token generated for user:', { userId: user._id });

    res.status(statusCode).json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating authentication token'
    });
  }
};