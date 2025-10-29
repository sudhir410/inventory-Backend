const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getDashboardStats,
  getRecentActivities
} = require('../controllers/dashboardController');

// All routes are protected
router.use(protect);

// @route   GET /api/dashboard/stats
router.get('/stats', getDashboardStats);

// @route   GET /api/dashboard/activities
router.get('/activities', getRecentActivities);

module.exports = router;

