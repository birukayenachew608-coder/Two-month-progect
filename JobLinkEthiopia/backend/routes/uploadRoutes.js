const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');

// Use memory storage so image files never touch ephemeral disk on Render
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|gif|webp/;
    const ext = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedExtensions.test(file.mimetype);
    if (ext || mime) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for high-res avatars
    fileFilter: fileFilter
});

// Helper to convert multer file or buffer to Base64 data URL
function convertFileToBase64(file) {
    if (!file) return null;
    if (file.buffer) {
        const mime = file.mimetype || 'image/jpeg';
        return `data:${mime};base64,${file.buffer.toString('base64')}`;
    }
    if (file.path && fs.existsSync(file.path)) {
        try {
            const buffer = fs.readFileSync(file.path);
            const mime = file.mimetype || 'image/jpeg';
            try { fs.unlinkSync(file.path); } catch (_) {}
            return `data:${mime};base64,${buffer.toString('base64')}`;
        } catch (_) {}
    }
    return null;
}

// Accept image upload under any standard form field (profile_picture, profilePhoto, avatar, file, etc.)
const handleProfileUpload = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        if (req.files && req.files.length > 0) {
            req.file = req.files[0];
        }
        next();
    });
};

/**
 * POST /api/upload/profile-picture
 * Converts avatar to Base64 string and saves directly to MySQL LONGTEXT columns
 * Never loses photos on Render restarts!
 */
async function uploadProfilePictureHandler(req, res) {
    try {
        const file = req.file || (req.files && req.files[0]);
        let base64Photo = convertFileToBase64(file);

        // Check if raw Base64 string was sent in JSON body
        if (!base64Photo && req.body) {
            const bodyImg = req.body.profile_picture || req.body.profile_photo || req.body.image || req.body.photo || req.body.avatar;
            if (typeof bodyImg === 'string' && bodyImg.trim().startsWith('data:image/')) {
                base64Photo = bodyImg.trim();
            }
        }

        if (!base64Photo) {
            return res.status(400).json({ success: false, message: 'No image file provided. Please select an image.' });
        }

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const userId = req.user.id;
        const userEmail = req.user.email;
        const userRole = req.user.role || 'job_seeker';

        // Update database according to user role
        if (userRole === 'employer') {
            await pool.query(
                `UPDATE employers 
                 SET profile_picture = ?, profile_photo = ?, profile_photo_url = ? 
                 WHERE id = ?`,
                [base64Photo, base64Photo, base64Photo, userId]
            ).catch(async () => {
                await pool.query(
                    'UPDATE employers SET profile_photo_url = ?, profile_picture = ? WHERE id = ?',
                    [base64Photo, base64Photo, userId]
                ).catch(() => {});
            });

            await pool.query(
                'UPDATE users SET profile_picture = ?, profile_photo = ? WHERE id = ? AND role = ?',
                [base64Photo, base64Photo, userId, 'employer']
            ).catch(() => {});
            if (userEmail) {
                await pool.query(
                    'UPDATE users SET profile_picture = ?, profile_photo = ? WHERE email = ? AND role = ?',
                    [base64Photo, base64Photo, userEmail, 'employer']
                ).catch(() => {});
            }
        } else if (userRole === 'job_seeker') {
            await pool.query(
                `UPDATE job_seekers 
                 SET profile_picture = ?, profile_photo = ?, profile_photo_url = ? 
                 WHERE id = ?`,
                [base64Photo, base64Photo, base64Photo, userId]
            ).catch(async () => {
                await pool.query(
                    'UPDATE job_seekers SET profile_photo_url = ?, profile_picture = ? WHERE id = ?',
                    [base64Photo, base64Photo, userId]
                ).catch(() => {});
            });

            await pool.query(
                'UPDATE users SET profile_picture = ?, profile_photo = ? WHERE id = ? AND role = ?',
                [base64Photo, base64Photo, userId, 'job_seeker']
            ).catch(() => {});
            if (userEmail) {
                await pool.query(
                    'UPDATE users SET profile_picture = ?, profile_photo = ? WHERE email = ? AND role = ?',
                    [base64Photo, base64Photo, userEmail, 'job_seeker']
                ).catch(() => {});
            }
        } else if (userRole === 'admin' || userRole === 'super_admin') {
            await pool.query(
                'UPDATE admins SET profile_photo = ? WHERE id = ?',
                [base64Photo, userId]
            ).catch(() => {});
            await pool.query(
                'UPDATE users SET profile_picture = ?, profile_photo = ? WHERE id = ? AND role = ?',
                [base64Photo, base64Photo, userId, userRole]
            ).catch(() => {});
        }

        // Fetch refreshed user record
        let updatedUser = {
            id: userId,
            email: userEmail,
            role: userRole,
            profile_picture: base64Photo,
            profile_photo: base64Photo,
            profile_photo_url: base64Photo
        };

        const [userRows] = await pool.query(
            'SELECT id, name, email, role, profile_picture, profile_photo FROM users WHERE (email = ? OR id = ?) AND role = ?',
            [userEmail || '', userId, userRole]
        ).catch(() => [[]]);
        if (userRows && userRows.length > 0) {
            updatedUser = {
                ...userRows[0],
                profile_picture: base64Photo,
                profile_photo: base64Photo,
                profile_photo_url: base64Photo
            };
        }

        return res.status(200).json({
            success: true,
            message: 'Profile picture uploaded successfully',
            profile_picture: base64Photo,
            profile_photo: base64Photo,
            profile_photo_url: base64Photo,
            photoUrl: base64Photo,
            url: base64Photo,
            user: updatedUser
        });
    } catch (error) {
        console.error('[Upload] Error uploading profile picture:', error);
        return res.status(500).json({ success: false, message: `Server error: ${error.message}` });
    }
}

