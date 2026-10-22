const pool = require('../config/db');

// Ensure notifications and employer_messages tables exist
async function ensureTables() {
    try {
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
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_emp (employer_id),
                INDEX idx_job (job_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Check if is_read column exists in employer_messages
        const [empMsgCols] = await pool.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employer_messages' AND COLUMN_NAME = 'is_read'
        `);
        if (empMsgCols.length === 0) {
            await pool.query("ALTER TABLE employer_messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE");
        }

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
        `);
    } catch (err) {
        console.error('Error ensuring notification tables:', err.message);
    }
}

ensureTables();

/**
 * GET /api/employer/messages or /api/employer/notifications
 * Fetch all notifications and admin warnings for the logged-in employer
 */
exports.getEmployerMessages = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'employer') {
            return res.status(403).json({ message: 'Access Denied: Employer authorization required to perform this action.' });
        }

        const employerId = req.user.id;
        await ensureTables();

        let [messages] = await pool.query(`
            SELECT 
                m.id,
                m.employer_id,
                m.job_id,
                m.admin_id,
                COALESCE(m.sender, 'System Admin') AS sender,
                COALESCE(m.subject, 'Notice Regarding Job Listing') AS subject,
                m.message,
                COALESCE(m.status, CASE WHEN m.is_read = 1 THEN 'read' ELSE 'sent' END) AS status,
                COALESCE(m.is_read, FALSE) AS is_read,
                m.created_at,
                j.title AS job_title,
                j.company_name
            FROM employer_messages m
            LEFT JOIN jobs j ON m.job_id = j.id
            WHERE m.employer_id = ?
            ORDER BY m.created_at DESC
        `, [employerId]);

        if (messages.length === 0) {
            try {
                const [notifs] = await pool.query(`
                    SELECT 
                        n.id,
                        n.employer_id,
                        n.job_id,
                        NULL AS admin_id,
                        'System Admin' AS sender,
                        COALESCE(n.title, 'Notice Regarding Job Listing') AS subject,
                        n.message,
                        CASE WHEN n.is_read = 1 THEN 'read' ELSE 'sent' END AS status,
                        COALESCE(n.is_read, FALSE) AS is_read,
                        n.created_at,
                        j.title AS job_title,
                        j.company_name
                    FROM notifications n
                    LEFT JOIN jobs j ON n.job_id = j.id
                    WHERE n.employer_id = ?
                    ORDER BY n.created_at DESC
                `, [employerId]);
                if (notifs.length > 0) {
                    messages = notifs;
                }
            } catch (err) {
                // Ignore if notifications table doesn't have these columns
            }
        }

        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching employer messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * PUT /api/employer/messages/:id/read
 * Mark a single message as read
 */
exports.markMessageAsRead = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'employer') {
            return res.status(403).json({ message: 'Access Denied: Employer authorization required to perform this action.' });
        }

        const employerId = req.user.id;
        const { id } = req.params;

        await pool.query(
            "UPDATE employer_messages SET status = 'read', is_read = TRUE WHERE id = ? AND employer_id = ?",
            [id, employerId]
        );

        await pool.query(
            "UPDATE notifications SET is_read = TRUE WHERE id = ? AND employer_id = ?",
            [id, employerId]
        ).catch(() => {});

        res.status(200).json({ success: true, message: 'Message marked as read' });
    } catch (error) {
        console.error('Error marking message read:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * PUT /api/employer/messages/read-all
 * Mark all messages as read for this employer
 */
exports.markAllMessagesAsRead = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'employer') {
            return res.status(403).json({ message: 'Access Denied: Employer authorization required to perform this action.' });
        }

        const employerId = req.user.id;

        await pool.query(
            "UPDATE employer_messages SET status = 'read', is_read = TRUE WHERE employer_id = ?",
            [employerId]
        );

        await pool.query(
            "UPDATE notifications SET is_read = TRUE WHERE employer_id = ?",
            [employerId]
        ).catch(() => {});

        res.status(200).json({ success: true, message: 'All messages marked as read' });
    } catch (error) {
        console.error('Error marking all messages read:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * DELETE /api/employer/messages/:id
 * Delete or dismiss a notification for the employer
 */
exports.deleteEmployerMessage = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'employer') {
            return res.status(403).json({ message: 'Access Denied: Employer authorization required to perform this action.' });
        }

        const employerId = req.user.id;
        const { id } = req.params;

        await pool.query(
            "DELETE FROM employer_messages WHERE id = ? AND employer_id = ?",
            [id, employerId]
        );

        await pool.query(
            "DELETE FROM notifications WHERE id = ? AND employer_id = ?",
            [id, employerId]
        ).catch(() => {});

        res.status(200).json({ success: true, message: 'Notification removed' });
    } catch (error) {
        console.error('Error deleting employer message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * GET /api/employer/:id or /api/employer/public/:id
 * Fetch public employer profile by ID with associated active job postings
 */
exports.getPublicEmployerProfile = async (req, res) => {
    const rawId = req.params.id || req.params.employerId;
    const id = Number(rawId);
    if (!rawId || isNaN(id) || id <= 0) {
        return res.status(400).json({ message: 'Invalid or missing employer ID.' });
    }
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

// Aliases for maximum compatibility
exports.getEmployerProfile = exports.getPublicEmployerProfile;
exports.getEmployerById = exports.getPublicEmployerProfile;

