const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  console.log('Auth middleware - Headers:', req.headers);
  
  try {
    let token;

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(200).json({});
    }

    // Set CORS headers for all requests
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Check token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token found in Authorization header');
    }
    // Also check query string for token (useful for WebSocket connections)
    else if (req.query && req.query.token) {
      token = req.query.token;
      console.log('Token found in query string');
    }

    // Check if token exists
    if (!token) {
      console.log('No token found in request');
      return res.status(401).json({
        success: false,
        message: 'Please login to access this resource'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified successfully for user:', decoded.id);

      // Find user by id
      const user = await User.findById(decoded.id);
      if (!user) {
        console.log('No user found with decoded ID:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'User no longer exists'
        });
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Your login session has expired. Please login again.'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error in authentication'
    });
  }
};