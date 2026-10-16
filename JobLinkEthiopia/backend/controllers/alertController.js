const pool = require('../config/db');

/**
 * Job Alerts Controller
 * JobLink Ethiopia - Full-Stack Isolated Alert Management
 */

// POST /api/alerts or /api/seeker/alerts - Saves a new or updates an existing alert preference
exports.createAlert = async (req, res) => {
    try {
        const seeker_id = req.user ? req.user.id : (req.body.seekerId || req.body.job_seeker_id || req.body.seeker_id);
        if (!seeker_id) {
            return res.status(401).json({ message: 'Authentication required. No seeker identified.' });
        }

        const job_sector = (req.body.job_sector || req.body.sector || req.body.Sector || 'Software & Tech').toString().trim().slice(0, 255);
        const location = (req.body.location || req.body.Location || 'Addis Ababa').toString().trim().slice(0, 255);
        const frequency = req.body.frequency ? String(req.body.frequency).trim() : 'daily';

        let emailBool = true;
        if (req.body.email_notification !== undefined) {
            emailBool = req.body.email_notification === true || req.body.email_notification === 'true' || req.body.email_notification === 1 || req.body.email_notification === '1';
        } else if (req.body.emailPreference !== undefined) {
            emailBool = req.body.emailPreference === true || req.body.emailPreference === 'true' || req.body.emailPreference === 1 || req.body.emailPreference === '1';
        } else if (req.body.email !== undefined) {
            emailBool = req.body.email === true || req.body.email === 'true' || req.body.email === 1 || req.body.email === '1';
        } else if (req.body.notification !== undefined) {
            emailBool = req.body.notification === true || req.body.notification === 'true' || req.body.notification === 1 || req.body.notification === '1';
        }

        const alertId = req.body.id || req.body.alertId || req.body.alert_id;
        let savedAlert = null;
        let isUpdate = false;

        // If explicit alert ID provided, update that alert
        if (alertId) {
            const [updateRes] = await pool.query(
                `UPDATE job_alerts
                 SET job_sector = ?, keyword = ?, location = ?, email_notification = ?, telegram_notification = 0, frequency = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND (job_seeker_id = ? OR seeker_id = ?)`,
                [job_sector, job_sector, location, emailBool ? 1 : 0, frequency, alertId, seeker_id, seeker_id]
            );
            if (updateRes.affectedRows > 0) {
                isUpdate = true;
                savedAlert = {
                    id: Number(alertId),
                    job_seeker_id: seeker_id,
                    seeker_id,
                    job_sector,
                    sector: job_sector,
                    location,
                    email_notification: emailBool,
                    frequency,
                    updated_at: new Date()
                };
            }
        }

        if (!savedAlert) {
            // Check if alert for this seeker and sector already exists (prevent duplicate sector alert for same user)
            const [existing] = await pool.query(
                `SELECT id FROM job_alerts 
                 WHERE (job_seeker_id = ? OR seeker_id = ?) AND job_sector = ? 
                 ORDER BY id DESC LIMIT 1`,
                [seeker_id, seeker_id, job_sector]
            );

            if (existing.length > 0) {
                const targetId = existing[0].id;
                await pool.query(
                    `UPDATE job_alerts
                     SET location = ?, email_notification = ?, telegram_notification = 0, frequency = ?, keyword = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [location, emailBool ? 1 : 0, frequency, job_sector, targetId]
                );
                isUpdate = true;
                savedAlert = {
                    id: targetId,
                    job_seeker_id: seeker_id,
                    seeker_id,
                    job_sector,
                    sector: job_sector,
                    location,
                    email_notification: emailBool,
                    frequency,
                    updated_at: new Date()
                };
            } else {
                const [result] = await pool.query(
                    `INSERT INTO job_alerts (job_seeker_id, seeker_id, job_sector, keyword, location, email_notification, telegram_notification, frequency)
                     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
                    [seeker_id, seeker_id, job_sector, job_sector, location, emailBool ? 1 : 0, frequency]
                );
                savedAlert = {
                    id: result.insertId,
                    job_seeker_id: seeker_id,
                    seeker_id,
                    job_sector,
                    sector: job_sector,
                    location,
                    email_notification: emailBool,
                    frequency,
                    created_at: new Date()
                };
            }
        }

        res.status(isUpdate ? 200 : 201).json({
            message: isUpdate ? 'Alert preferences updated successfully' : 'Alert preferences saved successfully',
            alert: savedAlert
        });
    } catch (error) {
        console.error('Error saving job alert:', error);
        res.status(500).json({ message: 'Internal server error while saving alert' });
    }
};

// GET /api/alerts or /api/seeker/alerts - Fetches all active alerts for the authenticated seeker
exports.getAlerts = async (req, res) => {
    try {
        let seeker_id = req.user ? req.user.id : (req.params.seekerId || req.query.seekerId);
        if (!seeker_id) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const [alerts] = await pool.query(
            `SELECT id, job_seeker_id, seeker_id, job_sector, keyword, location, frequency, email_notification, telegram_notification, created_at, updated_at
             FROM job_alerts
             WHERE job_seeker_id = ? OR seeker_id = ?
             ORDER BY created_at DESC`,
            [seeker_id, seeker_id]
        );

        // Normalize boolean values and aliases
        const normalized = alerts.map(a => ({
            ...a,
            job_seeker_id: a.job_seeker_id || a.seeker_id,
            seeker_id: a.seeker_id || a.job_seeker_id,
            job_sector: a.job_sector || a.keyword || 'Software & Tech',
            sector: a.job_sector || a.keyword || 'Software & Tech',
            location: a.location || 'Addis Ababa',
            email_notification: Boolean(a.email_notification),
            telegram_notification: Boolean(a.telegram_notification)
        }));

        res.status(200).json(normalized);
    } catch (error) {
        console.error('Error fetching job alerts:', error);
        res.status(500).json({ message: 'Internal server error while fetching alerts' });
    }
};

// DELETE /api/alerts/:id or /api/seeker/alerts/:id - Deletes a specific alert
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
        if (seeker_id && (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin'))) {
            query += ' AND (job_seeker_id = ? OR seeker_id = ?)';
            params.push(seeker_id, seeker_id);
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
