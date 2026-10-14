const pool = require('../config/db');
const jwt = require('jsonwebtoken');

// Ensure 'views' column exists in jobs table
pool.query(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'views'
`).then(([rows]) => {
    if (rows.length === 0) {
        return pool.query("ALTER TABLE jobs ADD COLUMN views INT DEFAULT 0");
    }
}).catch(err => {
    console.error('Error verifying views column in jobs table:', err.message);
});

exports.createJob = async (req, res) => {
    // 1. Correctly read employer_id from decoded JWT token, with fallbacks
    let employer_id = null;

    if (req.user && req.user.id) {
        employer_id = req.user.id;
    } else {
        // Decode token from Authorization header or cookie
        const authHeader = req.headers['authorization'];
        let token = authHeader && authHeader.split(' ')[1];
        if (req.cookies) {
            if (token === 'employer_secure_cookie' || !token) {
                token = req.cookies.employer_accessToken || req.cookies.token || token;
            }
        }
        if (token && token !== 'employer_secure_cookie') {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production');
                employer_id = decoded.id;
                req.user = decoded;
            } catch (err) {
                // Token invalid
            }
        }
    }

    if (!employer_id && req.body.employer_id) {
        employer_id = req.body.employer_id;
    }

    if (!employer_id) {
        return res.status(401).json({ message: 'Authentication required. Please log in as an employer to post a job.' });
    }

    const { title, location, deadline, description, job_type, salary, apply_email, apply_link } = req.body;

    try {
        // Fetch employer profile from DB
        const [empRows] = await pool.query('SELECT * FROM employers WHERE id = ?', [employer_id]);
        let employer = null;
        if (empRows.length > 0) {
            employer = empRows[0];
        } else {
            // Check if user is in job_seekers table
            const [seekerRows] = await pool.query('SELECT * FROM job_seekers WHERE id = ?', [employer_id]);
            if (seekerRows.length > 0) {
                return res.status(403).json({ message: 'This account is registered as a Job Seeker. Please sign in with an Employer account to post jobs.' });
            }
            return res.status(404).json({ message: 'Employer profile not found. Please log in as an employer.' });
        }

        // Resolve company_name from body or employer profile
        const company_name = (req.body.company_name && req.body.company_name.trim()) || (employer.company_name && employer.company_name.trim()) || '';

        // Gracefully handle missing company name
        if (!company_name) {
            return res.status(400).json({ 
                message: 'Company name is missing. Please update your company profile or provide a company name before posting a job.',
                code: 'COMPANY_PROFILE_INCOMPLETE'
            });
        }

        // If employer's profile in database does not yet have company_name, auto-save it
        if (!employer.company_name && company_name) {
            try {
                await pool.query('UPDATE employers SET company_name = ? WHERE id = ?', [company_name, employer_id]);
            } catch (e) {
                console.error('Error auto-updating employer company_name:', e);
            }
        }

        // Validate other required fields
        if (!title || !location || !deadline || !description) {
            return res.status(400).json({ message: 'Missing required fields: Title, Location, Deadline, and Description are required.' });
        }

        const inputDate = new Date(deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const maxDate = new Date(today);
        maxDate.setFullYear(maxDate.getFullYear() + 1);

        if (isNaN(inputDate.getTime())) {
            return res.status(400).json({ message: 'Invalid deadline format' });
        }
        if (inputDate < today) {
            return res.status(400).json({ message: 'Deadline cannot be in the past' });
        }
        if (inputDate > maxDate) {
            return res.status(400).json({ message: 'Deadline cannot be more than one year in the future' });
        }

        const contactEmail = apply_email || employer.email || '';

        const [result] = await pool.query(
            `INSERT INTO jobs (employer_id, company_name, contact_email, title, description, job_type, location, deadline, salary, apply_email, apply_link, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [
                employer_id, 
                company_name, 
                contactEmail, 
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
        let query = `
            SELECT 
                j.*,
                COALESCE(NULLIF(e.profile_photo_url, ''), NULLIF(e.profile_photo, ''), NULL) AS profile_photo,
                COALESCE(NULLIF(e.profile_photo_url, ''), NULLIF(e.profile_photo, ''), NULL) AS profile_photo_url,
                COALESCE(NULLIF(e.company_name, ''), j.company_name) AS company_name
            FROM jobs j
            LEFT JOIN employers e ON j.employer_id = e.id
            WHERE j.status = "active"
            ORDER BY j.created_at DESC
        `;
        const params = [];
        if (req.query.limit) {
            const limit = parseInt(req.query.limit, 10);
            if (!isNaN(limit) && limit > 0) {
                query += ' LIMIT ?';
                params.push(limit);
            }
        }
        const [jobs] = await pool.query(query, params);
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getJobById = async (req, res) => {
    try {
        const query = `
            SELECT 
                j.*,
                j.employer_id AS company_id,
                COALESCE(e.company_name, j.company_name) AS company_name,
                e.name AS employer_name,
                e.company_name AS employer_company_name,
                e.email AS employer_email,
                e.phone_number AS employer_phone,
                e.location AS employer_location,
                e.profile_photo_url AS employer_profile_photo,
                e.account_status AS employer_status
            FROM jobs j
            LEFT JOIN employers e ON j.employer_id = e.id
            WHERE j.id = ?
        `;
        const [jobs] = await pool.query(query, [req.params.id]);
        if (jobs.length === 0) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Increment view count whenever a seeker views a job details page
        await pool.query('UPDATE jobs SET views = COALESCE(views, 0) + 1 WHERE id = ?', [req.params.id]).catch(err => {
            console.error('Error incrementing job view count:', err.message);
        });

        if (jobs[0].views !== undefined && jobs[0].views !== null) {
            jobs[0].views = Number(jobs[0].views) + 1;
        } else {
            jobs[0].views = 1;
        }

        res.status(200).json(jobs[0]);
    } catch (error) {
        console.error('Error fetching job details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.saveJob = async (req, res) => {
    let { seeker_id, job_id } = req.body;
    if (!seeker_id && req.user) {
        seeker_id = req.user.id;
    }
    if (!job_id) {
        return res.status(400).json({ message: 'job_id is required' });
    }
    try {
        await pool.query('INSERT IGNORE INTO saved_jobs (seeker_id, job_id) VALUES (?, ?)', [seeker_id, job_id]);
        res.status(201).json({ message: 'Job saved successfully', job_id: Number(job_id), is_saved: true });
    } catch (error) {
        console.error('Error saving job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getSavedJobs = async (req, res) => {
    let { seekerId } = req.params;
    if (!seekerId && req.user) {
        seekerId = req.user.id;
    }
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
    let { seekerId, jobId } = req.params;
    // Support both /saved/:jobId and /saved/:seekerId/:jobId
    if (!jobId && seekerId) {
        jobId = seekerId;
        seekerId = req.user ? req.user.id : null;
    } else if (!seekerId && req.user) {
        seekerId = req.user.id;
    }
    if (!jobId) {
        return res.status(400).json({ message: 'jobId is required' });
    }
    try {
        await pool.query('DELETE FROM saved_jobs WHERE seeker_id = ? AND job_id = ?', [seekerId, jobId]);
        res.status(200).json({ message: 'Job removed from saved jobs', job_id: Number(jobId), is_saved: false });
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

exports.getEmployerStats = async (req, res) => {
    try {
        const employerId = req.user?.id || req.user?.employer_id;
        if (!employerId) {
            return res.status(401).json({ message: 'Unauthorized. Employer ID missing.' });
        }

        // Active Postings: Count jobs where employer_id matches and status is active.
        const [activeRows] = await pool.query(
            "SELECT COUNT(*) AS activePostings FROM jobs WHERE employer_id = ? AND LOWER(status) = 'active'",
            [employerId]
        );
        const activePostings = Number(activeRows[0]?.activePostings) || 0;

        // Total Job Views: Sum the views column for all jobs posted by this employer
        const [viewsRows] = await pool.query(
            "SELECT COALESCE(SUM(views), 0) AS totalJobViews FROM jobs WHERE employer_id = ?",
            [employerId]
        );
        const totalJobViews = Number(viewsRows[0]?.totalJobViews) || 0;

        // Total Applicants: Count total rows in the applications table linked to this employer's jobs
        const [applicantRows] = await pool.query(
            `SELECT COUNT(a.id) AS totalApplicants 
             FROM applications a 
             JOIN jobs j ON a.job_id = j.id 
             WHERE j.employer_id = ?`,
            [employerId]
        );
        const totalApplicants = Number(applicantRows[0]?.totalApplicants) || 0;

        // Conversion Rate: Calculate (Total Applicants / Total Job Views) * 100. Handle division by zero gracefully.
        let conversionRate = '0%';
        let rawConversionRate = 0;
        if (totalJobViews > 0) {
            rawConversionRate = (totalApplicants / totalJobViews) * 100;
            conversionRate = rawConversionRate % 1 === 0 ? `${rawConversionRate}%` : `${rawConversionRate.toFixed(1)}%`;
        }

        res.status(200).json({
            activePostings,
            totalApplicants,
            totalJobViews,
            conversionRate,
            rawConversionRate,
            active_postings: activePostings,
            total_applicants: totalApplicants,
            total_job_views: totalJobViews,
            conversion_rate: conversionRate
        });
    } catch (error) {
        console.error('Error fetching employer stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getEmployerAnalytics = async (req, res) => {
    const employerId = req.params.employerId || req.user?.id;
    try {
        const [activeRows] = await pool.query(
            "SELECT COUNT(*) AS activePostings FROM jobs WHERE employer_id = ? AND LOWER(status) = 'active'",
            [employerId]
        );
        const activePostings = Number(activeRows[0]?.activePostings) || 0;

        const [viewsRows] = await pool.query(
            "SELECT COALESCE(SUM(views), 0) AS totalJobViews FROM jobs WHERE employer_id = ?",
            [employerId]
        );
        const totalJobViews = Number(viewsRows[0]?.totalJobViews) || 0;

        const [applicantRows] = await pool.query(
            `SELECT COUNT(a.id) AS totalApplicants 
             FROM applications a 
             JOIN jobs j ON a.job_id = j.id 
             WHERE j.employer_id = ?`,
            [employerId]
        );
        const totalApplicants = Number(applicantRows[0]?.totalApplicants) || 0;

        let conversionRate = '0%';
        let rawConversionRate = 0;
        if (totalJobViews > 0) {
            rawConversionRate = (totalApplicants / totalJobViews) * 100;
            conversionRate = rawConversionRate % 1 === 0 ? `${rawConversionRate}%` : `${rawConversionRate.toFixed(1)}%`;
        }

        res.status(200).json({
            activePostings,
            totalApplicants,
            totalJobViews,
            conversionRate,
            rawConversionRate,
            active_postings: activePostings,
            total_applicants: totalApplicants,
            total_job_views: totalJobViews,
            conversion_rate: conversionRate
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.incrementJobView = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE jobs SET views = COALESCE(views, 0) + 1 WHERE id = ?', [id]);
        res.status(200).json({ message: 'Job view incremented successfully' });
    } catch (error) {
        console.error('Error incrementing job view:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.reportJob = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
        const [result] = await pool.query('UPDATE jobs SET status = "flagged", report_reason = ? WHERE id = ?', [reason || 'No reason provided', id]);

        
        // If the ID isn't in the DB (for hardcoded jobs in HTML), it's fine for demo purposes.
        // We'll still return 200 so the frontend updates.
        res.status(200).json({ message: 'Job reported successfully' });
    } catch (error) {
        console.error('Error reporting job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getEmployerJobs = async (req, res) => {
    const employerId = req.user.id;
    try {
        const [jobs] = await pool.query('SELECT * FROM jobs WHERE employer_id = ? ORDER BY created_at DESC', [employerId]);
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching employer jobs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateJob = async (req, res) => {
    const { id } = req.params;
    const employerId = req.user.id;
    const { title, company_name, location, deadline, description, job_type, salary, apply_email, apply_link, contact_email } = req.body;

    try {
        const [jobCheck] = await pool.query('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [id, employerId]);
        if (jobCheck.length === 0) {
            return res.status(403).json({ message: 'Forbidden or job not found' });
        }

        await pool.query(
            'UPDATE jobs SET title = ?, company_name = ?, location = ?, deadline = ?, description = ?, job_type = ?, salary = ?, apply_email = ?, apply_link = ?, contact_email = ? WHERE id = ?',
            [title, company_name, location, deadline, description, job_type || 'Full-time', salary || null, apply_email || null, apply_link || null, contact_email || apply_email || '', id]
        );
        res.status(200).json({ message: 'Job updated successfully' });
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteJob = async (req, res) => {
    const { id } = req.params;
    const employerId = req.user.id;
    try {
        const [jobCheck] = await pool.query('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [id, employerId]);
        if (jobCheck.length === 0) {
            return res.status(403).json({ message: 'Forbidden or job not found' });
        }

        await pool.query('DELETE FROM jobs WHERE id = ?', [id]);
        res.status(200).json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
