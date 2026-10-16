const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// POST /api/reports - Log report without hiding post
router.post('/', reportController.createReport);

// DELETE /api/reports/:jobId - Withdraw/delete report
router.delete('/:jobId', reportController.deleteReport);

// GET /api/reports/my-reports
router.get('/my-reports', reportController.getUserReports);

module.exports = router;
