const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Isolated rate limiting: strictly keys by client IP (req.ip) or email (req.body.email)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP/User to 5 attempts per 15 minutes
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

// Seeker Routes
router.post('/seeker/register', authController.seekerRegister);
router.post('/seeker/login', loginLimiter, authController.seekerLogin);
router.post('/seeker/refresh', authController.seekerRefresh);
router.post('/seeker/verify', authController.seekerVerify);
router.post('/seeker/logout', authController.seekerLogout);

// Employer Routes
router.post('/employer/register', authController.employerRegister);
router.post('/employer/login', loginLimiter, authController.employerLogin);
router.post('/employer/refresh', authController.employerRefresh);
router.post('/employer/verify', authController.employerVerify);
router.post('/employer/logout', authController.employerLogout);

// OTP Routes for Registration
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);

// Other routes
router.post('/switch-role', authenticateToken, authController.switchRole);
router.get('/me', authenticateToken, authController.getMe);

// GitHub OAuth
router.get('/github', authController.githubAuth);
router.get('/github/callback', authController.githubCallback);

// LinkedIn OAuth
router.get('/linkedin', authController.linkedinAuth);
router.get('/linkedin/callback', authController.linkedinCallback);

// Google OAuth
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

module.exports = router;

