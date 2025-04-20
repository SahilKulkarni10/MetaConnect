const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Get conversations for a user
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    // Find all unique conversations for the current user
    const userId = req.user._id;
    
    // Convert userId to ObjectId properly
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Aggregate to get the latest message from each conversation
    const conversations = await Message.aggregate([
      // Find messages where the current user is either sender or recipient
      {
        $match: {
          $or: [
            { sender: userObjectId },
            { recipient: userObjectId }
          ]
        }
      },
      // Sort by newest messages first
      { $sort: { createdAt: -1 } },
      // Group by conversation (the other user in the conversation)
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", userObjectId] },
              "$recipient",
              "$sender"
            ]
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$recipient", userObjectId] },
                  { $eq: ["$read", false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      // Look up the user details for the other person in the conversation
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      // Unwind the user array to get a single user object
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      // Project only the fields we need
      {
        $project: {
          _id: 1,
          user: {
            _id: 1,
            name: 1,
            avatar: 1
          },
          lastMessage: {
            _id: 1,
            text: 1,
            createdAt: 1
          },
          unreadCount: 1
        }
      },
      // Sort by the last message time
      { $sort: { "lastMessage.createdAt": -1 } }
    ]);

    console.log(`Found ${conversations.length} conversations for user ${userId}`);
    
    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (error) {
    console.error('Error in getConversations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get messages between two users
// @route   GET /api/messages/:userId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;
    
    // Convert IDs to ObjectId
    const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);
    const otherUserObjectId = new mongoose.Types.ObjectId(otherUserId);
    
    // Validate that the other user exists
    const otherUser = await User.findById(otherUserObjectId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log(`Fetching messages between users ${currentUserId} and ${otherUserId}`);
    
    // Find messages between the current user and the other user
    const messages = await Message.find({
      $or: [
        { sender: currentUserObjectId, recipient: otherUserObjectId },
        { sender: otherUserObjectId, recipient: currentUserObjectId }
      ]
    }).sort({ createdAt: 1 });
    
    console.log(`Found ${messages.length} messages between users`);
    
    // Mark unread messages as read
    const updateResult = await Message.updateMany(
      { 
        sender: otherUserObjectId, 
        recipient: currentUserObjectId,
        read: false
      },
      { read: true }
    );
    
    console.log(`Marked ${updateResult.modifiedCount} messages as read`);
    
    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error('Error in getMessages:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send a message to another user
// @route   POST /api/messages/:userId
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const sender = req.user._id;
    const recipient = req.params.userId;
    
    // Convert IDs to ObjectId
    const senderObjectId = new mongoose.Types.ObjectId(sender);
    const recipientObjectId = new mongoose.Types.ObjectId(recipient);
    
    // Prevent users from messaging themselves
    if (senderObjectId.toString() === recipientObjectId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send messages to yourself'
      });
    }
    
    console.log(`Sending message from user ${sender} to user ${recipient}`);
    
    // Validate that the recipient exists
    const recipientUser = await User.findById(recipientObjectId);
    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }
    
    // Check for duplicate message (same sender, recipient, and text within the last few seconds)
    const recentMessageExists = await Message.findOne({
      sender: senderObjectId,
      recipient: recipientObjectId,
      text,
      createdAt: { $gt: new Date(Date.now() - 5000) } // Within the last 5 seconds
    });
    
    if (recentMessageExists) {
      console.log('Duplicate message detected and prevented');
      
      // Return the existing message instead of creating a duplicate
      const existingMessage = await Message.findById(recentMessageExists._id)
        .populate('sender', 'name avatar')
        .populate('recipient', 'name avatar');
        
      return res.status(200).json({
        success: true,
        data: existingMessage,
        duplicate: true
      });
    }
    
    // Create new message
    const message = await Message.create({
      sender: senderObjectId,
      recipient: recipientObjectId,
      text
    });
    
    console.log(`Message created with ID: ${message._id}`);
    
    // Populate sender details for the response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar')
      .populate('recipient', 'name avatar');
    
    // Emit a socket event for real-time messaging
    // This will be handled by Socket.IO
    if (req.io) {
      req.io.to(`user:${recipient}`).emit('new_message', populatedMessage);
    }
    
    res.status(201).json({
      success: true,
      data: populatedMessage
    });
    
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};