/**
 * DELETE /api/upload/profile-picture
 * Resets user profile picture to default placeholder
 */
async function removeProfilePictureHandler(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const userId = req.user.id;
        const userEmail = req.user.email;
        const userRole = req.user.role || 'job_seeker';
        const defaultAvatar = '/uploads/default-avatar.png';

        if (userRole === 'employer') {
            await pool.query(
                'UPDATE employers SET profile_picture = NULL, profile_photo = ?, profile_photo_url = ? WHERE id = ?',
                [defaultAvatar, defaultAvatar, userId]
            ).catch(() => {});
            await pool.query(
                'UPDATE users SET profile_picture = NULL, profile_photo = ? WHERE id = ? AND role = ?',
                [defaultAvatar, userId, 'employer']
            ).catch(() => {});
            if (userEmail) {
                await pool.query(
                    'UPDATE users SET profile_picture = NULL, profile_photo = ? WHERE email = ? AND role = ?',
                    [defaultAvatar, userEmail, 'employer']
                ).catch(() => {});
            }
        } else if (userRole === 'job_seeker') {
            await pool.query(
                'UPDATE job_seekers SET profile_picture = NULL, profile_photo = ?, profile_photo_url = ? WHERE id = ?',
                [defaultAvatar, defaultAvatar, userId]
            ).catch(() => {});
            await pool.query(
                'UPDATE users SET profile_picture = NULL, profile_photo = ? WHERE id = ? AND role = ?',
                [defaultAvatar, userId, 'job_seeker']
            ).catch(() => {});
            if (userEmail) {
                await pool.query(
                    'UPDATE users SET profile_picture = NULL, profile_photo = ? WHERE email = ? AND role = ?',
                    [defaultAvatar, userEmail, 'job_seeker']
                ).catch(() => {});
            }
        } else if (userRole === 'admin' || userRole === 'super_admin') {
            await pool.query('UPDATE admins SET profile_photo = ? WHERE id = ?', [defaultAvatar, userId]).catch(() => {});
            await pool.query(
                'UPDATE users SET profile_picture = NULL, profile_photo = ? WHERE id = ? AND role = ?',
                [defaultAvatar, userId, userRole]
            ).catch(() => {});
        }

        return res.status(200).json({
            success: true,
            message: 'Profile photo removed successfully',
            profile_picture: null,
            profile_photo: defaultAvatar,
            profile_photo_url: defaultAvatar
        });
    } catch (error) {
        console.error('[Upload] Error removing profile picture:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

// Register both requested endpoints and aliases
router.post('/profile-picture', authenticateToken, handleProfileUpload, uploadProfilePictureHandler);
router.delete('/profile-picture', authenticateToken, removeProfilePictureHandler);

// Aliases
router.post('/profile-photo', authenticateToken, handleProfileUpload, uploadProfilePictureHandler);
router.delete('/profile-photo', authenticateToken, removeProfilePictureHandler);

module.exports = router;
