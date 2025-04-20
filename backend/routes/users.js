const express = require('express');
const { getUsers, getUser, updateUser } = require('../controllers/users');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes
router.get('/', getUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);

module.exports = router;