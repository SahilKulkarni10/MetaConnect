const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const os = require('os');

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

// Enhanced CORS configuration
const corsOptions = {
  origin: '*', // In production, you should list your specific domains
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400 // Preflight results cache for 24 hours
};

app.use(cors(corsOptions));

// Enhanced Socket.IO configuration with better error handling
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 30000,
  maxHttpBufferSize: 1e6,
  allowEIO3: true // Enable compatibility with Socket.IO v3 clients
});

// Make io accessible within request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Body parser middleware with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Add a detailed health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    hostname: os.hostname(),
    memory: process.memoryUsage(),
    cpu: os.cpus()[0],
    network: os.networkInterfaces()
  };

  res.status(200).json(healthData);
});

// Routes with version prefix
const API_PREFIX = '/api';
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/projects`, projectRoutes);
app.use(`${API_PREFIX}/messages`, messageRoutes);
app.use(`${API_PREFIX}/profile`, profileRoutes);
app.use(`${API_PREFIX}/communities`, communityRoutes);
app.use(`${API_PREFIX}/events`, eventRoutes);
app.use(`${API_PREFIX}/collaborate/activities`, activitiesRoutes);
app.use(`${API_PREFIX}/collaborate/sessions`, sessionsRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  // Handle different types of errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Socket.IO connection handler with enhanced error handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Handle socket connection errors
  socket.on('error', (error) => {
    console.error('Socket error for client', socket.id, ':', error);
  });
  
  // Authenticate socket connection and join user's personal room
  socket.on('authenticate', async (token) => {
    try {
      if (!token) {
        throw new Error('No token provided for socket authentication');
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
      console.error('Socket authentication error:', error);
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

// Connect to MongoDB with enhanced options
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
})
.then(() => {
  console.log('Connected to MongoDB');
  const PORT = process.env.PORT || 50002;
  
  // Listen on all interfaces
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} and listening on all interfaces`);
    const networkInterfaces = os.networkInterfaces();
    console.log('\nAvailable on:');
    
    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      for (const iface of interfaces) {
        if (iface.family === 'IPv4') {
          console.log(`- http://${iface.address}:${PORT}`);
        }
      }
    }
    
    console.log(`\nHealth check available at: http://${networkInterfaces.en0?.[0]?.address || '192.168.0.191'}:${PORT}/health`);
  });

  // Handle graceful shutdown
  const gracefulShutdown = () => {
    console.log('\nReceived shutdown signal. Closing server...');
    server.close(() => {
      console.log('Server closed. Disconnecting from MongoDB...');
      mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed. Exiting...');
        process.exit(0);
      });
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});