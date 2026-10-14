const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { verifySeeker } = require('../middleware/authMiddleware');

// All /api/alerts endpoints protected by verifySeeker
router.post('/', verifySeeker, alertController.createAlert);
router.get('/', verifySeeker, alertController.getAlerts);
router.get('/:seekerId', verifySeeker, alertController.getAlerts);
router.delete('/:id', verifySeeker, alertController.deleteAlert);

module.exports = router;
