const express = require('express');
const router = express.Router();
const overdraftController = require('../controllers/overdraftController');
const { requireAuth, noCache,verifyToken,verifyRole  } = require('../middleware/authMiddleware');

router.get('/dailyreport',requireAuth, noCache,verifyToken, overdraftController.dailyreportlist);
router.get('/monthlyreport',requireAuth, noCache,verifyToken, overdraftController.monthlyreportlist);

module.exports = router;