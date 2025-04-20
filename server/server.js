const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const messageRoutes = require('./routes/messages');
const profileRoutes = require('./routes/profile');
const communityRoutes = require('./routes/community/communities');
const eventRoutes = require('./routes/community/events');
const activitiesRoutes = require('./routes/collaborate/activities');
const sessionsRoutes = require('./routes/collaborate/sessions');

// Initialize app
const app = express();
const server = http.createServer(app);

// Enhanced Socket.IO configuration with better error handling
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  // Use both transports, but try polling first for greater compatibility
  transports: ['polling', 'websocket'],
  // Increase ping timeout and interval for more reliable connections
  pingTimeout: 30000,
  pingInterval: 25000,
  // Adjust connection timeout to avoid early connection failures
  connectTimeout: 15000,
  // Allow more connection attempts
  maxHttpBufferSize: 1e6 // 1MB for larger payloads
});

// Make io accessible within request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Enhanced Middleware for CORS to support websockets better
app.use(express.json());
app.use(cors({
  origin: "*", // Allow all origins
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/collaborate/activities', activitiesRoutes);
app.use('/api/collaborate/sessions', sessionsRoutes);

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Socket.IO connection handler with enhanced error handling
io.on('connection', (socket) => {
  console.log('New client connected', socket.id);
  
  // Handle socket connection errors
  socket.on('error', (error) => {
    console.error('Socket error for client', socket.id, ':', error);
  });
  
  // Authenticate socket connection and join user's personal room
  socket.on('authenticate', async (token) => {
    try {
      if (!token) {
        console.log('No token provided for socket authentication');
        return;
      }
      
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      
      // Join user's personal room for direct messages
      socket.join(`user:${userId}`);
      console.log(`User ${userId} authenticated and joined personal room`);
      
      // Store user ID in socket data
      socket.data.userId = userId;
      
      // Send acknowledgment back to client
      socket.emit('authentication_success', { userId });
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      socket.emit('authentication_error', { message: 'Authentication failed' });
    }
  });
  
  // Handle joining a project room
  socket.on('join_project', (projectId) => {
    socket.join(`project:${projectId}`);
    console.log(`User joined project: ${projectId}`);
  });
  
  // Handle joining a community room
  socket.on('join_community', (communityId) => {
    socket.join(`community:${communityId}`);
    console.log(`User joined community room: ${communityId}`);
  });
  
  // Handle real-time collaboration messages
  socket.on('collaboration_update', (data) => {
    socket.to(`project:${data.projectId}`).emit('collaboration_update', data);
  });
  
  // Handle project chat messages
  socket.on('chat_message', (data) => {
    io.to(`project:${data.projectId}`).emit('chat_message', {
      ...data,
      timestamp: new Date()
    });
  });
  
  // Handle direct messages between users
  socket.on('direct_message', async (data) => {
    const { recipientId, text } = data;
    const senderId = socket.data.userId;
    
    if (!senderId) {
      console.log('User not authenticated for sending direct messages');
      return;
    }
    
    try {
      // Create a message in the database
      const Message = mongoose.model('Message');
      const newMessage = await Message.create({
        sender: senderId,
        recipient: recipientId,
        text
      });
      
      // Emit the message to both the sender and recipient
      io.to(`user:${recipientId}`).to(`user:${senderId}`).emit('direct_message', {
        _id: newMessage._id,
        sender: senderId,
        recipient: recipientId,
        text,
        createdAt: newMessage.createdAt,
        read: false
      });
      
      console.log(`Direct message sent from ${senderId} to ${recipientId}`);
    } catch (error) {
      console.error('Error sending direct message:', error.message);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });
  
  // Handle community chat messages
  socket.on('community_message', (data) => {
    io.to(`community:${data.communityId}`).emit('community_message', {
      ...data,
      timestamp: new Date()
    });
    console.log(`Community message sent to ${data.communityId}`);
  });

  // Handle event updates (RSVPs, changes, etc.)
  socket.on('event_update', (data) => {
    io.to(`community:${data.communityId}`).emit('event_update', {
      ...data,
      timestamp: new Date()
    });
    console.log(`Event update sent to community ${data.communityId}`);
  });
  
  // Handle message read status updates
  socket.on('mark_read', async (messageId) => {
    try {
      const Message = mongoose.model('Message');
      const message = await Message.findByIdAndUpdate(
        messageId, 
        { read: true },
        { new: true }
      );
      
      if (message) {
        io.to(`user:${message.sender}`).emit('message_read', { messageId });
      }
    } catch (error) {
      console.error('Error marking message as read:', error.message);
    }
  });

  // Handle joining a session room
  socket.on('join_session', (sessionId) => {
    socket.join(`session:${sessionId}`);
    console.log(`User joined live coding session: ${sessionId}`);
  });
  
  // Handle live coding updates
  socket.on('code_update', (data) => {
    // Broadcast to all users in the session except the sender
    socket.to(`session:${data.sessionId}`).emit('code_update', {
      codeSnippet: data.codeSnippet,
      updatedBy: socket.data.userId,
      timestamp: new Date()
    });
  });
  
  // Handle session chat messages
  socket.on('session_message', (data) => {
    const { sessionId, message } = data;
    const userId = socket.data.userId;
    
    if (!userId) {
      console.log('User not authenticated for sending session messages');
      return;
    }
    
    io.to(`session:${sessionId}`).emit('session_message', {
      userId,
      message,
      timestamp: new Date()
    });
  });

  // Handle disconnection with reason
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected', socket.id, 'reason:', reason);
  });
});

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start server - listen on all network interfaces (0.0.0.0) instead of just localhost
    const PORT = process.env.PORT || 50002;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} and listening on all interfaces`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });