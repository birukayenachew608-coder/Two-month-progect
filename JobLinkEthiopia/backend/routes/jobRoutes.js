const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateToken, verifyEmployer, verifySeeker } = require('../middleware/authMiddleware');

router.post('/', verifyEmployer, jobController.createJob);
router.get('/', jobController.getJobs);
router.get('/employer/:employerId/analytics', verifyEmployer, jobController.getEmployerAnalytics);
// Saved Jobs (must be declared before /:id)
router.post('/saved', verifySeeker, jobController.saveJob);
router.get('/saved', verifySeeker, jobController.getSavedJobs);
router.get('/saved/:seekerId', verifySeeker, jobController.getSavedJobs);
router.delete('/saved/:jobId', verifySeeker, jobController.unsaveJob);
router.delete('/saved/:seekerId/:jobId', verifySeeker, jobController.unsaveJob);

// Recommended Jobs
router.get('/recommended/:seekerId', jobController.getRecommendedJobs);

// Job by ID routes
router.get('/:id', jobController.getJobById);
router.post('/:id/view', jobController.incrementJobView);
router.post('/:id/report', jobController.reportJob);
router.put('/:id', verifyEmployer, jobController.updateJob);
router.delete('/:id', verifyEmployer, jobController.deleteJob);

module.exports = router;
