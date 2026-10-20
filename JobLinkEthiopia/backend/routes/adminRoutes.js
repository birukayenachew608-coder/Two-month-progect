const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const adminController = require('../controllers/adminController');

// Memory storage prevents ephemeral disk loss on Render
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);
        if (ext || mime) {
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

// Strict Rate Limiting: 5 attempts per 60 seconds per IP/email
const adminAuthLimiter = rateLimit({
    windowMs: 60 * 1000, // 60 seconds
    max: 5, // Limit each IP/email to 5 attempts per minute
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
        status: 429,
        error: 'Too Many Requests',
        message: 'Too many authentication attempts. Please try again after 60 seconds.'
    },
    keyGenerator: (req) => {
        const clientIp = req.ip ? (typeof ipKeyGenerator === 'function' ? ipKeyGenerator(req.ip) : req.ip) : (req.socket?.remoteAddress || '127.0.0.1');
        let email = '';
        if (req.body && req.body.email) {
            email = String(req.body.email).toLowerCase().trim();
        } else if (req.body && req.body.tempAuthToken) {
            try {
                const decoded = jwt.decode(req.body.tempAuthToken);
                if (decoded && (decoded.email || decoded.id)) {
                    email = decoded.email ? String(decoded.email).toLowerCase().trim() : `admin_${decoded.id}`;
                }
            } catch (e) {}
        }
        return email ? `${clientIp}_${email}` : clientIp;
    },
    handler: (req, res, next, options) => {
        res.status(429).json({
            status: 429,
            error: 'Too Many Requests',
            message: 'Too many authentication attempts. Please try again after 60 seconds.'
        });
    },
    validate: { xForwardedForHeader: false, default: true }
});

// Admin Login
router.post('/login', adminAuthLimiter, adminController.login);

// Refresh Token
router.post('/refresh', adminController.refresh);

// 2FA Routes
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
router.post('/2fa/verify', adminAuthLimiter, adminController.verify2FA);
router.post('/verify-2fa', adminAuthLimiter, adminController.verify2FA);

// Strict Authentication and Role Guard for all admin endpoints below
const requireAdmin = [authenticateToken, authorizeRole('admin', 'super_admin')];

// 2FA Setup
router.get('/2fa/setup', requireAdmin, adminController.setup2FA);

// Auth verification & Logout
router.get('/verify', requireAdmin, adminController.verify);
router.post('/logout', adminController.logout);

// Admin Profile & Security (Strictly Protected)
router.get('/profile', requireAdmin, adminController.getAdminProfile);
router.put('/profile', requireAdmin, adminController.updateAdminProfile);
router.post('/profile', requireAdmin, adminController.updateAdminProfile);
router.post('/change-password', requireAdmin, adminController.changeAdminPassword);
router.put('/change-password', requireAdmin, adminController.changeAdminPassword);
router.post('/profile/upload', requireAdmin, handleAdminImageUpload, adminController.uploadProfilePhoto);
router.put('/profile/upload', requireAdmin, handleAdminImageUpload, adminController.uploadProfilePhoto);
router.delete('/profile/photo', requireAdmin, adminController.removeProfilePhoto);
router.delete('/profile/upload', requireAdmin, adminController.removeProfilePhoto);

// Analytics Stats (Strictly Protected)
router.get('/stats', requireAdmin, adminController.getDashboardStats);

// Employers Management (Strictly Protected)
router.get('/employers', requireAdmin, adminController.getEmployers);
router.put('/employers/:id/status', requireAdmin, adminController.updateEmployerStatus);
router.put('/employers/:id/approve', requireAdmin, adminController.approveEmployer);
router.put('/employers/:id/reject', requireAdmin, adminController.rejectEmployer);
router.delete('/employers/:id', requireAdmin, adminController.deleteEmployer);

// Job Seekers Management (Strictly Protected)
router.get('/seekers', requireAdmin, adminController.getJobSeekers);
router.put('/seekers/:id/status', requireAdmin, adminController.updateSeekerStatus);
router.delete('/seekers/:id', requireAdmin, adminController.deleteJobSeeker);

// Reported Jobs & Reports Management (Strictly Protected)
router.get('/jobs/reported', requireAdmin, adminController.getReportedJobs);
router.delete('/reports/:id', requireAdmin, adminController.dismissReport);
router.delete('/jobs/:id/report', requireAdmin, adminController.dismissReport);
router.put('/jobs/:id/status', requireAdmin, adminController.updateJobStatus);
router.delete('/jobs/:id', requireAdmin, adminController.deleteJob);

// Admin to Employer Messages (Strictly Protected)
router.post('/messages', requireAdmin, adminController.sendMessageToEmployer);

module.exports = router;
