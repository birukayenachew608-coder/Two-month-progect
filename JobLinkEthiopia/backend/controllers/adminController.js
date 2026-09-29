const pool = require('../config/db');

exports.getJobSeekers = async (req, res) => {
    try {
        const [seekers] = await pool.query(
            'SELECT id, name, email, created_at FROM job_seekers'
        );
        // Add role statically for the frontend to consume if it relies on it
        const formattedSeekers = seekers.map(s => ({ ...s, role: 'job_seeker' }));
        res.status(200).json(formattedSeekers);
    } catch (error) {
        console.error('Error fetching job seekers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteJobSeeker = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            'DELETE FROM job_seekers WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Job seeker not found' });
        }

        res.status(200).json({ message: 'Job seeker removed successfully' });
    } catch (error) {
        console.error('Error deleting job seeker:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
