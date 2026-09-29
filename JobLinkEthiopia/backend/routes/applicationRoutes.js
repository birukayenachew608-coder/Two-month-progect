const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');

// Seeker applies for a job
router.post('/apply', applicationController.applyForJob);

// Employer fetches applications
router.get('/employer/:employerId', applicationController.getEmployerApplications);

// Seeker fetches applications
router.get('/seeker/:seekerId', applicationController.getSeekerApplications);

// Withdraw application
router.delete('/:id', applicationController.withdrawApplication);

// Update status
router.put('/:id/status', applicationController.updateApplicationStatus);

module.exports = router;
