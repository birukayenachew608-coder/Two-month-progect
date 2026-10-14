const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// Ensure 'profile_photo' column exists in admins table
pool.query(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admins' AND COLUMN_NAME = 'profile_photo'
`).then(([rows]) => {
    if (rows.length === 0) {
        return pool.query("ALTER TABLE admins ADD COLUMN profile_photo VARCHAR(500) DEFAULT NULL");
    }
}).catch(err => {
    console.error('Error verifying profile_photo column in admins table:', err.message);
});

exports.login = async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const [admins] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
        if (admins.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const admin = admins[0];
        
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const tempPayload = {
            id: admin.id,
            role: admin.role,
            is_temp: true
        };

        const tempAuthToken = jwt.sign(tempPayload, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '5m' });

        if (!admin.is_2fa_enabled || !admin.two_factor_secret) {
            return res.status(200).json({
                message: '2FA Setup required',
                requires2FASetup: true,
                tempAuthToken
            });
        }

        return res.status(200).json({
            message: '2FA required',
            requires2FA: true,
            tempAuthToken
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.setup2FA = async (req, res) => {
    try {
        // req.user comes from authenticateToken middleware
        const secret = speakeasy.generateSecret({ name: `JobLinkEthiopia Admin (${req.user.email})` });
        
        await pool.query('UPDATE admins SET two_factor_secret = ? WHERE id = ?', [secret.base32, req.user.id]);
        
        qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) {
                return res.status(500).json({ message: 'Error generating QR code' });
            }
            res.status(200).json({
                secret: secret.base32,
                qrCodeUrl: data_url
            });
        });
    } catch (error) {
        console.error('Setup 2FA error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.verify2FA = async (req, res) => {
    const { tempAuthToken, code } = req.body;
    
    if (!tempAuthToken || !code) {
        return res.status(400).json({ message: 'Token and code are required' });
    }
    
    try {
        const decoded = jwt.verify(tempAuthToken, process.env.JWT_SECRET || 'your_jwt_secret');
        if (!decoded.is_temp) {
            return res.status(400).json({ message: 'Invalid token type' });
        }
        
        const [admins] = await pool.query('SELECT * FROM admins WHERE id = ?', [decoded.id]);
        if (admins.length === 0) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        
        const admin = admins[0];
        
        if (!admin.two_factor_secret) {
            return res.status(400).json({ message: '2FA not setup for this admin' });
        }
        
        const verified = speakeasy.totp.verify({
            secret: admin.two_factor_secret,
            encoding: 'base32',
            token: code,
            window: 1
        });
        
        if (!verified) {
            return res.status(401).json({ message: 'Invalid verification code' });
        }
        
        // If it was the first time verifying, we should set is_2fa_enabled to true
        if (!admin.is_2fa_enabled) {
            await pool.query('UPDATE admins SET is_2fa_enabled = true WHERE id = ?', [admin.id]);
        }
        
        const payload = {
            id: admin.id,
            role: admin.role,
            email: admin.email
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '30m' });
        const refreshToken = crypto.randomBytes(64).toString('hex');
        
        await pool.query('UPDATE admins SET refresh_token = ? WHERE id = ?', [refreshToken, admin.id]);

        // Set httpOnly secure cookie for access token (30m)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 30 * 60 * 1000 // 30 minutes
        });

        // Set httpOnly secure cookie for refresh token (12h)
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 12 * 60 * 60 * 1000 // 12 hours
        });

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Verify 2FA error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ message: 'Temporary token expired' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.refresh = async (req, res) => {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
        return res.status(401).json({ message: 'No refresh token provided' });
    }
    
    try {
        const [admins] = await pool.query('SELECT * FROM admins WHERE refresh_token = ?', [refreshToken]);
        if (admins.length === 0) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }
        
        const admin = admins[0];
        const payload = {
            id: admin.id,
            role: admin.role
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '30m' });
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 30 * 60 * 1000 // 30 minutes
        });
        
        res.status(200).json({ 
            message: 'Token refreshed successfully',
            user: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const [[{ registeredEmployers }]] = await pool.query("SELECT COUNT(*) as registeredEmployers FROM employers WHERE account_status = 'pending_verification'");
        const [[{ reportedJobs }]] = await pool.query("SELECT COUNT(*) as reportedJobs FROM jobs WHERE status = 'flagged'");
        const [[{ activeJobs }]] = await pool.query("SELECT COUNT(*) as activeJobs FROM jobs WHERE status = 'active'");
        const [[{ verifiedEmployers }]] = await pool.query("SELECT COUNT(*) as verifiedEmployers FROM employers WHERE account_status = 'active'");

        const [[{ activeJobsThisWeek }]] = await pool.query("SELECT COUNT(*) as activeJobsThisWeek FROM jobs WHERE status = 'active' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
        const [[{ activeJobsLastWeek }]] = await pool.query("SELECT COUNT(*) as activeJobsLastWeek FROM jobs WHERE status = 'active' AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)");
        
        let activeJobsGrowth = 0;
        if (activeJobsLastWeek > 0) {
            activeJobsGrowth = Math.round(((activeJobsThisWeek - activeJobsLastWeek) / activeJobsLastWeek) * 100);
        } else if (activeJobsThisWeek > 0) {
            activeJobsGrowth = 100;
        }

        const [[{ newVerifiedEmployersToday }]] = await pool.query("SELECT COUNT(*) as newVerifiedEmployersToday FROM employers WHERE account_status = 'active' AND DATE(created_at) = CURDATE()");

        res.status(200).json({
            registeredEmployers,
            reportedJobs,
            activeJobs,
            verifiedEmployers,
            activeJobsGrowth,
            newVerifiedEmployersToday
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getEmployers = async (req, res) => {
    try {
        const { search } = req.query;
        let query = `SELECT id, name, company_name, email, phone_number as phone, location, 
            COALESCE(NULLIF(profile_photo_url, ''), NULLIF(profile_photo, ''), NULL) AS profile_photo,
            COALESCE(NULLIF(profile_photo_url, ''), NULLIF(profile_photo, ''), NULL) AS profile_photo_url,
            account_status, created_at FROM employers`;
        const queryParams = [];

        if (search) {
            query += ' WHERE name LIKE ? OR company_name LIKE ? OR email LIKE ?';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY created_at DESC';

        const [employers] = await pool.query(query, queryParams);
        res.status(200).json(employers);
    } catch (error) {
        console.error('Error fetching employers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateEmployerStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const [result] = await pool.query('UPDATE employers SET account_status = ? WHERE id = ?', [status, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Employer not found' });
        }
        res.status(200).json({ message: 'Employer status updated' });
    } catch (error) {
        console.error('Error updating employer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteEmployer = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM employers WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Employer not found' });
        }
        res.status(200).json({ message: 'Employer deleted successfully' });
    } catch (error) {
        console.error('Error deleting employer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getJobSeekers = async (req, res) => {
    try {
        const { search } = req.query;
        let query = `SELECT id, name, email, phone_number as phone, location, 
            COALESCE(NULLIF(profile_photo_url, ''), NULLIF(profile_photo, ''), NULL) AS profile_photo,
            COALESCE(NULLIF(profile_photo_url, ''), NULLIF(profile_photo, ''), NULL) AS profile_photo_url,
            professional_title, bio, resume_file_url, account_status, created_at FROM job_seekers`;
        const queryParams = [];

        if (search) {
            query += ' WHERE name LIKE ? OR email LIKE ? OR professional_title LIKE ?';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY created_at DESC';

        const [seekers] = await pool.query(query, queryParams);
        res.status(200).json(seekers);
    } catch (error) {
        console.error('Error fetching seekers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateSeekerStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const [result] = await pool.query('UPDATE job_seekers SET account_status = ? WHERE id = ?', [status, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Job seeker not found' });
        }
        res.status(200).json({ message: 'Job seeker status updated' });
    } catch (error) {
        console.error('Error updating seeker:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteJobSeeker = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM job_seekers WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Job seeker not found' });
        }
        res.status(200).json({ message: 'Job seeker removed successfully' });
    } catch (error) {
        console.error('Error deleting job seeker:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getReportedJobs = async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT * FROM jobs WHERE status = "flagged"';
        const queryParams = [];

        if (search) {
            query += ' AND (title LIKE ? OR company_name LIKE ? OR description LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC';

        const [jobs] = await pool.query(query, queryParams);
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching reported jobs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateJobStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const [result] = await pool.query('UPDATE jobs SET status = ? WHERE id = ?', [status, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Job not found' });
        }
        res.status(200).json({ message: 'Job status updated' });
    } catch (error) {
        console.error('Error updating job status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteJob = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM jobs WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Job not found' });
        }
        res.status(200).json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.verify = (req, res) => {
    // If the middleware authenticateToken passed, req.user exists
    if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    res.status(200).json({ user: req.user });
};

exports.logout = (req, res) => {
    // Clear cookies with the exact same options used when they were created
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

exports.getAdminProfile = async (req, res) => {
    try {
        if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const [rows] = await pool.query(
            'SELECT id, name, email, role, account_status, is_2fa_enabled, profile_photo, created_at FROM admins WHERE id = ?',
            [req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching admin profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateAdminProfile = async (req, res) => {
    try {
        if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { name, email, role, profile_photo } = req.body;
        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        // Validate and determine role
        let targetRole = req.user.role;
        if (role) {
            if (!['admin', 'super_admin'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role specified' });
            }
            targetRole = role;
        }

        if (profile_photo !== undefined) {
            await pool.query(
                'UPDATE admins SET name = ?, email = ?, role = ?, profile_photo = ? WHERE id = ?',
                [name.trim(), email.trim(), targetRole, profile_photo, req.user.id]
            );
        } else {
            await pool.query(
                'UPDATE admins SET name = ?, email = ?, role = ? WHERE id = ?',
                [name.trim(), email.trim(), targetRole, req.user.id]
            );
        }

        res.status(200).json({ 
            message: 'Profile updated successfully', 
            user: { 
                id: req.user.id, 
                name: name.trim(), 
                email: email.trim(), 
                role: targetRole,
                profile_photo: profile_photo !== undefined ? profile_photo : undefined
            } 
        });
    } catch (error) {
        console.error('Error updating admin profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.uploadProfilePhoto = async (req, res) => {
    try {
        if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded or invalid file format.' });
        }
        const fileUrl = `/uploads/${req.file.filename}`;
        await pool.query('UPDATE admins SET profile_photo = ? WHERE id = ?', [fileUrl, req.user.id]);

        res.status(200).json({
            message: 'Profile photo uploaded successfully',
            profile_photo: fileUrl,
            profile_photo_url: fileUrl,
            fileUrl,
            user: {
                id: req.user.id,
                role: req.user.role,
                profile_photo: fileUrl
            }
        });
    } catch (error) {
        console.error('Error uploading admin profile photo:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.removeProfilePhoto = async (req, res) => {
    try {
        if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        await pool.query('UPDATE admins SET profile_photo = NULL WHERE id = ?', [req.user.id]);
        res.status(200).json({
            message: 'Profile photo removed successfully',
            profile_photo: null
        });
    } catch (error) {
        console.error('Error removing admin profile photo:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.changeAdminPassword = async (req, res) => {
    try {
        if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!strongPasswordRegex.test(newPassword)) {
            return res.status(400).json({ 
                message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' 
            });
        }
        const [rows] = await pool.query('SELECT password FROM admins WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Admin not found' });
        
        const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }
        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE admins SET password = ? WHERE id = ?', [hashed, req.user.id]);
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing admin password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
