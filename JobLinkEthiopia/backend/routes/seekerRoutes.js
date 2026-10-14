const express = require('express');
const router = express.Router();
const seekerController = require('../controllers/seekerController');
const { verifySeeker } = require('../middleware/authMiddleware');
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

// CV
router.post('/cv', upload.single('cvFile'), seekerController.uploadCV);
router.get('/cv/:seekerId', seekerController.getCV);

// Alerts
const alertController = require('../controllers/alertController');
router.post('/alerts', verifySeeker, alertController.createAlert);
router.get('/alerts', verifySeeker, alertController.getAlerts);
router.get('/alerts/:seekerId', verifySeeker, alertController.getAlerts);
router.delete('/alerts/:id', verifySeeker, alertController.deleteAlert);

// Profile
router.get('/profile/:seekerId', seekerController.getProfile);
router.get('/profile/:id', seekerController.getProfile);
router.get('/:id', seekerController.getProfile);
router.get('/:seekerId', seekerController.getProfile);
const userController = require('../controllers/userController');
const { handleImageUpload } = require('./userRoutes');
router.put('/profile', verifySeeker, userController.updateProfile);
router.put('/profile/:seekerId', verifySeeker, userController.updateProfile);
router.post('/profile-photo', verifySeeker, handleImageUpload, userController.uploadProfilePhoto);

module.exports = router;
