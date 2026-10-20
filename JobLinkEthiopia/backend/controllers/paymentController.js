const pool = require('../config/db');
const { initializePayment, verifyTransaction, verifyWebhookSignature } = require('../utils/chapa');
const { triggerJobAlertNotifications } = require('./jobController');

/**
 * Handle Chapa Webhook Notification
 * POST /api/payments/chapa-webhook
 * 
 * STRICT WEBHOOK DEPENDENCY:
 * A job's payment_status can ONLY be changed to 'paid' by this secure endpoint
 * after verifying a valid signature from Chapa.
 */
exports.handleChapaWebhook = async (req, res) => {
    try {
        console.log('[CHAPA WEBHOOK] Received webhook notification');
        const signature = req.headers['x-chapa-signature'] || req.headers['chapa-signature'];

        // Strict signature validation
        if (!signature) {
            console.warn('[CHAPA WEBHOOK] Rejected: Missing signature header');
            return res.status(401).json({ error: 'Missing Chapa webhook signature' });
        }

        const rawBody = req.rawBody || JSON.stringify(req.body);
        const isValid = verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
            console.warn('[CHAPA WEBHOOK] Rejected: Invalid HMAC signature detected.');
            return res.status(401).json({ error: 'Invalid Chapa signature' });
        }

        const payload = req.body || {};
        const data = payload.data || {};
        const tx_ref = payload.tx_ref || payload.trx_ref || data.tx_ref || data.trx_ref;
        const rawStatus = (payload.status || data.status || (payload.event === 'charge.success' ? 'success' : '')).toLowerCase();

        if (!tx_ref) {
            return res.status(400).json({ error: 'Missing tx_ref in webhook payload' });
        }

        // Verify transaction directly with Chapa API
        const verifyResult = await verifyTransaction(tx_ref);
        const isSuccess = rawStatus === 'success' && (verifyResult && verifyResult.verified);

        if (!isSuccess) {
            console.warn(`[CHAPA WEBHOOK] Transaction ${tx_ref} was not verified as successful by Chapa.`);
            await pool.query('UPDATE payments SET status = ? WHERE tx_ref = ?', ['failed', tx_ref]).catch(() => {});
            return res.status(200).json({ status: 'failed', message: 'Payment status not successful or unverified' });
        }

        // 1. Update payments record
        await pool.query(
            'UPDATE payments SET status = ?, chapa_response = ? WHERE tx_ref = ?',
            ['success', JSON.stringify(req.body), tx_ref]
        ).catch(err => console.error('Error updating payment record:', err.message));

        // 2. Locate the job via payment_reference or tx_ref pattern
        let [jobs] = await pool.query('SELECT * FROM jobs WHERE payment_reference = ?', [tx_ref]);

        if (jobs.length === 0 && tx_ref.startsWith('joblink-job-')) {
            const parts = tx_ref.split('-');
            const potentialJobId = parts[2];
            if (potentialJobId && !isNaN(potentialJobId)) {
                [jobs] = await pool.query('SELECT * FROM jobs WHERE id = ?', [potentialJobId]);
            }
        }

        if (jobs.length === 0) {
            console.warn(`[CHAPA WEBHOOK] No job found associated with tx_ref: ${tx_ref}`);
            return res.status(200).json({ status: 'success', message: 'Verified, but no matching job found.' });
        }

        const job = jobs[0];

        // 3. Strictly update job payment_status to 'paid' and status to 'active'
        await pool.query(
            "UPDATE jobs SET payment_status = 'paid', status = 'active', payment_reference = ? WHERE id = ?",
            [tx_ref, job.id]
        );

        // 4. Update employer free_jobs_posted count to ensure freemium state is in sync
        if (job.employer_id) {
            await pool.query(
                "UPDATE employers SET free_jobs_posted = GREATEST(COALESCE(free_jobs_posted, 0), 2) WHERE id = ?",
                [job.employer_id]
            ).catch(() => {});
        }

        console.log(`[CHAPA WEBHOOK] Successfully verified and activated Job #${job.id} ('${job.title}') with payment_status='paid'.`);

        // 5. Trigger background notifications for job alerts asynchronously
        if (typeof triggerJobAlertNotifications === 'function') {
            setImmediate(() => {
                triggerJobAlertNotifications(job).catch(err => {
                    console.error('[CHAPA WEBHOOK] Background job alert error:', err);
                });
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Transaction verified and job activated',
            jobId: job.id
        });
    } catch (err) {
        console.error('[CHAPA WEBHOOK] Error processing webhook:', err);
        return res.status(500).json({ error: 'Internal server error processing webhook' });
    }
};

