const express = require('express');
const router = express.Router();
const fundController = require('../controllers/fundController');
const { requireAuth, noCache,verifyToken,verifyRole  } = require('../middleware/authMiddleware');

router.get('/list',requireAuth, noCache,verifyToken, fundController.fundlist);
router.post('/addfund',requireAuth, noCache,verifyToken, fundController.addFund);
router.post('/:id/activatefund',requireAuth, noCache,verifyToken, fundController.activatefund);
module.exports = router;