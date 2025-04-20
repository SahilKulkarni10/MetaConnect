const Community = require('../../models/Community');
const User = require('../../models/User');
const { validationResult } = require('express-validator');

// @desc    Get all communities
// @route   GET /api/communities
// @access  Public
exports.getCommunities = async (req, res) => {
  try {
    const communities = await Community.find()
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar')
      .sort({ createdAt: -1 });
    
    res.json(communities);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get community by ID
// @route   GET /api/communities/:id
// @access  Public
exports.getCommunityById = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');
    
    if (!community) {
      return res.status(404).json({ msg: 'Community not found' });
    }
    
    res.json(community);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Community not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Create a community
// @route   POST /api/communities
// @access  Private
exports.createCommunity = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { name, description, tags, image } = req.body;
  
  try {
    // Check if community name already exists
    const existingCommunity = await Community.findOne({ name });
    if (existingCommunity) {
      return res.status(400).json({ msg: 'Community with this name already exists' });
    }
    
    // Generate sample tags if none provided
    let communityTags = tags || [];
    if (communityTags.length === 0) {
      // Generate default tags based on community name/description
      const sampleTags = ['collaboration', 'learning', 'technology', 'coding', 'design', 
                          'development', 'networking', 'innovation', 'community', 'knowledge-sharing'];
      // Add 3-5 random tags
      const numTags = Math.floor(Math.random() * 3) + 3; // 3 to 5 tags
      for (let i = 0; i < numTags; i++) {
        const randomTag = sampleTags[Math.floor(Math.random() * sampleTags.length)];
        if (!communityTags.includes(randomTag)) {
          communityTags.push(randomTag);
        }
      }
    }
    
    // Create new community with enhanced data
    const newCommunity = new Community({
      name,
      description,
      owner: req.user.id,
      members: [req.user.id],
      tags: communityTags,
      image: image || 'default-community.png'
    });
    
    const community = await newCommunity.save();
    
    // Create sample events for this community if it's not explicitly a test community
    if (!name.toLowerCase().includes('test')) {
      const Event = require('../../models/Event');
      
      // Sample event templates
      const eventTemplates = [
        {
          title: `Welcome to ${name}`,
          description: `Join us for our first community gathering! We'll discuss goals, projects, and ways to collaborate in the ${name} community.`,
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours long
          location: 'Virtual Meeting (Zoom)',
          attendees: [req.user.id]
        },
        {
          title: `${name} Workshop Series: Getting Started`,
          description: 'Learn the basics and best practices from experienced community members in this introductory workshop.',
          startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours long
          location: 'Community Space',
          attendees: [req.user.id]
        },
        {
          title: `${name} Monthly Meetup`,
          description: 'Regular community gathering to share updates, showcase projects, and network with other members.',
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month from now
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours long
          location: 'Hybrid (In-person & Online)',
          attendees: [req.user.id]
        }
      ];
      
      // Create 2-3 random events
      const numEvents = Math.floor(Math.random() * 2) + 2; // 2 to 3 events
      const createdEvents = [];
      
      for (let i = 0; i < numEvents; i++) {
        const template = eventTemplates[i];
        const newEvent = new Event({
          title: template.title,
          description: template.description,
          startDate: template.startDate,
          endDate: template.endDate,
          location: template.location,
          community: community._id,
          creator: req.user.id,
          attendees: template.attendees
        });
        
        createdEvents.push(await newEvent.save());
      }
      
      console.log(`Created ${createdEvents.length} sample events for new community: ${name}`);
    }
    
    await community.populate('owner', 'name email avatar');
    await community.populate('members', 'name email avatar');
    
    res.json(community);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update a community
// @route   PUT /api/communities/:id
// @access  Private (owner only)
exports.updateCommunity = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { name, description, tags, image } = req.body;
  
  try {
    const community = await Community.findById(req.params.id);
    
    if (!community) {
      return res.status(404).json({ msg: 'Community not found' });
    }
    
    // Check if user is the owner
    if (community.owner.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to update this community' });
    }
    
    // If name is being changed, check if it already exists
    if (name && name !== community.name) {
      const existingCommunity = await Community.findOne({ name });
      if (existingCommunity) {
        return res.status(400).json({ msg: 'Community with this name already exists' });
      }
    }
    
    // Update fields
    if (name) community.name = name;
    if (description) community.description = description;
    if (tags) community.tags = tags;
    if (image) community.image = image;
    
    community.updatedAt = Date.now();
    
    await community.save();
    
    await community.populate('owner', 'name email avatar');
    await community.populate('members', 'name email avatar');
    
    res.json(community);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Community not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Delete a community
// @route   DELETE /api/communities/:id
// @access  Private (owner only)
exports.deleteCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    
    if (!community) {
      return res.status(404).json({ msg: 'Community not found' });
    }
    
    // Check if user is the owner
    if (community.owner.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to delete this community' });
    }
    
    await community.deleteOne();
    
    res.json({ msg: 'Community deleted' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Community not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Join a community
// @route   PUT /api/communities/:id/join
// @access  Private
exports.joinCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    
    if (!community) {
      return res.status(404).json({ msg: 'Community not found' });
    }
    
    // Check if user is already a member
    if (community.members.includes(req.user.id)) {
      return res.status(400).json({ msg: 'User is already a member of this community' });
    }
    
    community.members.push(req.user.id);
    community.updatedAt = Date.now();
    
    await community.save();
    
    await community.populate('owner', 'name email avatar');
    await community.populate('members', 'name email avatar');
    
    res.json(community);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Community not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Leave a community
// @route   PUT /api/communities/:id/leave
// @access  Private
exports.leaveCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    
    if (!community) {
      return res.status(404).json({ msg: 'Community not found' });
    }
    
    // Check if user is a member
    if (!community.members.includes(req.user.id)) {
      return res.status(400).json({ msg: 'User is not a member of this community' });
    }
    
    // Prevent owner from leaving
    if (community.owner.toString() === req.user.id) {
      return res.status(400).json({ msg: 'Owner cannot leave the community. Transfer ownership or delete the community.' });
    }
    
    // Remove user from members
    community.members = community.members.filter(
      memberId => memberId.toString() !== req.user.id
    );
    
    community.updatedAt = Date.now();
    
    await community.save();
    
    await community.populate('owner', 'name email avatar');
    await community.populate('members', 'name email avatar');
    
    res.json(community);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Community not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Get communities by user
// @route   GET /api/communities/user/:userId
// @access  Public
exports.getUserCommunities = async (req, res) => {
  try {
    const communities = await Community.find({ members: req.params.userId })
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar')
      .sort({ createdAt: -1 });
    
    res.json(communities);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server Error');
  }
};