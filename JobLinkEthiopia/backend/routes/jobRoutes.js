const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

router.post('/', jobController.createJob);
router.get('/', jobController.getJobs);
router.get('/employer/:employerId/analytics', jobController.getEmployerAnalytics);
router.get('/:id', jobController.getJobById);

// Saved Jobs
router.post('/saved', jobController.saveJob);
router.get('/saved/:seekerId', jobController.getSavedJobs);
router.delete('/saved/:seekerId/:jobId', jobController.unsaveJob);

// Recommended Jobs
router.get('/recommended/:seekerId', jobController.getRecommendedJobs);

module.exports = router;
