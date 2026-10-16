const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');

// Ensure destination directories exist
const publicProfilesDir = path.join(__dirname, '../public/uploads/profiles');
const backendProfilesDir = path.join(__dirname, '../uploads/profiles');

if (!fs.existsSync(publicProfilesDir)) {
    fs.mkdirSync(publicProfilesDir, { recursive: true });
}
if (!fs.existsSync(backendProfilesDir)) {
    fs.mkdirSync(backendProfilesDir, { recursive: true });
}

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, publicProfilesDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `profile-${uniqueSuffix}${ext}`);
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|gif|webp/;
    const ext = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedExtensions.test(file.mimetype);
    if (ext && mime) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

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
 * Uploads a new profile picture, stores in public/uploads/profiles/,
 * and updates job_seekers / employers / users tables.
 */
async function uploadProfilePictureHandler(req, res) {
    try {
        const file = req.file || (req.files && req.files[0]);
        if (!file) {
            return res.status(400).json({ success: false, message: 'No image file provided. Please select an image.' });
        }

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const userId = req.user.id;
        const userEmail = req.user.email;
        const userRole = req.user.role || 'job_seeker';

        // Publicly accessible relative path
        const relativeFilePath = `/uploads/profiles/${file.filename}`;

        // Mirror file to backend/uploads/profiles as well
        const mirrorFilePath = path.join(backendProfilesDir, file.filename);
        try {
            if (file.path && file.path !== mirrorFilePath) {
                fs.copyFileSync(file.path, mirrorFilePath);
            }
        } catch (copyErr) {
            console.warn('[Upload] Notice: Could not mirror upload file:', copyErr.message);
        }

        // Update database according to user role
        if (userRole === 'employer') {
            await pool.query(
                `UPDATE employers 
                 SET profile_picture = ?, profile_photo = ?, profile_photo_url = ? 
                 WHERE id = ?`,
                [relativeFilePath, relativeFilePath, relativeFilePath, userId]
            ).catch(async () => {
                await pool.query(
                    'UPDATE employers SET profile_photo_url = ? WHERE id = ?',
                    [relativeFilePath, userId]
                ).catch(() => {});
            });

            await pool.query(
                'UPDATE users SET profile_picture = ?, profile_photo = ? WHERE id = ? AND role = ?',
                [relativeFilePath, relativeFilePath, userId, 'employer']
            ).catch(() => {});
            if (userEmail) {
                await pool.query(
                    'UPDATE users SET profile_picture = ?, profile_photo = ? WHERE email = ? AND role = ?',
                    [relativeFilePath, relativeFilePath, userEmail, 'employer']
                ).catch(() => {});
            }
        } else if (userRole === 'job_seeker') {
            await pool.query(
                `UPDATE job_seekers 
                 SET profile_picture = ?, profile_photo = ?, profile_photo_url = ? 
                 WHERE id = ?`,
                [relativeFilePath, relativeFilePath, relativeFilePath, userId]
            ).catch(async () => {
                await pool.query(
                    'UPDATE job_seekers SET profile_photo_url = ? WHERE id = ?',
                    [relativeFilePath, userId]
                ).catch(() => {});
            });

            await pool.query(
                'UPDATE users SET profile_picture = ?, profile_photo = ? WHERE id = ? AND role = ?',
                [relativeFilePath, relativeFilePath, userId, 'job_seeker']
            ).catch(() => {});
            if (userEmail) {
                await pool.query(
                    'UPDATE users SET profile_picture = ?, profile_photo = ? WHERE email = ? AND role = ?',
                    [relativeFilePath, relativeFilePath, userEmail, 'job_seeker']
                ).catch(() => {});
            }
        } else if (userRole === 'admin' || userRole === 'super_admin') {
            await pool.query(
                'UPDATE admins SET profile_photo = ? WHERE id = ?',
                [relativeFilePath, userId]
            ).catch(() => {});
            await pool.query(
                'UPDATE users SET profile_picture = ?, profile_photo = ? WHERE id = ? AND role = ?',
                [relativeFilePath, relativeFilePath, userId, userRole]
            ).catch(() => {});
        }

        // Fetch refreshed user record
        let updatedUser = {
            id: userId,
            email: userEmail,
            role: userRole,
            profile_picture: relativeFilePath,
            profile_photo: relativeFilePath,
            profile_photo_url: relativeFilePath
        };

        const [userRows] = await pool.query(
            'SELECT id, name, email, role, profile_picture, profile_photo FROM users WHERE (email = ? OR id = ?) AND role = ?',
            [userEmail || '', userId, userRole]
        ).catch(() => [[]]);
        if (userRows.length > 0) {
            updatedUser = {
                ...userRows[0],
                profile_picture: relativeFilePath,
                profile_photo: relativeFilePath,
                profile_photo_url: relativeFilePath
            };
        }

        return res.status(200).json({
            success: true,
            message: 'Profile picture uploaded successfully',
            profile_picture: relativeFilePath,
            profile_photo: relativeFilePath,
            profile_photo_url: relativeFilePath,
            photoUrl: relativeFilePath,
            url: relativeFilePath,
            user: updatedUser
        });
    } catch (error) {
        console.error('[Upload] Error uploading profile picture:', error);
        return res.status(500).json({ success: false, message: `Server error: ${error.message}` });
    }
}

/**
 * DELETE /api/upload/profile-picture
 * Resets user profile picture to default placeholder and cleans up old upload
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

        // Find existing photo to optionally unlink custom upload
        let oldPhoto = null;
        if (userRole === 'employer') {
            const [rows] = await pool.query('SELECT profile_picture, profile_photo FROM employers WHERE id = ?', [userId]).catch(() => [[]]);
            if (rows.length > 0) oldPhoto = rows[0].profile_picture || rows[0].profile_photo;
        } else if (userRole === 'job_seeker') {
            const [rows] = await pool.query('SELECT profile_picture, profile_photo FROM job_seekers WHERE id = ?', [userId]).catch(() => [[]]);
            if (rows.length > 0) oldPhoto = rows[0].profile_picture || rows[0].profile_photo;
        }

        // Try to remove old custom file from disk if it's within uploads/profiles
        if (oldPhoto && typeof oldPhoto === 'string' && oldPhoto.includes('profiles/profile-')) {
            const baseFileName = path.basename(oldPhoto);
            const targetPub = path.join(publicProfilesDir, baseFileName);
            const targetBack = path.join(backendProfilesDir, baseFileName);
            try { if (fs.existsSync(targetPub)) fs.unlinkSync(targetPub); } catch (e) {}
            try { if (fs.existsSync(targetBack)) fs.unlinkSync(targetBack); } catch (e) {}
        }

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
