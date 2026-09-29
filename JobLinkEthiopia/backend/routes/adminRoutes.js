const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// In a real application, you would add authentication and authorization middleware here
// to ensure only admins can access these routes.

router.get('/seekers', adminController.getJobSeekers);
router.delete('/seekers/:id', adminController.deleteJobSeeker);

module.exports = router;
