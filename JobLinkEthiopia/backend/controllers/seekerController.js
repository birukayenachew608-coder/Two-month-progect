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
