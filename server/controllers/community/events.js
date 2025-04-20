const Event = require('../../models/Event');
const Community = require('../../models/Community');
const { validationResult } = require('express-validator');

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('creator', 'name email avatar')
      .populate('community', 'name description image')
      .populate('attendees', 'name email avatar')
      .sort({ startDate: 1 });
    
    res.json(events);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Public
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creator', 'name email avatar')
      .populate('community', 'name description image')
      .populate('attendees', 'name email avatar');
    
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    res.json(event);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Create an event
// @route   POST /api/events
// @access  Private
exports.createEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { 
    title, 
    description, 
    startDate, 
    endDate, 
    location, 
    isVirtual, 
    meetingLink, 
    community: communityId, 
    image 
  } = req.body;
  
  try {
    // Check if the community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ msg: 'Community not found' });
    }
    
    // Check if user is a member of the community
    if (!community.members.includes(req.user.id)) {
      return res.status(401).json({ msg: 'You must be a member of the community to create an event' });
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return res.status(400).json({ msg: 'End date must be after start date' });
    }
    
    // Create new event
    const newEvent = new Event({
      title,
      description,
      startDate: start,
      endDate: end,
      location,
      isVirtual: isVirtual || false,
      meetingLink,
      community: communityId,
      creator: req.user.id,
      attendees: [req.user.id], // Add creator as first attendee
      image
    });
    
    const event = await newEvent.save();
    
    // Populate references
    await event.populate('creator', 'name email avatar');
    await event.populate('community', 'name description image');
    await event.populate('attendees', 'name email avatar');
    
    res.json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private (creator only)
exports.updateEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { 
    title, 
    description, 
    startDate, 
    endDate, 
    location, 
    isVirtual, 
    meetingLink, 
    image 
  } = req.body;
  
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    // Check if user is the creator
    if (event.creator.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to update this event' });
    }
    
    // Update fields
    if (title) event.title = title;
    if (description) event.description = description;
    
    if (startDate) {
      const start = new Date(startDate);
      event.startDate = start;
      
      // Ensure end date is after start date
      if (start > event.endDate) {
        if (endDate) {
          event.endDate = new Date(endDate);
        } else {
          return res.status(400).json({ msg: 'End date must be after start date' });
        }
      }
    }
    
    if (endDate) {
      const end = new Date(endDate);
      
      // Ensure end date is after start date
      if (end < event.startDate) {
        return res.status(400).json({ msg: 'End date must be after start date' });
      }
      
      event.endDate = end;
    }
    
    if (location) event.location = location;
    if (isVirtual !== undefined) event.isVirtual = isVirtual;
    if (meetingLink) event.meetingLink = meetingLink;
    if (image) event.image = image;
    
    event.updatedAt = Date.now();
    
    await event.save();
    
    // Populate references
    await event.populate('creator', 'name email avatar');
    await event.populate('community', 'name description image');
    await event.populate('attendees', 'name email avatar');
    
    res.json(event);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private (creator only)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    // Check if user is the creator
    if (event.creator.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to delete this event' });
    }
    
    await event.deleteOne();
    
    res.json({ msg: 'Event deleted' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    RSVP to an event (attend/unattend)
// @route   PUT /api/events/:id/rsvp
// @access  Private
exports.rsvpEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    // Check if the event is already in the past
    if (new Date(event.endDate) < new Date()) {
      return res.status(400).json({ msg: 'Cannot RSVP to past events' });
    }
    
    // Check if the user is a member of the community
    const community = await Community.findById(event.community);
    if (!community.members.includes(req.user.id)) {
      return res.status(401).json({ msg: 'You must be a member of the community to attend this event' });
    }
    
    // Toggle attendance
    const attendeeIndex = event.attendees.indexOf(req.user.id);
    
    if (attendeeIndex === -1) {
      // Add user to attendees
      event.attendees.push(req.user.id);
    } else {
      // Remove user from attendees
      event.attendees.splice(attendeeIndex, 1);
    }
    
    event.updatedAt = Date.now();
    
    await event.save();
    
    // Populate references
    await event.populate('creator', 'name email avatar');
    await event.populate('community', 'name description image');
    await event.populate('attendees', 'name email avatar');
    
    res.json(event);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Get events by community
// @route   GET /api/events/community/:communityId
// @access  Public
exports.getCommunityEvents = async (req, res) => {
  try {
    const events = await Event.find({ community: req.params.communityId })
      .populate('creator', 'name email avatar')
      .populate('community', 'name description image')
      .populate('attendees', 'name email avatar')
      .sort({ startDate: 1 });
    
    res.json(events);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Community not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Get events by user (both created and attending)
// @route   GET /api/events/user/:userId
// @access  Public
exports.getUserEvents = async (req, res) => {
  try {
    // Find events created by user or where user is an attendee
    const events = await Event.find({
      $or: [
        { creator: req.params.userId },
        { attendees: req.params.userId }
      ]
    })
      .populate('creator', 'name email avatar')
      .populate('community', 'name description image')
      .populate('attendees', 'name email avatar')
      .sort({ startDate: 1 });
    
    res.json(events);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server Error');
  }
};