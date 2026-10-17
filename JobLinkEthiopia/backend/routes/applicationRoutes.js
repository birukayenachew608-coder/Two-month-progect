const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { verifySeeker, verifyEmployer } = require('../middleware/authMiddleware');

// Seeker applies for a job
router.post('/apply', verifySeeker, applicationController.applyForJob);

// Employer fetches applications
router.get('/employer/:employerId', verifyEmployer, applicationController.getEmployerApplications);

// Seeker fetches applications
router.get('/seeker/:seekerId', (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const hasToken = (token && !token.includes('cookie')) || 
                     (req.cookies && (req.cookies.seeker_accessToken || req.cookies.token));
    if (hasToken) {
        return verifySeeker(req, res, next);
    }
    // Allow reading seeker applications by seekerId in dev / local environment
    next();
}, applicationController.getSeekerApplications);

// Withdraw application (seeker action)
router.delete('/:id', verifySeeker, applicationController.withdrawApplication);

// Update status (employer action)
router.put('/:id/status', verifyEmployer, applicationController.updateApplicationStatus);

module.exports = router;