/**
 * Initialize Chapa Checkout for an existing pending Job
 * POST /api/payments/initialize
 */
exports.initializePaymentEndpoint = async (req, res) => {
    try {
        const { jobId, payment_method } = req.body;
        if (!jobId) {
            return res.status(400).json({ error: 'jobId is required' });
        }

        const [jobs] = await pool.query('SELECT * FROM jobs WHERE id = ?', [jobId]);
        if (jobs.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const job = jobs[0];

        // Fetch employer profile
        const [empRows] = await pool.query('SELECT * FROM employers WHERE id = ?', [job.employer_id]);
        const employer = empRows[0] || {};

        const tx_ref = `joblink-job-${job.id}-${Date.now()}`;
        await pool.query('UPDATE jobs SET payment_reference = ? WHERE id = ?', [tx_ref, job.id]);

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const chapaResponse = await initializePayment({
            amount: 300,
            currency: 'ETB',
            email: employer.email || job.contact_email,
            firstName: employer.name ? employer.name.trim().split(/\s+/)[0] : 'Employer',
            lastName: employer.name && employer.name.trim().split(/\s+/).length > 1 ? employer.name.trim().split(/\s+/).slice(1).join(' ') : 'Name',
            tx_ref,
            baseUrl,
            jobId: job.id,
            payment_method: (payment_method && payment_method.toLowerCase()) || 'telebirr',
            callback_url: `${baseUrl}/api/payments/chapa-webhook`,
            return_url: `${baseUrl}/employer.html?payment=pending&job_id=${job.id}&tx_ref=${encodeURIComponent(tx_ref)}`,
            title: 'Job Post Fee',
            description: `Payment for job listing ${job.id}`.substring(0, 50)
        });

        if (!chapaResponse.success || !chapaResponse.checkout_url) {
            console.error('[CHAPA] Gateway error initializing transaction:', chapaResponse.error);
            return res.status(502).json({
                error: chapaResponse.error || 'Failed to initialize payment session with Chapa gateway'
            });
        }

        return res.status(200).json({
            success: true,
            checkout_url: chapaResponse.checkout_url,
            tx_ref,
            amount: 300,
            currency: 'ETB',
            payment_method: payment_method || 'telebirr',
            job_id: job.id
        });
    } catch (err) {
        console.error('Error in initializePaymentEndpoint:', err);
        return res.status(500).json({ error: err.message || 'Internal server error initializing payment' });
    }
};

/**
 * Handle Chapa Redirect Callback (GET from browser after returning from Chapa checkout)
 * GET /api/payments/chapa-callback
 * 
 * NOTE: This endpoint ONLY redirects the user back to employer dashboard.
 * It does NOT activate any job in the database.
 */
exports.handleChapaCallback = async (req, res) => {
    try {
        const tx_ref = req.query.tx_ref || req.query.trx_ref;
        const jobId = req.query.job_id || '';

        // Safely redirect back to dashboard in pending verification state; webhook handles activation
        return res.redirect(`/employer.html?payment=pending&tx_ref=${encodeURIComponent(tx_ref || '')}&job_id=${encodeURIComponent(jobId)}`);
    } catch (err) {
        console.error('Error in Chapa callback redirect:', err);
        return res.redirect('/employer.html?payment=error');
    }
};
