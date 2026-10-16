const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + ext);
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

// Middleware to accept image file under any standard field name
const handleImageUpload = (req, res, next) => {
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

const authController = require('../controllers/authController');

// Route: GET /api/user/me (fetch authenticated user data on page load)
router.get('/me', authenticateToken, authController.getMe);
router.get('/profile', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, userController.updateProfile);
router.post('/profile', authenticateToken, userController.updateProfile);

// Route: POST /api/user/profile-photo (authenticated)
router.post('/profile-photo', authenticateToken, handleImageUpload, userController.uploadProfilePhoto);

// Route: GET /api/user/profile-photo (authenticated)
router.get('/profile-photo', authenticateToken, userController.getProfilePhoto);

// Route: DELETE /api/user/profile-photo (authenticated)
router.delete('/profile-photo', authenticateToken, userController.removeProfilePhoto);

// Public employer profile route
router.get('/employer/:id', userController.getPublicEmployerProfile);

module.exports = router;
module.exports.handleImageUpload = handleImageUpload;
