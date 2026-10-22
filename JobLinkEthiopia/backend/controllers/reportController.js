const pool = require('../config/db');
const jwt = require('jsonwebtoken');

function extractUserId(req) {
    if (req.user && req.user.id) return req.user.id;
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    if (req.cookies) {
        token = req.cookies.seeker_accessToken || req.cookies.employer_accessToken || req.cookies.token || token;
    }
    if (token && token !== 'seeker_secure_cookie' && token !== 'employer_secure_cookie') {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production');
            return decoded.id;
        } catch (e) {
            return null;
        }
    }
    return null;
}

exports.createReport = async (req, res) => {
    const jobId = req.body.jobId || req.body.job_id || req.params.jobId || req.params.id;
    const { reason } = req.body;
    const targetUserId = (req.user && req.user.id) || extractUserId(req) || req.body.seeker_id || req.body.userId;
    const userId = targetUserId ? Number(targetUserId) : null;

    if (!jobId) {
        return res.status(400).json({ message: 'Job ID is required' });
    }
    if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ message: 'Reason for report is required' });
    }

    try {
        if (targetUserId) {
            // Dynamically check the user's current status from the job_seekers table
            const [seekerRows] = await pool.query('SELECT account_status FROM job_seekers WHERE id = ?', [targetUserId]);
            if (seekerRows.length > 0 && String(seekerRows[0].account_status).toLowerCase() === 'banned') {
                return res.status(403).json({ message: 'Your account is banned. You cannot perform this action.' });
            }
        }

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

        // Log the report in the database.
        // NOTE: Does NOT set is_hidden or is_deleted flags, and does NOT change status to flagged.
        // The job post must remain visible on the user feed.
        const [result] = await pool.query(
            'INSERT INTO reports (job_id, user_id, reason) VALUES (?, ?, ?)',
            [jobId, userId, reason.trim()]
        );

        // Keep post visible in feed (status remains 'active')
        await pool.query(
            'UPDATE jobs SET report_reason = ? WHERE id = ?',
            [reason.trim(), jobId]
        ).catch(err => console.error('Error logging report_reason to job:', err));

        res.status(201).json({
            message: 'Job reported successfully',
            reportId: result.insertId,
            jobId: Number(jobId)
        });
    } catch (error) {
        console.error('Error submitting report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteReport = async (req, res) => {
    const jobId = req.params.jobId || req.params.id || req.body.jobId || req.body.job_id;
    const userId = extractUserId(req);

    if (!jobId) {
        return res.status(400).json({ message: 'Job ID is required' });
    }

    try {
        let query = 'DELETE FROM reports WHERE job_id = ?';
        const params = [jobId];

        if (userId) {
            query += ' AND (user_id = ? OR user_id IS NULL)';
            params.push(userId);
        }

        const [result] = await pool.query(query, params);

        // Check if any reports remain for this job
        const [remaining] = await pool.query('SELECT COUNT(*) as count FROM reports WHERE job_id = ?', [jobId]);
        if (remaining[0] && remaining[0].count === 0) {
            await pool.query("UPDATE jobs SET report_reason = NULL, status = CASE WHEN payment_status = 'pending' THEN 'pending' ELSE 'active' END WHERE id = ?", [jobId])
                .catch(err => console.error('Error clearing job report status:', err));
        }

        res.status(200).json({
            message: 'Report withdrawn successfully',
            jobId: Number(jobId),
            affectedRows: result.affectedRows
        });
    } catch (error) {
        console.error('Error withdrawing report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getUserReports = async (req, res) => {
    const userId = extractUserId(req);
    try {
        let reports = [];
        if (userId) {
            const [rows] = await pool.query('SELECT * FROM reports WHERE user_id = ?', [userId]);
            reports = rows;
        } else {
            const [rows] = await pool.query('SELECT * FROM reports ORDER BY created_at DESC LIMIT 50');
            reports = rows;
        }
        res.status(200).json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
