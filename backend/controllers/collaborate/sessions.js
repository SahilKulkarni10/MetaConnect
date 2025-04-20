// filepath: /Volumes/test/sat/backend/controllers/collaborate/sessions.js
const mongoose = require('mongoose');
const LiveSession = require('../../models/LiveSession');
const Project = require('../../models/Project');
const User = require('../../models/User');
const { validationResult } = require('express-validator');

// @desc    Get all live sessions
// @route   GET /api/collaborate/sessions
// @access  Private
exports.getAllSessions = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    
    // Filter by status if provided
    if (status && ['scheduled', 'live', 'ended'].includes(status)) {
      filter.status = status;
    }
    
    // Get sessions
    const sessions = await LiveSession.find(filter)
      .sort({ scheduledFor: 1, createdAt: -1 })
      .populate({
        path: 'host',
        select: 'name avatar'
      })
      .populate({
        path: 'participants',
        select: 'name avatar'
      })
      .populate({
        path: 'project',
        select: 'title'
      });
    
    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    console.error('Error fetching live sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get active live sessions
// @route   GET /api/collaborate/sessions/live
// @access  Private
exports.getLiveSessions = async (req, res) => {
  try {
    const { status, projectId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    } else {
      // By default, only show scheduled and live sessions
      query.status = { $in: ['scheduled', 'live'] };
    }
    
    // Filter by project if provided
    if (projectId) {
      query.project = projectId;
    }

    // Get sessions based on filters
    const sessions = await LiveSession.find(query)
      .sort({ 
        // Sort live first, then scheduled by date, then ended
        status: 1, 
        scheduledFor: 1, 
        createdAt: -1 
      })
      .skip(skip)
      .limit(limit)
      .populate('host', 'name avatar')
      .populate('project', 'title description')
      .populate('participants', 'name avatar');

    const total = await LiveSession.countDocuments(query);

    res.json({
      data: sessions,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error getting live sessions:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get session by ID
// @route   GET /api/collaborate/sessions/:id
// @access  Private
exports.getSessionById = async (req, res) => {
  try {
    const session = await LiveSession.findById(req.params.id)
      .populate({
        path: 'host',
        select: 'name avatar'
      })
      .populate({
        path: 'participants',
        select: 'name avatar'
      })
      .populate({
        path: 'project',
        select: 'title description'
      });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Live session not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new live session
// @route   POST /api/collaborate/sessions
// @access  Private
exports.createSession = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, language, projectId, scheduledFor } = req.body;
    const userId = req.user.id;

    // If project is specified, verify it exists and user has access
    if (projectId) {
      const project = await Project.findById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user is project creator or collaborator
      const isCreator = project.creator.toString() === userId;
      const isCollaborator = project.collaborators.some(c => c.toString() === userId);
      
      if (!isCreator && !isCollaborator) {
        return res.status(403).json({ message: 'Not authorized to create sessions for this project' });
      }
    }

    // Set session status based on scheduled time
    let status = 'scheduled';
    const now = new Date();
    const scheduleDate = scheduledFor ? new Date(scheduledFor) : now;
    
    // If scheduled for now or in the past, make it live
    if (scheduleDate <= now) {
      status = 'live';
    }

    // Create the session
    const session = new LiveSession({
      title,
      description,
      host: userId,
      project: projectId || null,
      language: language || 'javascript',
      status,
      scheduledFor: scheduleDate,
      participants: [userId] // Add the host as the first participant
    });

    await session.save();

    // Populate user details for the response
    await session.populate('host', 'name avatar');
    if (session.project) {
      await session.populate('project', 'title description');
    }
    await session.populate('participants', 'name avatar');

    // Emit socket event for new session
    if (req.io) {
      req.io.emit('new_session', session);
      
      if (projectId) {
        req.io.to(`project_${projectId}`).emit('project_session', session);
      }
    }

    res.status(201).json({
      message: 'Session created successfully',
      data: session
    });
  } catch (err) {
    console.error('Error creating live session:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update session status (start/end)
// @route   PUT /api/collaborate/sessions/:id/status
// @access  Private
exports.updateSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { status } = req.body;

    const session = await LiveSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only host can update status
    if (session.host.toString() !== userId) {
      return res.status(403).json({ message: 'Only the host can update session status' });
    }

    // Validate status transition
    if (!['scheduled', 'live', 'ended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Cannot go back to scheduled from ended
    if (session.status === 'ended' && status !== 'ended') {
      return res.status(400).json({ message: 'Cannot reopen an ended session' });
    }

    // Update status
    session.status = status;
    
    if (status === 'ended') {
      session.endedAt = new Date();
    }

    await session.save();

    // Populate for response
    await session.populate('host', 'name avatar');
    await session.populate('participants', 'name avatar');
    if (session.project) {
      await session.populate('project', 'title description');
    }

    // Emit socket event for status update
    if (req.io) {
      req.io.to(`session_${sessionId}`).emit('session_status_changed', {
        sessionId,
        status,
        endedAt: status === 'ended' ? session.endedAt : null
      });
      
      if (status === 'ended') {
        req.io.to(`session_${sessionId}`).emit('session_ended', {
          sessionId,
          endedAt: session.endedAt
        });
      }
    }

    res.json({
      message: `Session status updated to ${status}`,
      data: session
    });
  } catch (err) {
    console.error('Error updating session status:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update code snippet
// @route   PUT /api/collaborate/sessions/:id/code
// @access  Private
exports.updateCodeSnippet = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { codeSnippet } = req.body;

    const session = await LiveSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only participants can update code
    if (!session.participants.some(p => p.toString() === userId)) {
      return res.status(403).json({ message: 'Only participants can update the code' });
    }

    // Cannot update ended sessions
    if (session.status === 'ended') {
      return res.status(400).json({ message: 'Cannot update code in an ended session' });
    }

    // Update the code
    session.codeSnippet = codeSnippet;
    await session.save();

    // No need to emit socket event here as the client
    // will handle code updates via separate socket channel

    res.json({
      message: 'Code updated successfully'
    });
  } catch (err) {
    console.error('Error updating code snippet:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Join a session
// @route   PUT /api/collaborate/sessions/:id/join
// @access  Private
exports.joinSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = await LiveSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status === 'ended') {
      return res.status(400).json({ message: 'Cannot join an ended session' });
    }

    // Update the status to live if it was scheduled
    if (session.status === 'scheduled') {
      session.status = 'live';
    }

    // Add user to participants if not already there
    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
    }

    await session.save();

    // Populate for response
    await session.populate('host', 'name avatar');
    await session.populate('participants', 'name avatar');
    if (session.project) {
      await session.populate('project', 'title description');
    }

    // Emit socket event for user joining
    if (req.io) {
      const user = await req.user.populate('name avatar');
      
      req.io.to(`session_${sessionId}`).emit('participant_joined', {
        sessionId,
        user,
        participantCount: session.participants.length
      });
    }

    res.json({
      message: 'Joined session successfully',
      data: session
    });
  } catch (err) {
    console.error('Error joining session:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Leave a session
// @route   PUT /api/collaborate/sessions/:id/leave
// @access  Private
exports.leaveSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = await LiveSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Remove user from participants
    session.participants = session.participants.filter(
      p => p.toString() !== userId
    );

    // If host is leaving, end the session
    let hostLeft = false;
    if (session.host.toString() === userId) {
      session.status = 'ended';
      session.endedAt = new Date();
      hostLeft = true;
    }

    await session.save();

    // Emit socket event for user leaving
    if (req.io) {
      req.io.to(`session_${sessionId}`).emit('participant_left', {
        sessionId,
        userId,
        hostLeft,
        participantCount: session.participants.length
      });
      
      if (hostLeft) {
        req.io.to(`session_${sessionId}`).emit('session_ended', {
          sessionId,
          endedAt: session.endedAt
        });
      }
    }

    res.json({
      message: hostLeft ? 'Session ended' : 'Left session successfully'
    });
  } catch (err) {
    console.error('Error leaving session:', err);
    res.status(500).json({ message: 'Server error' });
  }
};