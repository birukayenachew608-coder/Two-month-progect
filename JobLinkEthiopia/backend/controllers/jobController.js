const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const reportController = require('./reportController');
const { initializePayment } = require('../utils/chapa');
const { sendJobAlertEmail } = require('../utils/email');

// Ensure 'views' column exists and status/payment_status ENUMs support 'pending'
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

pool.query(`
    ALTER TABLE jobs 
    MODIFY COLUMN status ENUM('active', 'inactive', 'closed', 'flagged', 'pending', 'pending_review') DEFAULT 'pending',
    MODIFY COLUMN payment_status ENUM('free', 'paid', 'pending', 'failed') DEFAULT 'free'
`).catch(err => {
    console.warn('Note on status/payment_status column migration:', err.message);
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

        const { title, location, deadline, description, job_type, salary, apply_email, apply_link, payment_method, sector, job_sector, category } = req.body;
        const resolvedSector = (sector || job_sector || category || '').trim() || 'Software & Tech';

        // Resolve company_name from body or employer profile
        const company_name = (req.body.company_name && req.body.company_name.trim()) || (employer.company_name && employer.company_name.trim()) || '';

        // Gracefully handle missing company name
        if (!company_name) {
            return res.status(400).json({ 
                message: 'Please enter your Company Name',
                field: 'job-company',
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

        // Validate individual required fields with specific, helpful error messages
        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Please enter the Job Title', field: 'job-title' });
        }
        if (!location || !location.trim()) {
            return res.status(400).json({ message: 'Please enter the Job Location', field: 'job-location' });
        }
        if (!deadline || !deadline.trim()) {
            return res.status(400).json({ message: 'Please select an application Deadline', field: 'job-deadline' });
        }
        if (!description || !description.trim()) {
            return res.status(400).json({ message: 'Please provide a Job Description', field: 'job-description' });
        }

        const inputDate = new Date(deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const maxDate = new Date(today);
        maxDate.setFullYear(maxDate.getFullYear() + 1);

        if (isNaN(inputDate.getTime())) {
            return res.status(400).json({ message: 'Invalid deadline format', field: 'job-deadline' });
        }
        if (inputDate < today) {
            return res.status(400).json({ message: 'Deadline cannot be in the past', field: 'job-deadline' });
        }
        if (inputDate > maxDate) {
            return res.status(400).json({ message: 'Deadline cannot be more than one year in the future', field: 'job-deadline' });
        }

        const contactEmail = apply_email || employer.email || '';
        const freeJobsPosted = Number(employer.free_jobs_posted) || 0;

        // Freemium check: First 2 posts are free. Any subsequent post requires 300 ETB via Chapa.
        if (freeJobsPosted < 2) {
            // Free job post
            let insertResult;
            try {
                [insertResult] = await pool.query(
                    `INSERT INTO jobs (employer_id, company_name, contact_email, title, description, job_type, sector, location, deadline, salary, apply_email, apply_link, status, payment_status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'free')`,
                    [
                        employer_id, 
                        company_name, 
                        contactEmail, 
                        title, 
                        description, 
                        job_type || 'Full-time', 
                        resolvedSector,
                        location, 
                        deadline, 
                        salary || null, 
                        apply_email || null, 
                        apply_link || null
                    ]
                );
            } catch (insErr) {
                // Fallback in case sector column was omitted
                [insertResult] = await pool.query(
                    `INSERT INTO jobs (employer_id, company_name, contact_email, title, description, job_type, location, deadline, salary, apply_email, apply_link, status, payment_status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'free')`,
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
            }

            const newJobId = insertResult.insertId;

            // Increment employer's free_jobs_posted count
            const updatedCount = freeJobsPosted + 1;
            await pool.query('UPDATE employers SET free_jobs_posted = ? WHERE id = ?', [updatedCount, employer_id]);

            // Construct full job object for asynchronous notification
            const fullJob = {
                id: newJobId,
                employer_id,
                company_name,
                contact_email: contactEmail,
                title,
                description,
                job_type: job_type || 'Full-time',
                sector: resolvedSector,
                location,
                deadline,
                salary: salary || null,
                apply_email: apply_email || null,
                apply_link: apply_link || null
            };

            // Trigger matching Job Alerts asynchronously in background via setImmediate
            // This guarantees the employer response is dispatched immediately without delay!
            setImmediate(() => {
                triggerJobAlertNotifications(fullJob).catch(err => {
                    console.error('[JobAlerts] Background error in triggerJobAlertNotifications:', err);
                });
            });

            return res.status(201).json({ 
                success: true,
                requires_payment: false,
                payment_required: false,
                message: 'Job created successfully', 
                job_id: newJobId,
                jobId: newJobId,
                payment_status: 'free',
                is_free: true,
                free_jobs_posted: updatedCount,
                free_jobs_remaining: Math.max(0, 2 - updatedCount)
            });
        } else {
            // STRICT ENFORCEMENT: If free_jobs_posted >= 2, the job MUST be saved with status = 'pending' and payment_status = 'pending'.
            // It is strictly invisible to job seekers.
            let result;
            try {
                [result] = await pool.query(
                    `INSERT INTO jobs (employer_id, company_name, contact_email, title, description, job_type, sector, location, deadline, salary, apply_email, apply_link, status, payment_status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
                    [
                        employer_id, 
                        company_name, 
                        contactEmail, 
                        title, 
                        description, 
                        job_type || 'Full-time', 
                        resolvedSector,
                        location, 
                        deadline, 
                        salary || null, 
                        apply_email || null, 
                        apply_link || null
                    ]
                );
            } catch (insErr) {
                [result] = await pool.query(
                    `INSERT INTO jobs (employer_id, company_name, contact_email, title, description, job_type, location, deadline, salary, apply_email, apply_link, status, payment_status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
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
            }

            const newJobId = result.insertId;

            // Generate unique transaction reference for tracking
            const tx_ref = `joblink-job-${newJobId}-${Date.now()}`;
            await pool.query('UPDATE jobs SET payment_reference = ? WHERE id = ?', [tx_ref, newJobId]);

            // Save pending payment record in payments table
            await pool.query(
                'INSERT INTO payments (employer_id, job_id, tx_ref, amount, currency, status) VALUES (?, ?, ?, 300.00, "ETB", "pending")',
                [employer_id, newJobId, tx_ref]
            ).catch(err => console.error('Error recording payment in DB:', err.message));

            // Return strictly requires_payment: true and job_id (NO success message that bypasses payment)
            return res.status(200).json({
                requires_payment: true,
                payment_required: true,
                job_id: newJobId,
                jobId: newJobId,
                payment_status: 'pending',
                status: 'pending',
                amount: 300,
                currency: 'ETB',
                tx_ref,
                free_jobs_posted: freeJobsPosted,
                free_jobs_remaining: 0,
                message: 'Payment of 300 ETB required via Chapa to activate this job.'
            });
        }
    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Asynchronously query matching job alerts by sector and location and send Brevo email notifications
 */
async function triggerJobAlertNotifications(job) {
    try {
        if (!job || !job.title) return;

        const jobTitle = String(job.title || '').trim();
        const jobTitleLower = jobTitle.toLowerCase();
        const jobDescLower = String(job.description || '').toLowerCase();
        const jobLoc = String(job.location || '').trim();
        const jobLocLower = jobLoc.toLowerCase();
        const jobSector = String(job.sector || job.job_sector || job.category || '').trim();
        const jobSectorLower = jobSector.toLowerCase();

        // 1. Query all active job alerts with email notifications enabled and valid seeker email
        const [alertRows] = await pool.query(`
            SELECT 
                ja.id AS alert_id,
                ja.job_sector,
                ja.keyword,
                ja.location AS alert_location,
                ja.frequency,
                COALESCE(NULLIF(TRIM(js.email), ''), NULLIF(TRIM(u.email), '')) AS recipient_email,
                COALESCE(NULLIF(TRIM(js.name), ''), NULLIF(TRIM(u.name), ''), 'Job Seeker') AS recipient_name
            FROM job_alerts ja
            LEFT JOIN job_seekers js ON (ja.job_seeker_id = js.id OR ja.seeker_id = js.id)
            LEFT JOIN users u ON ((ja.job_seeker_id = u.id OR ja.seeker_id = u.id) AND u.role = 'job_seeker')
            WHERE ja.email_notification = 1
        `).catch(err => {
            console.error('[JobAlerts] Error querying alerts from DB:', err.message);
            return [[]];
        });

        if (!alertRows || alertRows.length === 0) {
            console.log('[JobAlerts] No active email alerts registered in the database.');
            return;
        }

        // Sector keyword mappings for smart semantic matching
        const sectorKeywords = {
            'software & tech': ['tech', 'software', 'developer', 'engineer', 'programmer', 'frontend', 'backend', 'fullstack', 'full-stack', 'web', 'mobile', 'react', 'node', 'python', 'java', 'it ', 'devops', 'cloud', 'data', 'cyber', 'ai', 'computer', 'database', 'system'],
            'marketing': ['marketing', 'sales', 'seo', 'social media', 'content', 'advertis', 'brand', 'pr', 'copywriter', 'digital marketing', 'lead', 'promot'],
            'finance': ['finance', 'account', 'audit', 'bank', 'tax', 'bookkeeper', 'economist', 'invest', 'cashier', 'payroll'],
            'healthcare': ['health', 'nurse', 'doctor', 'medical', 'clinic', 'pharmacy', 'care', 'hospital', 'lab', 'dentist'],
            'education': ['teacher', 'education', 'tutor', 'instructor', 'school', 'academic', 'trainer', 'lecturer', 'professor'],
            'engineering': ['engineer', 'civil', 'mechanical', 'electrical', 'construction', 'architect', 'chemical', 'structural']
        };

        const matchingRecipients = new Map();

        for (const alert of alertRows) {
            const email = (alert.recipient_email || '').trim().toLowerCase();
            if (!email || !email.includes('@')) continue;

            const alertSector = (alert.job_sector || '').trim().toLowerCase();
            const alertLoc = (alert.alert_location || '').trim().toLowerCase();
            const alertKeyword = (alert.keyword || '').trim().toLowerCase();

            // --- A. Location Matching ---
            // Alert matches if:
            // 1. Alert location is not specified, or is 'all', 'any', or 'flexible'
            // 2. Alert is 'remote' and job is remote (in location or job_type)
            // 3. Job is 'remote' (suitable for any seeker)
            // 4. Alert location is contained in job location (e.g. 'Addis Ababa' in 'Addis Ababa, Bole')
            // 5. Job location is contained in alert location
            const isAlertRemote = alertLoc === 'remote' || alertLoc.includes('remote');
            const isJobRemote = jobLocLower.includes('remote') || (job.job_type && String(job.job_type).toLowerCase().includes('remote'));
            const isAnyLoc = !alertLoc || ['all', 'any', 'all locations', 'flexible', 'everywhere'].includes(alertLoc);

            const locationMatches = isAnyLoc ||
                (isAlertRemote && isJobRemote) ||
                (isJobRemote) ||
                (alertLoc && jobLocLower.includes(alertLoc)) ||
                (jobLocLower && alertLoc.includes(jobLocLower));

            if (!locationMatches) continue;

            // --- B. Sector Matching ---
            // Alert matches if:
            // 1. Alert sector is not specified or is 'all', 'any', or 'all sectors'
            // 2. Direct match with job's specified sector
            // 3. Alert sector text appears in job title or description
            // 4. Job title or description contains sector-specific synonyms
            // 5. Custom alert keyword appears in job title or description
            const isAnySector = !alertSector || ['all', 'any', 'all sectors', 'all categories'].includes(alertSector);
            let sectorMatches = isAnySector;

            if (!sectorMatches) {
                // Check direct sector equality/inclusion
                if (jobSectorLower && (jobSectorLower.includes(alertSector) || alertSector.includes(jobSectorLower))) {
                    sectorMatches = true;
                }
                // Check if alert sector string is directly in job title or description
                else if (jobTitleLower.includes(alertSector) || jobDescLower.includes(alertSector)) {
                    sectorMatches = true;
                }
                // Check sector keywords/synonyms
                else {
                    const synonyms = sectorKeywords[alertSector] || [];
                    if (synonyms.some(syn => jobTitleLower.includes(syn) || jobDescLower.includes(syn) || jobSectorLower.includes(syn))) {
                        sectorMatches = true;
                    }
                }
            }

            // Check custom keyword if present
            if (alertKeyword && alertKeyword !== alertSector && alertKeyword !== 'all') {
                if (jobTitleLower.includes(alertKeyword) || jobDescLower.includes(alertKeyword)) {
                    sectorMatches = true;
                }
            }

            if (sectorMatches) {
                if (!matchingRecipients.has(email)) {
                    matchingRecipients.set(email, {
                        email,
                        name: alert.recipient_name || 'Job Seeker',
                        alertId: alert.alert_id,
                        frequency: alert.frequency || 'instant'
                    });
                }
            }
        }

        const recipients = Array.from(matchingRecipients.values());
        console.log(`[JobAlerts] 🎯 Found ${recipients.length} subscriber(s) matching Job #${job.id || ''} ("${jobTitle}" at "${jobLoc}").`);

        if (recipients.length === 0) return;

        // Asynchronously send emails to each matching subscriber via Brevo
        for (const recipient of recipients) {
            try {
                await sendJobAlertEmail({
                    to: recipient.email,
                    recipientName: recipient.name,
                    job
                });
            } catch (err) {
                console.error(`[JobAlerts] Failed to send email to ${recipient.email}:`, err.message);
            }
        }

        console.log(`[JobAlerts] ✨ Finished processing job alert emails for ${recipients.length} subscriber(s).`);
    } catch (error) {
        console.error('[JobAlerts] Unexpected error in triggerJobAlertNotifications:', error);
    }
}

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
            WHERE (j.status = 'active' OR j.status = 'open') AND (j.payment_status = 'free' OR j.payment_status = 'paid')
        `;
        const params = [];

        const searchKeyword = req.query.search || req.query.keyword || req.query.title;
        if (searchKeyword && searchKeyword.trim()) {
            query += ' AND (j.title LIKE ? OR j.company_name LIKE ? OR j.description LIKE ?)';
            const term = `%${searchKeyword.trim()}%`;
            params.push(term, term, term);
        }

        const searchLocation = req.query.location;
        if (searchLocation && searchLocation.trim() && searchLocation.toLowerCase() !== 'any location' && searchLocation.toLowerCase() !== 'all') {
            query += ' AND j.location LIKE ?';
            params.push(`%${searchLocation.trim()}%`);
        }

        query += ' ORDER BY j.created_at DESC';

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

        const job = jobs[0];

        // Ensure pending unpaid jobs are invisible to seekers
        if (job.payment_status === 'pending') {
            const currentUserId = req.user?.id;
            const isOwner = currentUserId && (currentUserId === job.employer_id || currentUserId === job.company_id);
            const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');
            if (!isOwner && !isAdmin) {
                return res.status(404).json({ message: 'Job not found or pending payment activation.' });
            }
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
        // Basic recommendation: Return latest active and paid/free jobs that the user hasn't applied to.
        const [jobs] = await pool.query(`
            SELECT j.* 
            FROM jobs j 
            WHERE j.status = 'active' 
              AND (j.payment_status = 'free' OR j.payment_status = 'paid')
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

        // Fetch employer's free_jobs_posted
        const [empRows] = await pool.query('SELECT free_jobs_posted FROM employers WHERE id = ?', [employerId]);
        const freeJobsPosted = Number(empRows[0]?.free_jobs_posted) || 0;
        const freeJobsRemaining = Math.max(0, 2 - freeJobsPosted);

        res.status(200).json({
            activePostings,
            totalApplicants,
            totalJobViews,
            conversionRate,
            rawConversionRate,
            active_postings: activePostings,
            total_applicants: totalApplicants,
            total_job_views: totalJobViews,
            conversion_rate: conversionRate,
            free_jobs_posted: freeJobsPosted,
            free_jobs_remaining: freeJobsRemaining,
            free_jobs_limit: 2,
            price_per_job: 300,
            currency: 'ETB'
        });
    } catch (error) {
        console.error('Error fetching employer stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getFreemiumStatus = async (req, res) => {
    try {
        let employerId = req.user?.id || req.user?.employer_id;
        if (!employerId && req.query.employer_id) {
            employerId = req.query.employer_id;
        }
        if (!employerId) {
            return res.status(401).json({ message: 'Unauthorized. Employer ID missing.' });
        }

        const [empRows] = await pool.query('SELECT free_jobs_posted FROM employers WHERE id = ?', [employerId]);
        if (empRows.length === 0) {
            return res.status(404).json({ message: 'Employer not found' });
        }

        const freeJobsPosted = Number(empRows[0]?.free_jobs_posted) || 0;
        const freeJobsRemaining = Math.max(0, 2 - freeJobsPosted);

        res.status(200).json({
            free_jobs_posted: freeJobsPosted,
            free_jobs_limit: 2,
            free_jobs_remaining: freeJobsRemaining,
            price_per_job: 300,
            currency: 'ETB'
        });
    } catch (error) {
        console.error('Error fetching freemium status:', error);
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
    return reportController.createReport(req, res);
};

exports.withdrawJobReport = async (req, res) => {
    return reportController.deleteReport(req, res);
};

exports.getEmployerJobs = async (req, res) => {
    let employerId = req.user?.id || req.user?.employer_id;
    if (!employerId && req.params.employerId) {
        employerId = req.params.employerId;
    }
    if (!employerId && req.query.employer_id) {
        employerId = req.query.employer_id;
    }
    if (!employerId) {
        return res.status(401).json({ message: 'Unauthorized. Employer ID missing.' });
    }

    try {
        const [jobs] = await pool.query('SELECT * FROM jobs WHERE employer_id = ? ORDER BY created_at DESC', [employerId]);
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching employer jobs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.closeJob = async (req, res) => {
    const { id } = req.params;
    let employerId = req.user?.id || req.user?.employer_id;
    if (!employerId && req.body.employer_id) employerId = req.body.employer_id;

    try {
        const [jobCheck] = await pool.query('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [id, employerId]);
        if (jobCheck.length === 0) {
            return res.status(403).json({ message: 'Forbidden or job not found' });
        }

        // FR-7: Update status to 'closed'
        await pool.query("UPDATE jobs SET status = 'closed' WHERE id = ?", [id]);
        res.status(200).json({ message: 'Job posting closed successfully', status: 'closed', id: Number(id) });
    } catch (error) {
        console.error('Error closing job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateJob = async (req, res) => {
    const { id } = req.params;
    let employerId = req.user?.id || req.user?.employer_id;
    if (!employerId && req.body.employer_id) employerId = req.body.employer_id;

    try {
        const [jobCheck] = await pool.query('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [id, employerId]);
        if (jobCheck.length === 0) {
            return res.status(403).json({ message: 'Forbidden or job not found' });
        }

        const existingJob = jobCheck[0];

        // Handle quick status update (e.g. closing or reopening a job)
        if (req.body.status && Object.keys(req.body).length <= 2) {
            const newStatus = req.body.status;
            await pool.query('UPDATE jobs SET status = ? WHERE id = ?', [newStatus, id]);
            return res.status(200).json({ message: 'Job status updated successfully', status: newStatus });
        }

        const title = req.body.title !== undefined ? req.body.title : existingJob.title;
        const company_name = req.body.company_name !== undefined ? req.body.company_name : existingJob.company_name;
        const location = req.body.location !== undefined ? req.body.location : existingJob.location;
        const deadline = req.body.deadline !== undefined ? req.body.deadline : existingJob.deadline;
        const description = req.body.description !== undefined ? req.body.description : existingJob.description;
        const job_type = req.body.job_type !== undefined ? req.body.job_type : existingJob.job_type;
        const salary = req.body.salary !== undefined ? req.body.salary : existingJob.salary;
        const apply_email = req.body.apply_email !== undefined ? req.body.apply_email : existingJob.apply_email;
        const apply_link = req.body.apply_link !== undefined ? req.body.apply_link : existingJob.apply_link;
        const contact_email = req.body.contact_email !== undefined ? req.body.contact_email : (existingJob.contact_email || apply_email);
        const status = req.body.status !== undefined ? req.body.status : existingJob.status;

        await pool.query(
            'UPDATE jobs SET title = ?, company_name = ?, location = ?, deadline = ?, description = ?, job_type = ?, salary = ?, apply_email = ?, apply_link = ?, contact_email = ?, status = ? WHERE id = ?',
            [title, company_name, location, deadline, description, job_type || 'Full-time', salary || null, apply_email || null, apply_link || null, contact_email || '', status, id]
        );
        res.status(200).json({ message: 'Job updated successfully', status });
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteJob = async (req, res) => {
    const { id } = req.params;
    let employerId = req.user?.id || req.user?.employer_id;
    if (!employerId && req.body.employer_id) employerId = req.body.employer_id;

    try {
        const [jobCheck] = await pool.query('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [id, employerId]);
        if (jobCheck.length === 0) {
            return res.status(403).json({ message: 'Forbidden or job not found' });
        }

        // Clean up linked tables
        await pool.query('DELETE FROM reports WHERE job_id = ?', [id]).catch(() => {});
        await pool.query('DELETE FROM applications WHERE job_id = ?', [id]).catch(() => {});
        await pool.query('DELETE FROM saved_jobs WHERE job_id = ?', [id]).catch(() => {});
        await pool.query('DELETE FROM jobs WHERE id = ?', [id]);

        res.status(200).json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.triggerJobAlertNotifications = triggerJobAlertNotifications;

