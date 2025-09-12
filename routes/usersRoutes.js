const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, noCache, requireNoBankId, verifyToken, verifyRole } = require('../middleware/authMiddleware');


router.get('/profile', requireAuth, noCache, verifyToken, userController.getProfile);
router.post('/:id/updateProfile', requireAuth, noCache, verifyToken, userController.updateProfile);
router.post('/:id/updateUser', requireAuth, noCache, verifyToken, userController.updateUser);
router.get('/list', requireAuth, noCache, requireNoBankId, verifyToken, verifyRole(['Admin']), userController.getList);
router.get('/create', requireAuth, noCache, requireNoBankId, verifyToken, verifyRole(['Admin']), userController.getUserForm);
router.post('/save', requireAuth, noCache, requireNoBankId, verifyToken, verifyRole(['Admin']), userController.saveUser);
router.post('/:id/delete', requireAuth, noCache, requireNoBankId, verifyToken, verifyRole(['Admin']), userController.deleteUser);



module.exports = router;