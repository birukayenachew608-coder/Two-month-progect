const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const employerController = require('../controllers/employerController');
const seekerController = require('../controllers/seekerController');
const { handleImageUpload } = require('./userRoutes');

// Secure all routes under /api/employer with authorizeRole('employer', 'admin', 'super_admin')
router.use(authenticateToken, authorizeRole('employer', 'admin', 'super_admin'));

router.get('/stats', jobController.getEmployerStats);
router.get('/jobs', jobController.getEmployerJobs);
router.get('/freemium-status', jobController.getFreemiumStatus);

// Notifications & Messages from Admin
router.get('/messages', employerController.getEmployerMessages);
router.get('/notifications', employerController.getEmployerMessages);
router.put('/messages/read-all', employerController.markAllMessagesAsRead);
router.put('/messages/:id/read', employerController.markMessageAsRead);
router.delete('/messages/:id', employerController.deleteEmployerMessage);
router.put('/notifications/read-all', employerController.markAllMessagesAsRead);
router.put('/notifications/:id/read', employerController.markMessageAsRead);
router.delete('/notifications/:id', employerController.deleteEmployerMessage);

// Employer Own Profile Management
router.post('/profile-photo', handleImageUpload, userController.uploadProfilePhoto);
router.get('/profile', authController.employerGetMe);
router.get('/me', authController.employerGetMe);
router.put('/profile', userController.updateProfile);
router.post('/profile', userController.updateProfile);

// Applicant / Candidate Viewing for Employers
router.get('/candidate/:id', seekerController.getProfile);
router.get('/applicant/:id', seekerController.getProfile);
router.get('/seeker/:id', seekerController.getProfile);
router.get('/seekers/:id', seekerController.getProfile);
router.get('/cv/:seekerId', seekerController.getCV);

// Public Employer Profiles
router.get('/public/:id', userController.getPublicEmployerProfile);
router.get('/:id', userController.getPublicEmployerProfile);

module.exports = router;

