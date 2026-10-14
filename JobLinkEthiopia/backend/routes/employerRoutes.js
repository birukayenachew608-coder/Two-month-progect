const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { verifyEmployer } = require('../middleware/authMiddleware');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { handleImageUpload } = require('./userRoutes');

router.get('/stats', verifyEmployer, jobController.getEmployerStats);
router.get('/jobs', verifyEmployer, jobController.getEmployerJobs);
router.post('/profile-photo', verifyEmployer, handleImageUpload, userController.uploadProfilePhoto);
router.get('/profile', verifyEmployer, authController.getMe);
router.put('/profile', verifyEmployer, userController.updateProfile);
router.post('/profile', verifyEmployer, userController.updateProfile);
router.get('/public/:id', userController.getPublicEmployerProfile);
router.get('/:id', userController.getPublicEmployerProfile);

module.exports = router;
