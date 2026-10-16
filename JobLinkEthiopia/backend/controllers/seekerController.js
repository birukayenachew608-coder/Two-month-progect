const pool = require('../config/db');

exports.uploadCV = async (req, res) => {
    const { seekerId } = req.body;
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded or invalid file format.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const filename = req.file.originalname;
    const size = req.file.size;
    try {
        await pool.query('UPDATE job_seekers SET resume_file_url = ? WHERE id = ?', [fileUrl, seekerId]);
        res.status(200).json({ message: 'CV uploaded successfully', fileUrl, filename, size });
    } catch (error) {
        console.error('Error uploading CV:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getCV = async (req, res) => {
    const seekerId = req.params.seekerId || req.params.id || (req.user && req.user.id);
    try {
        const [rows] = await pool.query('SELECT resume_file_url FROM job_seekers WHERE id = ?', [seekerId]);
        res.status(200).json(rows[0] || {});
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteCV = async (req, res) => {
    const seekerId = req.params.seekerId || req.params.id || (req.user && req.user.id) || req.body.seekerId;
    if (!seekerId) {
        return res.status(400).json({ message: 'Seeker ID is required' });
    }
    try {
        await pool.query('UPDATE job_seekers SET resume_file_url = NULL WHERE id = ?', [seekerId]);
        res.status(200).json({ success: true, message: 'CV deleted successfully' });
    } catch (error) {
        console.error('Error deleting CV:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const alertController = require('./alertController');
exports.createAlert = alertController.createAlert;
exports.getAlerts = alertController.getAlerts;
exports.deleteAlert = alertController.deleteAlert;

exports.getProfile = async (req, res) => {
    const rawId = req.params.id || req.params.seekerId;
    const seekerId = Number(rawId);
    if (!rawId || isNaN(seekerId) || seekerId <= 0) {
        return res.status(400).json({ message: 'Invalid or missing candidate ID.' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT js.id, js.name, js.email, js.phone_number, js.location, 
                    js.professional_title, js.bio, js.resume_file_url, js.created_at,
                    js.github_url, js.linkedin_url, js.portfolio_url,
                    COALESCE(js.profile_photo, js.profile_photo_url, us.profile_photo) AS profile_photo,
                    COALESCE(js.profile_photo_url, js.profile_photo, us.profile_photo) AS profile_photo_url
             FROM job_seekers js
             LEFT JOIN users us ON (js.email = us.email AND us.role = 'job_seeker')
             WHERE js.id = ? OR us.id = ?`, 
            [seekerId, seekerId]
        );

        let seeker = null;
        if (rows.length > 0) {
            seeker = rows[0];
        } else {
            // Fallback to users table if not found in job_seekers
            const [userRows] = await pool.query(
                `SELECT id, name, email, NULL as phone_number, NULL as location,
                        NULL as professional_title, NULL as bio, NULL as resume_file_url, created_at,
                        NULL as github_url, NULL as linkedin_url, NULL as portfolio_url,
                        profile_photo, profile_photo as profile_photo_url
                 FROM users 
                 WHERE id = ?`,
                [seekerId]
            );
            if (userRows.length > 0) {
                seeker = userRows[0];
            }
        }

        if (!seeker) {
            return res.status(404).json({ message: 'Candidate profile not found.' });
        }

        // Format profile photo URL
        let photo = seeker.profile_photo || seeker.profile_photo_url;
        if (photo && typeof photo === 'string') {
            photo = photo.trim();
            if (!photo.startsWith('http://') && !photo.startsWith('https://') && !photo.startsWith('/')) {
                photo = '/' + photo;
            }
        }
        const defaultAvatar = '/uploads/default-avatar.png';
        const finalPhoto = photo || defaultAvatar;

        // Format CV / resume file URL
        let cvFile = seeker.resume_file_url || null;
        if (cvFile && typeof cvFile === 'string') {
            cvFile = cvFile.trim();
            if (cvFile === '#' || cvFile === '') {
                cvFile = null;
            } else if (!cvFile.startsWith('http://') && !cvFile.startsWith('https://') && !cvFile.startsWith('/')) {
                cvFile = '/' + cvFile;
            }
        }

        const profileData = {
            id: seeker.id,
            // Full name
            full_name: seeker.name || '',
            name: seeker.name || '',
            // Professional title
            professional_title: seeker.professional_title || null,
            title: seeker.professional_title || null,
            // Email
            email: seeker.email || '',
            // Phone number
            phone_number: seeker.phone_number || null,
            phone: seeker.phone_number || null,
            // Location
            location: seeker.location || null,
            // About me
            about_me: seeker.bio || null,
            bio: seeker.bio || null,
            about: seeker.bio || null,
            // Social Links
            github_url: seeker.github_url || null,
            linkedin_url: seeker.linkedin_url || null,
            portfolio_url: seeker.portfolio_url || null,
            // Profile photo
            profile_photo: finalPhoto,
            profile_photo_url: finalPhoto,
            // CV file path/URL
            cv_file: cvFile,
            resume_file_url: cvFile,
            cv_url: cvFile,
            created_at: seeker.created_at
        };

        res.status(200).json(profileData);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: `Database error while fetching profile: ${error.message}` });
    }
};
