const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { verifySeeker, verifyEmployer } = require('../middleware/authMiddleware');

// Seeker applies for a job
router.post('/apply', verifySeeker, applicationController.applyForJob);

// Employer fetches applications
router.get('/employer/:employerId', verifyEmployer, applicationController.getEmployerApplications);

// Seeker fetches applications
router.get('/seeker/:seekerId', verifySeeker, applicationController.getSeekerApplications);

// Withdraw application (seeker action)
router.delete('/:id', verifySeeker, applicationController.withdrawApplication);

// Update status (employer action)
router.put('/:id/status', verifyEmployer, applicationController.updateApplicationStatus);

module.exports = router;
