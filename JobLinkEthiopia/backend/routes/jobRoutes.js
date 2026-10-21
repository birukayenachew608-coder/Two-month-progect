const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateToken, requireEmployer, requireSeeker } = require('../middleware/authMiddleware');

router.post('/', requireEmployer, jobController.createJob);
router.get('/', jobController.getJobs);
router.get('/freemium-status', requireEmployer, jobController.getFreemiumStatus);
router.get('/employer/:employerId/analytics', requireEmployer, jobController.getEmployerAnalytics);

// Saved Jobs (Job Seeker protected)
router.post('/saved', requireSeeker, jobController.saveJob);
router.get('/saved', requireSeeker, jobController.getSavedJobs);
router.get('/saved/:seekerId', requireSeeker, jobController.getSavedJobs);
router.delete('/saved/:jobId', requireSeeker, jobController.unsaveJob);
router.delete('/saved/:seekerId/:jobId', requireSeeker, jobController.unsaveJob);

// Recommended Jobs
router.get('/recommended/:seekerId', jobController.getRecommendedJobs);

router.get('/employer/my-jobs', requireEmployer, jobController.getEmployerJobs);
router.get('/employer/:employerId', requireEmployer, jobController.getEmployerJobs);

// Job by ID routes
router.get('/:id', jobController.getJobById);
router.post('/:id/view', jobController.incrementJobView);
router.post('/:id/report', jobController.reportJob);
router.delete('/:id/report', jobController.withdrawJobReport);
router.put('/:id/close', requireEmployer, jobController.closeJob);
router.patch('/:id/status', requireEmployer, jobController.updateJob);
router.put('/:id', requireEmployer, jobController.updateJob);
router.delete('/:id', requireEmployer, jobController.deleteJob);

module.exports = router;
