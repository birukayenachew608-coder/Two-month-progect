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
    const { seekerId } = req.params;
    try {
        const [rows] = await pool.query('SELECT resume_file_url FROM job_seekers WHERE id = ?', [seekerId]);
        res.status(200).json(rows[0] || {});
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.createAlert = async (req, res) => {
    const { seekerId, sector, location, notification } = req.body;
    try {
        await pool.query(
            'INSERT INTO job_alerts (seeker_id, keyword, location, frequency) VALUES (?, ?, ?, ?)',
            [seekerId, sector, location, notification]
        );
        res.status(201).json({ message: 'Alert created successfully' });
    } catch (error) {
        console.error('Error creating alert:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getAlerts = async (req, res) => {
    const { seekerId } = req.params;
    try {
        const [alerts] = await pool.query('SELECT * FROM job_alerts WHERE seeker_id = ? ORDER BY created_at DESC', [seekerId]);
        res.status(200).json(alerts);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteAlert = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM job_alerts WHERE id = ?', [id]);
        res.status(200).json({ message: 'Alert deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getProfile = async (req, res) => {
    const seekerId = req.params.id || req.params.seekerId;
    if (!seekerId) {
        return res.status(400).json({ message: 'Seeker ID is required' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT js.id, js.name, js.email, js.phone_number, js.location, 
                    js.professional_title, js.bio, js.resume_file_url, js.created_at,
                    COALESCE(js.profile_photo, js.profile_photo_url, us.profile_photo) AS profile_photo,
                    COALESCE(js.profile_photo_url, js.profile_photo, us.profile_photo) AS profile_photo_url
             FROM job_seekers js
             LEFT JOIN users us ON (js.email = us.email AND us.role = 'job_seeker')
             WHERE js.id = ?`, 
            [seekerId]
        );

        let seeker = null;
        if (rows.length > 0) {
            seeker = rows[0];
        } else {
            // Fallback to users table if not found in job_seekers
            const [userRows] = await pool.query(
                `SELECT id, name, email, NULL as phone_number, NULL as location,
                        NULL as professional_title, NULL as bio, NULL as resume_file_url, created_at,
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
            return res.status(404).json({ message: 'Seeker not found' });
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
        res.status(500).json({ message: 'Internal server error' });
    }
};
