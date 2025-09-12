const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth, noCache,verifyToken, } = require('../middleware/authMiddleware');

// Dashboard page
router.get('/', requireAuth, noCache,verifyToken, dashboardController.getDashboard);

module.exports = router;