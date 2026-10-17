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

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production', { expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: admin.id, email: admin.email, role: admin.role, type: 'refresh', jti: crypto.randomBytes(16).toString('hex') }, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production', { expiresIn: '7d' });
        
        await pool.query('UPDATE admins SET refresh_token = ? WHERE id = ?', [refreshToken, admin.id]);

        // Set httpOnly secure cookie for access token (15m)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        // Set httpOnly secure cookie for refresh token (7d)
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            message: 'Login successful',
            token,
            accessToken: token,
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
            role: admin.role,
            email: admin.email
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production', { expiresIn: '15m' });
        const newRefreshToken = jwt.sign({ id: admin.id, email: admin.email, role: admin.role, type: 'refresh', jti: crypto.randomBytes(16).toString('hex') }, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production', { expiresIn: '7d' });
        
        // Invalidate old token and save new token in DB to prevent reuse
        await pool.query('UPDATE admins SET refresh_token = ? WHERE id = ?', [newRefreshToken, admin.id]);

        // Overwrite cookies
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        
        res.status(200).json({ 
            message: 'Token refreshed successfully',
            token,
            accessToken: token,
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
        const [[{ reportedJobs }]] = await pool.query("SELECT COUNT(DISTINCT id) as reportedJobs FROM (SELECT id FROM jobs WHERE status = 'flagged' OR (report_reason IS NOT NULL AND report_reason != '') UNION SELECT job_id as id FROM reports) as r");
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
            account_status, is_approved, created_at FROM employers`;
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
        const [empRows] = await pool.query('SELECT email FROM employers WHERE id = ?', [id]);
        if (empRows.length === 0) {
            return res.status(404).json({ message: 'Employer not found' });
        }
        const empEmail = empRows[0].email;

        const isApproved = (status === 'active' || status === 'approved') ? 1 : 0;
        const newStatus = (status === 'approved' || status === 'active') ? 'active' : (status === 'rejected' ? 'banned' : status);

        // Update employers table
        await pool.query('UPDATE employers SET account_status = ?, is_approved = ? WHERE id = ?', [newStatus, isApproved, id]);

        // CRITICAL (FR-12 & Section 6): Update is_approved field in users table
        await pool.query('UPDATE users SET is_approved = ? WHERE email = ?', [isApproved, empEmail]);

        res.status(200).json({ 
            message: `Employer ${isApproved ? 'approved' : 'rejected / banned'} successfully`,
            is_approved: Boolean(isApproved),
            account_status: newStatus
        });
    } catch (error) {
        console.error('Error updating employer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.approveEmployer = async (req, res) => {
    req.body = req.body || {};
    req.body.status = 'active';
    return exports.updateEmployerStatus(req, res);
};

exports.rejectEmployer = async (req, res) => {
    req.body = req.body || {};
    req.body.status = 'banned';
    return exports.updateEmployerStatus(req, res);
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
        let query = `
            SELECT 
                j.*, 
                COALESCE(r.id, j.id) AS report_id,
                COALESCE(r.reason, j.report_reason, 'Reported by user') AS report_reason 
            FROM jobs j
            LEFT JOIN (
                SELECT job_id, MAX(id) AS id, MAX(reason) AS reason
                FROM reports
                GROUP BY job_id
            ) r ON j.id = r.job_id
            WHERE (j.status = 'flagged' OR (j.report_reason IS NOT NULL AND j.report_reason != '') OR r.id IS NOT NULL)
        `;
        const queryParams = [];

        if (search) {
            query += ' AND (j.title LIKE ? OR j.company_name LIKE ? OR j.description LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY j.created_at DESC';

        const [jobs] = await pool.query(query, queryParams);
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching reported jobs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.dismissReport = async (req, res) => {
    const { id } = req.params;
    try {
        // Ensure reports table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                job_id INT NOT NULL,
                user_id INT NULL,
                reason TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_job_id (job_id),
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `).catch(() => {});

        // Check if id matches a report directly
        const [reports] = await pool.query('SELECT * FROM reports WHERE id = ?', [id]);
        let jobId = null;
        if (reports.length > 0) {
            jobId = reports[0].job_id;
            await pool.query('DELETE FROM reports WHERE id = ?', [id]);
        } else {
            // Assume id is job_id
            jobId = id;
            await pool.query('DELETE FROM reports WHERE job_id = ?', [id]);
        }

        // Unflag job and reset report_reason, keeping pending if payment is still pending
        if (jobId) {
            await pool.query("UPDATE jobs SET report_reason = NULL, status = CASE WHEN payment_status = 'pending' THEN 'pending' WHEN status = 'flagged' THEN 'active' ELSE status END WHERE id = ?", [jobId]);
            await pool.query('DELETE FROM reports WHERE job_id = ?', [jobId]);
        }
        await pool.query("UPDATE jobs SET report_reason = NULL, status = CASE WHEN payment_status = 'pending' THEN 'pending' WHEN status = 'flagged' THEN 'active' ELSE status END WHERE id = ?", [id]);

        res.status(200).json({ success: true, message: 'Report dismissed successfully' });
    } catch (error) {
        console.error('Error dismissing report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.sendMessageToEmployer = async (req, res) => {
    const { employerId, employer_id, jobId, job_id, subject, message } = req.body;
    let targetEmployerId = employerId || employer_id;
    const targetJobId = jobId || job_id || null;

    if (!message || message.trim().length === 0) {
        return res.status(400).json({ message: 'Message content is required.' });
    }

    try {
        // Ensure employer_messages table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS employer_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employer_id INT NOT NULL,
                job_id INT NULL,
                admin_id INT NULL,
                sender VARCHAR(100) DEFAULT 'System Admin',
                subject VARCHAR(255) DEFAULT 'Notice Regarding Job Listing',
                message TEXT NOT NULL,
                status ENUM('sent', 'read') DEFAULT 'sent',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_emp (employer_id),
                INDEX idx_job (job_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `).catch(() => {});

        let companyName = '';
        let contactEmail = '';

        if (!targetEmployerId && targetJobId) {
            const [jobRows] = await pool.query('SELECT employer_id, company_name, contact_email FROM jobs WHERE id = ?', [targetJobId]);
            if (jobRows.length > 0) {
                targetEmployerId = jobRows[0].employer_id;
                companyName = jobRows[0].company_name;
                contactEmail = jobRows[0].contact_email;
            }
        }

        if (targetEmployerId && (!companyName || !contactEmail)) {
            const [empRows] = await pool.query('SELECT company_name, email FROM employers WHERE id = ?', [targetEmployerId]);
            if (empRows.length > 0) {
                companyName = companyName || empRows[0].company_name;
                contactEmail = contactEmail || empRows[0].email;
            }
        }

        if (!targetEmployerId) {
            return res.status(400).json({ message: 'Target employer could not be identified.' });
        }

        const adminId = (req.user && req.user.id) ? req.user.id : null;
        const msgSubject = subject && subject.trim() ? subject.trim() : 'Warning / Notice regarding reported job post';

        const [insertResult] = await pool.query(
            'INSERT INTO employer_messages (employer_id, job_id, admin_id, subject, message) VALUES (?, ?, ?, ?, ?)',
            [targetEmployerId, targetJobId, adminId, msgSubject, message.trim()]
        );

        // Also insert into notifications table linked to employer_id
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employer_id INT NULL,
                user_id INT NULL,
                job_id INT NULL,
                type VARCHAR(50) DEFAULT 'admin_warning',
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_emp_notif (employer_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `).catch(() => {});

        await pool.query(
            'INSERT INTO notifications (employer_id, job_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
            [targetEmployerId, targetJobId, 'admin_warning', msgSubject, message.trim()]
        ).catch((err) => {
            console.warn('Note: insertion to notifications table skipped:', err.message);
        });

        res.status(200).json({
            success: true,
            message: 'Message sent to employer successfully',
            messageId: insertResult.insertId,
            employerId: targetEmployerId,
            companyName,
            contactEmail
        });
    } catch (error) {
        console.error('Error sending message to employer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateJobStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        if (status === 'active') {
            const [jobRows] = await pool.query('SELECT payment_status FROM jobs WHERE id = ?', [id]);
            if (jobRows.length > 0 && jobRows[0].payment_status === 'pending') {
                return res.status(400).json({ message: 'Cannot activate job. Payment of 300 ETB is pending and must be completed via Chapa.' });
            }
        }
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
        await pool.query('DELETE FROM reports WHERE job_id = ?', [id]).catch(() => {});
        await pool.query('DELETE FROM applications WHERE job_id = ?', [id]).catch(() => {});
        await pool.query('DELETE FROM saved_jobs WHERE job_id = ?', [id]).catch(() => {});
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
        sameSite: 'lax',
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
