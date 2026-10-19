const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

/**
 * Handle user profile photo upload
 * Updates the user's profile_photo in `users` and synchronizes with role tables
 */
exports.uploadProfilePhoto = async (req, res) => {
    try {
        const file = req.file || (req.files && req.files[0]);

        if (!file) {
            return res.status(400).json({ message: 'No image file uploaded. Please select an image.' });
        }

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const userId = req.user.id;
        const userEmail = req.user.email;
        const userRole = req.user.role || 'job_seeker';

        // Statically served path from root
        const relativeFilePath = `/uploads/${file.filename}`;

        // Ensure file is mirrored to backend/uploads as well for compatibility
        const mainUploadsPath = path.join(__dirname, '../uploads', file.filename);
        if (file.path && file.path !== mainUploadsPath) {
            try {
                fs.copyFileSync(file.path, mainUploadsPath);
            } catch (copyErr) {
                console.warn('Notice: Could not mirror upload to backend/uploads:', copyErr.message);
            }
        }

        // Strictly route update based on user role to prevent cross-contamination
        if (userRole === 'employer') {
            // 1. Update ONLY employers table
            await pool.query(
                'UPDATE employers SET profile_picture = ?, profile_photo = ?, profile_photo_url = ? WHERE id = ?',
                [relativeFilePath, relativeFilePath, relativeFilePath, userId]
            ).catch(async () => {
                await pool.query(
                    'UPDATE employers SET profile_photo_url = ?, profile_picture = ? WHERE id = ?',
                    [relativeFilePath, relativeFilePath, userId]
                ).catch(() => {});
            });

            // 2. In users table, strictly include AND role = 'employer'
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
            // 1. Update ONLY job_seekers table
            await pool.query(
                'UPDATE job_seekers SET profile_picture = ?, profile_photo = ?, profile_photo_url = ? WHERE id = ?',
                [relativeFilePath, relativeFilePath, relativeFilePath, userId]
            ).catch(async () => {
                await pool.query(
                    'UPDATE job_seekers SET profile_photo_url = ?, profile_picture = ? WHERE id = ?',
                    [relativeFilePath, relativeFilePath, userId]
                ).catch(() => {});
            });

            // 2. In users table, strictly include AND role = 'job_seeker'
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
            // Update admins table and users table with admin role
            await pool.query(
                'UPDATE admins SET profile_photo = ? WHERE id = ?',
                [relativeFilePath, userId]
            ).catch(() => {});
            await pool.query(
                'UPDATE users SET profile_picture = ?, profile_photo = ? WHERE id = ? AND role = ?',
                [relativeFilePath, relativeFilePath, userId, userRole]
            ).catch(() => {});
        }

        // Fetch updated user information strictly matching role
        let updatedUser = {
            id: userId,
            email: userEmail,
            role: userRole,
            profile_photo: relativeFilePath,
            profile_photo_url: relativeFilePath
        };

        const [userRows] = await pool.query(
            'SELECT id, name, email, role, profile_photo FROM users WHERE (email = ? OR id = ?) AND role = ?',
            [userEmail || '', userId, userRole]
        ).catch(() => [[]]);
        if (userRows.length > 0) {
            updatedUser = { ...userRows[0], profile_photo_url: userRows[0].profile_photo };
        }

        res.status(200).json({
            success: true,
            message: 'Profile photo uploaded successfully',
            profile_picture: relativeFilePath,
            profile_photo: relativeFilePath,
            profile_photo_url: relativeFilePath,
            photoUrl: relativeFilePath,
            url: relativeFilePath,
            user: updatedUser
        });
    } catch (error) {
        console.error('Error uploading profile photo:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

/**
 * Get current authenticated user's profile photo strictly respecting role
 */
exports.getProfilePhoto = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const userId = req.user.id;
        const userEmail = req.user.email;
        const userRole = req.user.role || 'job_seeker';
        let photo = null;

        if (userRole === 'employer') {
            const [employers] = await pool.query(
                'SELECT profile_photo, profile_photo_url FROM employers WHERE id = ? OR email = ?',
                [userId, userEmail || '']
            ).catch(() => [[]]);
            if (employers.length > 0) {
                photo = employers[0].profile_photo || employers[0].profile_photo_url;
            }
            if (!photo) {
                const [users] = await pool.query(
                    'SELECT profile_photo FROM users WHERE (id = ? OR email = ?) AND role = ?',
                    [userId, userEmail || '', 'employer']
                ).catch(() => [[]]);
                if (users.length > 0 && users[0].profile_photo) {
                    photo = users[0].profile_photo;
                }
            }
        } else if (userRole === 'job_seeker') {
            const [seekers] = await pool.query(
                'SELECT profile_photo, profile_photo_url FROM job_seekers WHERE id = ? OR email = ?',
                [userId, userEmail || '']
            ).catch(() => [[]]);
            if (seekers.length > 0) {
                photo = seekers[0].profile_photo || seekers[0].profile_photo_url;
            }
            if (!photo) {
                const [users] = await pool.query(
                    'SELECT profile_photo FROM users WHERE (id = ? OR email = ?) AND role = ?',
                    [userId, userEmail || '', 'job_seeker']
                ).catch(() => [[]]);
                if (users.length > 0 && users[0].profile_photo) {
                    photo = users[0].profile_photo;
                }
            }
        } else if (userRole === 'admin' || userRole === 'super_admin') {
            const [admins] = await pool.query(
                'SELECT profile_photo FROM admins WHERE id = ? OR email = ?',
                [userId, userEmail || '']
            ).catch(() => [[]]);
            if (admins.length > 0) {
                photo = admins[0].profile_photo;
            }
        }

        // Normalize path: absolute with leading slash or external URL
        if (photo && typeof photo === 'string') {
            photo = photo.trim();
            if (!photo.startsWith('http://') && !photo.startsWith('https://') && !photo.startsWith('/')) {
                photo = '/' + photo;
            }
        }

        const defaultAvatar = '/uploads/default-avatar.png';
        const finalPhoto = photo || defaultAvatar;
        res.status(200).json({
            profile_photo: finalPhoto,
            profile_photo_url: finalPhoto
        });
    } catch (error) {
        console.error('Error fetching profile photo:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Remove/reset user profile photo to default strictly respecting role
 */
exports.removeProfilePhoto = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const userId = req.user.id;
        const userEmail = req.user.email;
        const userRole = req.user.role || 'job_seeker';
        const defaultAvatar = '/uploads/default-avatar.png';

        if (userRole === 'employer') {
            await pool.query('UPDATE employers SET profile_picture = NULL, profile_photo = ?, profile_photo_url = ? WHERE id = ?', [defaultAvatar, defaultAvatar, userId]).catch(() => {});
            await pool.query('UPDATE users SET profile_picture = NULL, profile_photo = ? WHERE id = ? AND role = ?', [defaultAvatar, userId, 'employer']).catch(() => {});
            if (userEmail) {
                await pool.query('UPDATE users SET profile_picture = NULL, profile_photo = ? WHERE email = ? AND role = ?', [defaultAvatar, userEmail, 'employer']).catch(() => {});
            }
        } else if (userRole === 'job_seeker') {
            await pool.query('UPDATE job_seekers SET profile_picture = NULL, profile_photo = ?, profile_photo_url = ? WHERE id = ?', [defaultAvatar, defaultAvatar, userId]).catch(() => {});
            await pool.query('UPDATE users SET profile_picture = NULL, profile_photo = ? WHERE id = ? AND role = ?', [defaultAvatar, userId, 'job_seeker']).catch(() => {});
            if (userEmail) {
                await pool.query('UPDATE users SET profile_picture = NULL, profile_photo = ? WHERE email = ? AND role = ?', [defaultAvatar, userEmail, 'job_seeker']).catch(() => {});
            }
        } else if (userRole === 'admin' || userRole === 'super_admin') {
            await pool.query('UPDATE admins SET profile_photo = ? WHERE id = ?', [defaultAvatar, userId]).catch(() => {});
            await pool.query('UPDATE users SET profile_picture = NULL, profile_photo = ? WHERE id = ? AND role = ?', [defaultAvatar, userId, userRole]).catch(() => {});
        }

        res.status(200).json({
            success: true,
            message: 'Profile photo removed successfully',
            profile_picture: null,
            profile_photo: defaultAvatar,
            profile_photo_url: defaultAvatar
        });
    } catch (error) {
        console.error('Error removing profile photo:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Update authenticated user's profile details (flexible location support)
 */
exports.updateProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const userId = req.user.id;
        const userEmail = req.user.email;
        const userRole = req.user.role || 'job_seeker';

        const {
            name,
            contact_person,
            professional_title,
            phone,
            phone_number,
            location,
            headquarters_location,
            bio,
            about_company,
            company_name,
            github_url,
            linkedin_url,
            portfolio_url
        } = req.body;

        // Ensure location accepts any generic string (up to 255 chars)
        const rawLocation = (headquarters_location !== undefined && headquarters_location !== null)
            ? headquarters_location
            : location;
        let cleanLocation = null;
        if (rawLocation !== undefined && rawLocation !== null) {
            cleanLocation = String(rawLocation).trim().slice(0, 255);
        }

        const rawName = (contact_person !== undefined && contact_person !== null && String(contact_person).trim() !== '')
            ? contact_person
            : name;
        const cleanName = rawName ? String(rawName).trim().slice(0, 255) : null;
        const cleanTitle = professional_title ? String(professional_title).trim().slice(0, 255) : null;
        const cleanPhone = (phone || phone_number) ? String(phone || phone_number).trim().slice(0, 50) : null;
        
        const rawBio = (about_company !== undefined && about_company !== null)
            ? about_company
            : bio;
        const cleanBio = rawBio !== undefined && rawBio !== null ? String(rawBio).trim().slice(0, 5000) : null;
        const cleanCompany = company_name ? String(company_name).trim().slice(0, 255) : null;

        // Social profile links (for job seekers)
        const rawGithub = github_url !== undefined ? github_url : req.body.github;
        const rawLinkedin = linkedin_url !== undefined ? linkedin_url : req.body.linkedin;
        const rawPortfolio = portfolio_url !== undefined ? portfolio_url : (req.body.portfolio || req.body.portfolio_website || req.body.website);

        const cleanGithub = rawGithub !== undefined
            ? (rawGithub ? String(rawGithub).trim().slice(0, 255) : null)
            : undefined;
        const cleanLinkedin = rawLinkedin !== undefined
            ? (rawLinkedin ? String(rawLinkedin).trim().slice(0, 255) : null)
            : undefined;
        const cleanPortfolio = rawPortfolio !== undefined
            ? (rawPortfolio ? String(rawPortfolio).trim().slice(0, 255) : null)
            : undefined;

        if (userRole === 'job_seeker') {
            await pool.query(
                `UPDATE job_seekers SET
                    name = COALESCE(?, name),
                    professional_title = COALESCE(?, professional_title),
                    phone_number = COALESCE(?, phone_number),
                    location = ?,
                    bio = COALESCE(?, bio),
                    github_url = CASE WHEN ? = 1 THEN ? ELSE github_url END,
                    linkedin_url = CASE WHEN ? = 1 THEN ? ELSE linkedin_url END,
                    portfolio_url = CASE WHEN ? = 1 THEN ? ELSE portfolio_url END
                 WHERE id = ?`,
                [
                    cleanName,
                    cleanTitle,
                    cleanPhone,
                    cleanLocation,
                    cleanBio,
                    cleanGithub !== undefined ? 1 : 0, cleanGithub !== undefined ? cleanGithub : null,
                    cleanLinkedin !== undefined ? 1 : 0, cleanLinkedin !== undefined ? cleanLinkedin : null,
                    cleanPortfolio !== undefined ? 1 : 0, cleanPortfolio !== undefined ? cleanPortfolio : null,
                    userId
                ]
            );

            await pool.query(
                `UPDATE users SET
                    name = COALESCE(?, name),
                    location = ?
                 WHERE id = ? AND role = 'job_seeker'`,
                [cleanName, cleanLocation, userId]
            ).catch(() => {});
        } else if (userRole === 'employer') {
            await pool.query(
                `UPDATE employers SET
                    name = COALESCE(?, name),
                    contact_person = COALESCE(?, contact_person),
                    company_name = COALESCE(?, company_name),
                    phone_number = COALESCE(?, phone_number),
                    location = ?,
                    headquarters_location = ?,
                    about_company = ?,
                    bio = ?
                 WHERE id = ? OR email = ?`,
                [
                    cleanName,
                    cleanName,
                    cleanCompany,
                    cleanPhone,
                    cleanLocation,
                    cleanLocation,
                    cleanBio,
                    cleanBio,
                    userId,
                    userEmail || ''
                ]
            );

            await pool.query(
                `UPDATE users SET
                    name = COALESCE(?, name)
                 WHERE (id = ? OR email = ?) AND role = 'employer'`,
                [cleanName, userId, userEmail || '']
            ).catch(() => {});
        }

        // Fetch updated profile
        let updatedProfile = { id: userId, role: userRole, location: cleanLocation };
        if (userRole === 'job_seeker') {
            const [rows] = await pool.query(
                'SELECT id, name, email, phone_number as phone, location, profile_photo, profile_photo_url, professional_title, bio, github_url, linkedin_url, portfolio_url FROM job_seekers WHERE id = ?',
                [userId]
            );
            if (rows.length > 0) updatedProfile = { ...rows[0], role: 'job_seeker' };
        } else if (userRole === 'employer') {
            const [rows] = await pool.query(
                'SELECT id, name, name as contact_person, contact_person, company_name, email, phone_number as phone, phone_number, location, location as headquarters_location, headquarters_location, about_company, bio, profile_photo, profile_photo_url FROM employers WHERE id = ? OR email = ?',
                [userId, userEmail || '']
            );
            if (rows.length > 0) updatedProfile = { ...rows[0], role: 'employer' };
        }

        res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedProfile
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

/**
 * Fetch public employer profile by ID with associated active job postings
 */
exports.getPublicEmployerProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const [employers] = await pool.query(
            'SELECT id, name, contact_person, company_name, email, phone_number, location, headquarters_location, about_company, bio, profile_photo, profile_photo_url, account_status, created_at FROM employers WHERE id = ?',
            [id]
        );
        if (employers.length === 0) {
            return res.status(404).json({ message: 'Employer not found' });
        }
        const employer = employers[0];
        const [jobs] = await pool.query(
            "SELECT * FROM jobs WHERE employer_id = ? AND status = 'active' ORDER BY created_at DESC",
            [id]
        );
        employer.jobs = jobs;
        res.status(200).json(employer);
    } catch (error) {
        console.error('Error fetching public employer profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


