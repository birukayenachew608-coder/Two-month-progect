const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const adminController = require('../controllers/adminController');

const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'admin-avatar-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);
        if (ext && mime) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed!'));
        }
    }
});

const handleAdminImageUpload = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        if (req.files && req.files.length > 0) {
            req.file = req.files[0];
        }
        next();
    });
};

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP/User to 5 login requests per 15 minutes
    message: { message: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const clientIp = req.ip ? (typeof ipKeyGenerator === 'function' ? ipKeyGenerator(req.ip) : req.ip) : 'unknown';
        const email = (req.body && req.body.email) ? String(req.body.email).toLowerCase().trim() : '';
        return email ? `${clientIp}_${email}` : clientIp;
    },
    validate: { xForwardedForHeader: false, default: true }
});

// Admin Login
router.post('/login', loginLimiter, adminController.login);

// Refresh Token
router.post('/refresh', adminController.refresh);

// 2FA Routes
const { authenticateToken } = require('../middleware/authMiddleware');
router.post('/2fa/verify', adminController.verify2FA);
router.get('/2fa/setup', authenticateToken, adminController.setup2FA);

// Auth verification & Logout
router.get('/verify', authenticateToken, adminController.verify);
router.post('/logout', adminController.logout);

// Admin Profile & Security
router.get('/profile', authenticateToken, adminController.getAdminProfile);
router.put('/profile', authenticateToken, adminController.updateAdminProfile);
router.post('/profile', authenticateToken, adminController.updateAdminProfile);
router.post('/change-password', authenticateToken, adminController.changeAdminPassword);
router.put('/change-password', authenticateToken, adminController.changeAdminPassword);
router.post('/profile/upload', authenticateToken, handleAdminImageUpload, adminController.uploadProfilePhoto);
router.put('/profile/upload', authenticateToken, handleAdminImageUpload, adminController.uploadProfilePhoto);
router.delete('/profile/photo', authenticateToken, adminController.removeProfilePhoto);
router.delete('/profile/upload', authenticateToken, adminController.removeProfilePhoto);

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
