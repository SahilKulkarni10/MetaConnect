const express = require('express');
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  joinProject,
  leaveProject
} = require('../controllers/projects');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes
router.route('/')
  .get(getProjects)
  .post(createProject);

router.route('/:id')
  .get(getProject)
  .put(updateProject);

router.post('/:id/join', joinProject);
router.delete('/:id/leave', leaveProject);

module.exports = router;