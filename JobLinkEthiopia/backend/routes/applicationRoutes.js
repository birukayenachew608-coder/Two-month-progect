const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { requireSeeker, requireEmployer, requireRole, checkNotBannedSeeker } = require('../middleware/authMiddleware');

// Seeker applies for a job
router.post('/apply', requireSeeker, checkNotBannedSeeker, applicationController.applyForJob);

// Employer fetches applications for their company/job
router.get('/employer/:employerId', requireEmployer, applicationController.getEmployerApplications);

// Seeker fetches their own applications (accessible by Job Seeker or Admins)
router.get('/seeker/:seekerId', requireRole('job_seeker', 'admin', 'super_admin'), applicationController.getSeekerApplications);

// Withdraw application (seeker action)
router.delete('/:id', requireSeeker, applicationController.withdrawApplication);

// Update application status (employer action)
router.put('/:id/status', requireEmployer, applicationController.updateApplicationStatus);

module.exports = router;
