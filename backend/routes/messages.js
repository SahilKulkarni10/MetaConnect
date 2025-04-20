const express = require('express');
const { 
  getConversations, 
  getMessages, 
  sendMessage 
} = require('../controllers/messages');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Get all conversations for the current user
router.get('/conversations', getConversations);

// Get and send messages between current user and another user
router.route('/:userId')
  .get(getMessages)
  .post(sendMessage);

module.exports = router;