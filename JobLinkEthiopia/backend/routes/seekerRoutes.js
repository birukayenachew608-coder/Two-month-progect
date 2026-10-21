const express = require('express');
const router = express.Router();
const seekerController = require('../controllers/seekerController');
const { authenticateToken, requireSeeker, requireRole } = require('../middleware/authMiddleware');

// Authenticate all routes under /api/seeker and /api/seekers
router.use(authenticateToken);
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf|doc|docx/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, and DOCX files are allowed!'));
        }
    }
});

// CV Management (Seekers upload/delete their own CV; Employers & Admins can read applicant CVs)
router.post('/cv', requireSeeker, upload.single('cvFile'), seekerController.uploadCV);
router.get('/cv/:seekerId', requireRole('job_seeker', 'employer', 'admin', 'super_admin'), seekerController.getCV);
router.get('/cv', requireRole('job_seeker', 'employer', 'admin', 'super_admin'), seekerController.getCV);
router.delete('/cv/:seekerId', requireRole('job_seeker', 'admin', 'super_admin'), seekerController.deleteCV);
router.delete('/cv', requireSeeker, seekerController.deleteCV);

// Alerts (Job Seeker specific)
const alertController = require('../controllers/alertController');
router.post('/alerts', requireSeeker, alertController.createAlert);
router.get('/alerts', requireSeeker, alertController.getAlerts);
router.get('/alerts/:seekerId', requireRole('job_seeker', 'admin', 'super_admin'), alertController.getAlerts);
router.delete('/alerts/:id', requireRole('job_seeker', 'admin', 'super_admin'), alertController.deleteAlert);

// Profile Endpoints
const authController = require('../controllers/authController');
router.get('/profile/me', requireSeeker, authController.seekerGetMe);
router.get('/me', requireSeeker, authController.seekerGetMe);

// Candidate / Seeker Profile Reading (Accessible by Job Seeker, Employer reviewing candidates, and Admins)
router.get('/profile/:seekerId', requireRole('job_seeker', 'employer', 'admin', 'super_admin'), seekerController.getProfile);
router.get('/profile/:id', requireRole('job_seeker', 'employer', 'admin', 'super_admin'), seekerController.getProfile);
router.get('/:id', requireRole('job_seeker', 'employer', 'admin', 'super_admin'), seekerController.getProfile);
router.get('/:seekerId', requireRole('job_seeker', 'employer', 'admin', 'super_admin'), seekerController.getProfile);

// Profile Updates
const userController = require('../controllers/userController');
const { handleImageUpload } = require('./userRoutes');
router.put('/profile', requireSeeker, userController.updateProfile);
router.put('/profile/:seekerId', requireRole('job_seeker', 'admin', 'super_admin'), userController.updateProfile);
router.post('/profile-photo', requireSeeker, handleImageUpload, userController.uploadProfilePhoto);

module.exports = router;
