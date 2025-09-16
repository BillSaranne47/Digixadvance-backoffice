const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { requireAuth, noCache, verifyToken,requireNoBankId } = require('../middleware/authMiddleware');

const multer = require('multer');
const storage = multer.memoryStorage(); // you use buffer in controller
const upload = multer({ storage });

router.get('/list',requireAuth, noCache,verifyToken, clientController.getClients);
router.get('/:id/listInfo',requireAuth, noCache,verifyToken, clientController.listInfo);

router.post('/updateClientInfo',requireAuth, noCache,verifyToken, clientController.updatescoring);

router.post('/:id/deleteClient',requireAuth, noCache,verifyToken, clientController.deleteClient);
router.post('/save',requireAuth, noCache,verifyToken, clientController.saveClient);

router.post('/importclients', requireAuth, noCache, upload.single('file'),verifyToken, clientController.importClients);

router.post('/:id/deleteClientBankLink',requireAuth, noCache,verifyToken, clientController.deleteClientBankLink);

router.post('/:id/resetDebt',requireAuth, noCache,verifyToken, clientController.resetDebt);

router.post('/importClientsFinal', requireAuth, noCache, verifyToken, clientController.importClientsFinal);

router.post('/:id/resetPinCode', requireAuth, noCache, verifyToken, clientController.resetPinCode);

router.post('/:id/revertOverdraft', requireAuth, verifyToken,clientController.revertOverdraft);

router.post('/:id/updateClient', requireAuth, noCache, verifyToken, clientController.updateClient);

module.exports = router;