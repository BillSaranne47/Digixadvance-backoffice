const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', authController.getlogin);

router.post('/login', 
    authController.login
);

router.get('/logout',
    authMiddleware.requireAuth, 
    authMiddleware.noCache, 
    authController.logout
);

router.get('/twofa/setup', requireAuth, authController.getTwoFactorSetup);
router.post('/twofa/setup', requireAuth, authController.verifyTwoFactorSetup);
router.get('/twofa/verify', authController.getTwoFactorVerify);
router.post('/twofa/verify', authController.postTwoFactorVerify);
// authRoutes.js
router.post('/twofa/disable', requireAuth, authController.disableTwoFactor);

router.get('/twofa/status', requireAuth, authController.checkTwoFactorStatus);
module.exports = router;