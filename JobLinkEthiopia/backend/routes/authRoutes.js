const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireSeeker, requireEmployer, requireAdmin, authorizeRole } = require('../middleware/authMiddleware');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Ensure req.body is defined for safety with custom keyGenerators
router.use((req, res, next) => {
    if (!req.body) req.body = {};
    next();
});

// Rate limiting middleware: maximum 8 login attempts per email within a 60-second window
const jobSeekerLoginLimiter = rateLimit({
    windowMs: 60 * 1000, // 60 seconds
    max: 8, // maximum 8 login attempts
    message: { message: 'Too many login attempts. Account is temporarily locked for 1 minute.' },
    keyGenerator: (req) => req.body.email || req.ip,
    standardHeaders: true, 
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, default: true, keyGeneratorIpFallback: false }
});

const employerLoginLimiter = rateLimit({
    windowMs: 60 * 1000, // 60 seconds
    max: 8, // maximum 8 login attempts
    message: { message: 'Too many login attempts. Account is temporarily locked for 1 minute.' },
    keyGenerator: (req) => req.body.email || req.ip,
    standardHeaders: true, 
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, default: true, keyGeneratorIpFallback: false }
});

// Seeker Routes - strictly separated
router.post('/seeker/register', authController.seekerRegister);
router.post('/seeker/login', jobSeekerLoginLimiter, authController.seekerLogin);
router.post('/seeker/refresh', authController.seekerRefresh);
router.post('/seeker/verify', authController.seekerVerify);
router.post('/seeker/logout', authController.seekerLogout);
router.get('/seeker/me', requireSeeker, authController.seekerGetMe);

// Employer Routes - strictly separated
router.post('/employer/register', authController.employerRegister);
router.post('/employer/login', employerLoginLimiter, authController.employerLogin);
router.post('/employer/refresh', authController.employerRefresh);
router.post('/employer/verify', authController.employerVerify);
router.post('/employer/logout', authController.employerLogout);
router.get('/employer/me', requireEmployer, authController.employerGetMe);

// General auth routes (supporting both Job Seekers and Employers)
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh-token', authController.refreshToken);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/logout', authController.logout);

// OTP Routes for Registration
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);

// Other routes
router.post('/switch-role', authenticateToken, authController.switchRole);
router.get('/me', authenticateToken, authController.getMe);

// Lightweight admin validation endpoint requested by frontend guard
router.get('/verify-admin', requireAdmin, (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.status(200).json({
        valid: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        }
    });
});

// GitHub OAuth
router.get('/github', authController.githubAuth);
router.get('/github/callback', authController.githubCallback);

// LinkedIn OAuth (temporarily disabled per mentor advice)
// router.get('/linkedin', authController.linkedinAuth);
// router.get('/linkedin/callback', authController.linkedinCallback);

// Google OAuth
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

router.jobSeekerLoginLimiter = jobSeekerLoginLimiter;
router.employerLoginLimiter = employerLoginLimiter;

module.exports = router;

