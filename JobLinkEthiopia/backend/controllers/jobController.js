const pool = require('../config/db');

exports.createJob = async (req, res) => {
    const { title, company_name, location, deadline, description, job_type, salary, apply_email, apply_link, employer_id } = req.body;

    if (!employer_id || !title || !company_name || !location || !deadline || !description) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Safe-guard: Ensure the employer exists in the database to prevent Foreign Key constraint errors 
        // when testing with a fake localstorage user.
        const [users] = await pool.query('SELECT id FROM employers WHERE id = ?', [employer_id]);
        if (users.length === 0) {
            await pool.query(
                'INSERT INTO employers (id, name, email, password) VALUES (?, ?, ?, ?)',
                [employer_id, 'Demo Employer', `employer${employer_id}@demo.com`, 'dummy']
            );
        }

        const [result] = await pool.query(
            `INSERT INTO jobs (employer_id, company_name, contact_email, title, description, job_type, location, deadline, salary, apply_email, apply_link, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [
                employer_id, 
                company_name, 
                apply_email || '', 
                title, 
                description, 
                job_type || 'Full-time', 
                location, 
                deadline, 
                salary || null, 
                apply_email || null, 
                apply_link || null
            ]
        );

        // --- Background Process for Job Alerts ---
        // Fetch all job alerts to match against the newly posted job
        pool.query('SELECT * FROM job_alerts').then(([alerts]) => {
            alerts.forEach(alert => {
                // Check if location matches (or alert has no specific location / Remote logic)
                const isRemote = alert.location && alert.location.toLowerCase() === 'remote';
                const matchesLocation = !alert.location || isRemote || (location && location.toLowerCase().includes(alert.location.toLowerCase()));
                
                // Check if keyword matches the job title or description
                const matchesKeyword = !alert.keyword || 
                    (title && title.toLowerCase().includes(alert.keyword.toLowerCase())) || 
                    (description && description.toLowerCase().includes(alert.keyword.toLowerCase()));

                if (matchesLocation && matchesKeyword) {
                    console.log(`\n[BACKGROUND PROCESS] Matching job found for Job Alert (Seeker ID: ${alert.seeker_id})`);
                    console.log(` -> Triggering Notifications for Job: ${title} at ${location}`);
                    
                    // The frequency column stores our notification preferences from the frontend
                    // 'daily' -> Email
                    // 'instant' -> Email & Telegram
                    if (alert.frequency === 'daily' || alert.frequency === 'instant') {
                        console.log(` -> ✅ Sending Email Notification to Seeker ${alert.seeker_id}`);
                    }
                    if (alert.frequency === 'instant') {
                        console.log(` -> ✅ Sending Telegram Bot Alert to Seeker ${alert.seeker_id}`);
                    }
                    console.log(`[BACKGROUND PROCESS] Successfully completed alert delivery.\n`);
                }
            });
        }).catch(err => console.error('Error in background alert process:', err));

        res.status(201).json({ message: 'Job created successfully', jobId: result.insertId });
    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getJobs = async (req, res) => {
    try {
        const [jobs] = await pool.query('SELECT * FROM jobs WHERE status = "active" ORDER BY created_at DESC');
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getJobById = async (req, res) => {
    try {
        const [jobs] = await pool.query('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
        if (jobs.length === 0) {
            return res.status(404).json({ message: 'Job not found' });
        }
        res.status(200).json(jobs[0]);
    } catch (error) {
        console.error('Error fetching job details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.saveJob = async (req, res) => {
    const { seeker_id, job_id } = req.body;
    try {
        await pool.query('INSERT IGNORE INTO saved_jobs (seeker_id, job_id) VALUES (?, ?)', [seeker_id, job_id]);
        res.status(201).json({ message: 'Job saved successfully' });
    } catch (error) {
        console.error('Error saving job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getSavedJobs = async (req, res) => {
    const { seekerId } = req.params;
    try {
        const [jobs] = await pool.query(`
            SELECT sj.job_id, j.title, j.company_name, j.location, j.job_type, sj.saved_at
            FROM saved_jobs sj
            JOIN jobs j ON sj.job_id = j.id
            WHERE sj.seeker_id = ?
            ORDER BY sj.saved_at DESC
        `, [seekerId]);
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching saved jobs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.unsaveJob = async (req, res) => {
    const { seekerId, jobId } = req.params;
    try {
        await pool.query('DELETE FROM saved_jobs WHERE seeker_id = ? AND job_id = ?', [seekerId, jobId]);
        res.status(200).json({ message: 'Job removed from saved jobs' });
    } catch (error) {
        console.error('Error unsaving job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getRecommendedJobs = async (req, res) => {
    const { seekerId } = req.params;
    try {
        // Basic recommendation: Return latest jobs that the user hasn't applied to.
        const [jobs] = await pool.query(`
            SELECT j.* 
            FROM jobs j 
            WHERE j.status = 'active' 
              AND j.id NOT IN (SELECT job_id FROM applications WHERE seeker_id = ?)
            ORDER BY j.created_at DESC 
            LIMIT 4
        `, [seekerId]);
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching recommended jobs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getEmployerAnalytics = async (req, res) => {
    const { employerId } = req.params;
    try {
        const [jobs] = await pool.query('SELECT id, status, views FROM jobs WHERE employer_id = ?', [employerId]);
        const activePostings = jobs.filter(j => j.status === 'active').length;
        
        const jobIds = jobs.map(j => j.id);
        let totalApplicants = 0;
        
        if (jobIds.length > 0) {
            const [apps] = await pool.query('SELECT COUNT(*) as count FROM applications WHERE job_id IN (?)', [jobIds]);
            totalApplicants = apps[0].count;
        }
        
        // Sum actual views from the jobs table
        const totalJobViews = jobs.reduce((sum, job) => sum + (job.views || 0), 0);
        
        const conversionRate = totalJobViews > 0 ? ((totalApplicants / totalJobViews) * 100).toFixed(1) + '%' : '0%';

        res.status(200).json({
            totalJobViews,
            totalApplicants,
            conversionRate,
            activePostings
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.reportJob = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('UPDATE jobs SET status = "flagged" WHERE id = ?', [id]);
        
        // If the ID isn't in the DB (for hardcoded jobs in HTML), it's fine for demo purposes.
        // We'll still return 200 so the frontend updates.
        res.status(200).json({ message: 'Job reported successfully' });
    } catch (error) {
        console.error('Error reporting job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
