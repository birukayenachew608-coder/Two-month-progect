const pool = require('../config/db');

/**
 * Job Alerts Controller
 * JobLink Ethiopia - Full-Stack Isolated Alert Management
 */

// POST /api/alerts - Saves a new alert preference for the authenticated seeker
exports.createAlert = async (req, res) => {
    try {
        const seeker_id = req.user ? req.user.id : req.body.seekerId;
        if (!seeker_id) {
            return res.status(401).json({ message: 'Authentication required. No seeker identified.' });
        }

        const job_sector = (req.body.job_sector || req.body.sector || 'Software & Tech').toString().trim().slice(0, 255);
        const location = req.body.location ? String(req.body.location).trim().slice(0, 255) : 'Addis Ababa';
        const frequency = req.body.frequency ? String(req.body.frequency).trim() : 'daily';

        const email_notification = req.body.email_notification !== undefined ? req.body.email_notification : true;
        const telegram_notification = req.body.telegram_notification !== undefined ? req.body.telegram_notification : true;
        const emailBool = email_notification === true || email_notification === 'true' || email_notification === 1 || email_notification === '1';
        const telegramBool = telegram_notification === true || telegram_notification === 'true' || telegram_notification === 1 || telegram_notification === '1';

        const [result] = await pool.query(
            `INSERT INTO job_alerts (seeker_id, job_sector, keyword, location, email_notification, telegram_notification, frequency)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [seeker_id, job_sector, job_sector, location, emailBool ? 1 : 0, telegramBool ? 1 : 0, frequency]
        );

        const newAlert = {
            id: result.insertId,
            seeker_id,
            job_sector,
            keyword: job_sector,
            location,
            email_notification: emailBool,
            telegram_notification: telegramBool,
            frequency,
            created_at: new Date()
        };

        res.status(201).json({
            message: 'Alert preferences saved successfully',
            alert: newAlert
        });
    } catch (error) {
        console.error('Error creating job alert:', error);
        res.status(500).json({ message: 'Internal server error while saving alert' });
    }
};

// GET /api/alerts - Fetches all active alerts for the authenticated seeker
exports.getAlerts = async (req, res) => {
    try {
        let seeker_id = req.user ? req.user.id : req.params.seekerId;
        if (!seeker_id) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const [alerts] = await pool.query(
            `SELECT id, seeker_id, job_sector, keyword, location, frequency, email_notification, telegram_notification, created_at
             FROM job_alerts
             WHERE seeker_id = ?
             ORDER BY created_at DESC`,
            [seeker_id]
        );

        // Normalize boolean values
        const normalized = alerts.map(a => ({
            ...a,
            job_sector: a.job_sector || a.keyword || 'Software & Tech',
            email_notification: Boolean(a.email_notification),
            telegram_notification: Boolean(a.telegram_notification)
        }));

        res.status(200).json(normalized);
    } catch (error) {
        console.error('Error fetching job alerts:', error);
        res.status(500).json({ message: 'Internal server error while fetching alerts' });
    }
};

// DELETE /api/alerts/:id - Deletes a specific alert
exports.deleteAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const seeker_id = req.user ? req.user.id : null;

        if (!id) {
            return res.status(400).json({ message: 'Alert ID is required' });
        }

        let query = 'DELETE FROM job_alerts WHERE id = ?';
        let params = [id];

        // If authenticated as seeker, ensure they can only delete their own alert
        if (seeker_id) {
            query += ' AND seeker_id = ?';
            params.push(seeker_id);
        }

        const [result] = await pool.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Alert not found or access denied' });
        }

        res.status(200).json({
            message: 'Alert deleted successfully',
            id: Number(id)
        });
    } catch (error) {
        console.error('Error deleting job alert:', error);
        res.status(500).json({ message: 'Internal server error while deleting alert' });
    }
};
