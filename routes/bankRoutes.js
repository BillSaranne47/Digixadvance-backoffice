const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bankController');
const { requireAuth, noCache,requireNoBankId,verifyToken,verifyRole } = require('../middleware/authMiddleware');


router.get('/list',requireAuth, noCache,requireNoBankId,verifyToken,verifyRole(['Admin']), bankController.getbanks);
router.get('/:id/bankInfo',requireAuth, noCache,verifyToken,verifyRole(['Admin']), bankController.bankInfo);
router.get('/create',requireAuth, noCache,requireNoBankId, verifyToken, verifyRole(['Admin']), bankController.getBankForm);
router.post('/save',requireAuth, noCache,requireNoBankId,verifyToken,verifyRole(['Admin']), bankController.saveBank);
router.post('/:id/delete',requireAuth, noCache,requireNoBankId,verifyToken,verifyRole(['Admin']), bankController.deleteBank);

router.post('/:id/update',requireAuth, noCache,requireNoBankId,verifyToken,verifyRole(['Admin']), bankController.saveUpdatedBank);


// router.get('/listConfig',requireAuth, noCache, bankController.getbanksConfig);
// router.post('/saveConfig',requireAuth, noCache, bankController.saveConfig);
// router.post('/updateConfig',requireAuth, noCache, bankController.updateConfig);

module.exports = router;