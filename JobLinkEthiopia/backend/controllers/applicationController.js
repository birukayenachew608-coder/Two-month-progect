const pool = require('../config/db');

exports.applyForJob = async (req, res) => {
    let { job_id, seeker_id, message, cover_letter } = req.body;
    if (req.user && req.user.role === 'job_seeker') {
        seeker_id = req.user.id;
    } else if (!seeker_id && req.user) {
        seeker_id = req.user.id;
    }

    if (!job_id || !seeker_id) {
        return res.status(400).json({ message: 'job_id and seeker_id are required' });
    }

    const applicationMessage = (message || cover_letter || '').trim() || null;

    try {
        const targetSeekerId = (req.user && req.user.id) || seeker_id;

        // Dynamically check the user's current status from the job_seekers table
        const [seekerRows] = await pool.query('SELECT account_status FROM job_seekers WHERE id = ?', [targetSeekerId]);
        if (seekerRows.length > 0 && String(seekerRows[0].account_status).toLowerCase() === 'banned') {
            return res.status(403).json({ message: 'Your account is banned. You cannot perform this action.' });
        }

        // Prevent duplicate applications
        const [existing] = await pool.query(
            "SELECT id FROM applications WHERE job_id = ? AND seeker_id = ?",
            [job_id, seeker_id]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'You have already submitted an application for this position.' });
        }

        // Insert application with message and default status 'pending'
        const [result] = await pool.query(
            "INSERT INTO applications (job_id, seeker_id, message, status) VALUES (?, ?, ?, 'pending')",
            [job_id, seeker_id, applicationMessage]
        );
        res.status(201).json({ 
            message: 'Application submitted successfully', 
            applicationId: result.insertId, 
            status: 'pending',
            messageContent: applicationMessage
        });
    } catch (error) {
        console.error('Error applying for job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getEmployerApplications = async (req, res) => {
    let { employerId } = req.params;
    if (req.user && req.user.role === 'employer') {
        if (employerId && Number(employerId) !== Number(req.user.id)) {
            return res.status(403).json({ message: 'Forbidden. You can only view applications for your own company.' });
        }
        employerId = req.user.id;
    }

    try {
        const [applications] = await pool.query(
            `SELECT a.id, a.job_id, a.seeker_id, a.status, a.applied_at, a.message,
                    u.name AS seeker_name, u.email AS seeker_email, u.resume_file_url,
                    u.github_url, u.linkedin_url, u.portfolio_url,
                    COALESCE(u.profile_photo, u.profile_photo_url, us.profile_photo) AS profile_photo,
                    COALESCE(u.profile_photo_url, u.profile_photo, us.profile_photo) AS profile_photo_url,
                    j.title AS job_title
             FROM applications a
             JOIN job_seekers u ON a.seeker_id = u.id
             LEFT JOIN users us ON (u.email = us.email AND us.role = 'job_seeker')
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
    let { seekerId } = req.params;
    if (req.user && req.user.role === 'job_seeker') {
        if (seekerId && Number(seekerId) !== Number(req.user.id)) {
            return res.status(403).json({ message: 'Forbidden. You can only view your own applications.' });
        }
        seekerId = req.user.id;
    }

    try {
        const [applications] = await pool.query(
            `SELECT a.id, a.job_id, a.seeker_id, a.status, a.applied_at, a.message,
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
        let query = 'DELETE FROM applications WHERE id = ?';
        let params = [id];
        if (req.user && req.user.role === 'job_seeker') {
            query += ' AND seeker_id = ?';
            params.push(req.user.id);
        }

        const [result] = await pool.query(query, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Application not found or unauthorized' });
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
        if (req.user && req.user.role === 'employer') {
            const [appCheck] = await pool.query(
                'SELECT a.id FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.id = ? AND j.employer_id = ?',
                [id, req.user.id]
            );
            if (appCheck.length === 0) {
                return res.status(403).json({ message: 'Forbidden. You do not have permission to manage this application.' });
            }
        }

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
