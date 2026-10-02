const pool = require('../config/db');

exports.applyForJob = async (req, res) => {
    const { job_id, seeker_id } = req.body;

    if (!job_id || !seeker_id) {
        return res.status(400).json({ message: 'job_id and seeker_id are required' });
    }

    try {
        // Insert application with default status 'Pending'
        const [result] = await pool.query(
            "INSERT INTO applications (job_id, seeker_id, status) VALUES (?, ?, 'Pending')",
            [job_id, seeker_id]
        );
        res.status(201).json({ message: 'Application submitted successfully', applicationId: result.insertId, status: 'Pending' });
    } catch (error) {
        console.error('Error applying for job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getEmployerApplications = async (req, res) => {
    const { employerId } = req.params;

    try {
        const [applications] = await pool.query(
            `SELECT a.id, a.job_id, a.seeker_id, a.status, a.applied_at, 
                    u.name AS seeker_name, u.email AS seeker_email, u.resume_file_url,
                    j.title AS job_title
             FROM applications a
             JOIN job_seekers u ON a.seeker_id = u.id
             JOIN jobs j ON a.job_id = j.id
             WHERE j.employer_id = ?
             ORDER BY a.applied_at DESC`,
            [employerId]
        );
        res.status(200).json(applications);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getSeekerApplications = async (req, res) => {
    const { seekerId } = req.params;

    try {
        const [applications] = await pool.query(
            `SELECT a.id, a.job_id, a.seeker_id, a.status, a.applied_at, 
                    j.title AS job_title, j.company_name, j.location
             FROM applications a
             JOIN jobs j ON a.job_id = j.id
             WHERE a.seeker_id = ?
             ORDER BY a.applied_at DESC`,
            [seekerId]
        );
        res.status(200).json(applications);
    } catch (error) {
        console.error('Error fetching seeker applications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.withdrawApplication = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query('DELETE FROM applications WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }
        res.status(200).json({ message: 'Application withdrawn successfully' });
    } catch (error) {
        console.error('Error withdrawing application:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateApplicationStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'Status is required' });
    }

    try {
        // Lowercase the status to match the database ENUM ('pending', 'reviewed', 'rejected', 'hired', 'withdrawn')
        const [result] = await pool.query('UPDATE applications SET status = LOWER(?) WHERE id = ?', [status, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }
        res.status(200).json({ message: 'Application status updated successfully' });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
