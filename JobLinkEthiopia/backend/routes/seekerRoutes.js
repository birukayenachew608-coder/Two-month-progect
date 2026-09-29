const express = require('express');
const router = express.Router();
const seekerController = require('../controllers/seekerController');
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
router.post('/alerts', seekerController.createAlert);
router.get('/alerts/:seekerId', seekerController.getAlerts);
router.delete('/alerts/:id', seekerController.deleteAlert);

module.exports = router;
