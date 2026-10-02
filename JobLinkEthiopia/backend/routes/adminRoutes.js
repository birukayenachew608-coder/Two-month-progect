const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const adminController = require('../controllers/adminController');

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: { message: 'Too many login attempts, please try again after 5 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Admin Login
router.post('/login', loginLimiter, adminController.login);

// Refresh Token
router.post('/refresh', adminController.refresh);

// 2FA Routes
const { authenticateToken } = require('../middleware/authMiddleware');
router.post('/2fa/verify', adminController.verify2FA);
router.get('/2fa/setup', authenticateToken, adminController.setup2FA);

// In a real application, you would add authentication and authorization middleware here
// to ensure only admins can access these routes.

// Analytics Stats
router.get('/stats', adminController.getDashboardStats);

// Employers
router.get('/employers', adminController.getEmployers);
router.put('/employers/:id/status', adminController.updateEmployerStatus);
router.delete('/employers/:id', adminController.deleteEmployer);

// Job Seekers
router.get('/seekers', adminController.getJobSeekers);
router.put('/seekers/:id/status', adminController.updateSeekerStatus);
router.delete('/seekers/:id', adminController.deleteJobSeeker);

// Reported Jobs
router.get('/jobs/reported', adminController.getReportedJobs);
router.put('/jobs/:id/status', adminController.updateJobStatus);
router.delete('/jobs/:id', adminController.deleteJob);

module.exports = router;
