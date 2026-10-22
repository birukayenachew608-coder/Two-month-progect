const pool = require('./config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_change_me_in_production';
const BASE_URL = 'http://localhost:3000';

async function runFreemiumTests() {
    console.log('=== STARTING FREEMIUM & CHAPA PAYMENT TESTS ===\n');
    let testEmployerId = null;
    let createdJobIds = [];

    try {
        // 1. Setup Test Employer
        const testEmail = `freemium_test_${Date.now()}@joblink.et`;
        const [empResult] = await pool.query(
            "INSERT INTO employers (name, email, password, company_name, free_jobs_posted, account_status) VALUES (?, ?, ?, ?, 0, 'active')",
            ['Freemium Test Employer', testEmail, 'hashedpassword123', 'Freemium Innovators PLC']
        );
        testEmployerId = empResult.insertId;
        console.log(`[PASS] Created test employer (ID: ${testEmployerId}, Email: ${testEmail})`);

        const token = jwt.sign(
            { id: testEmployerId, email: testEmail, role: 'employer' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const authHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // 2. Test GET /api/employer/freemium-status
        console.log('\n--- Step 2: Testing GET /api/employer/freemium-status ---');
        const freemiumStatusRes = await fetch(`${BASE_URL}/api/employer/freemium-status`, {
            headers: authHeaders
        });
        const freemiumStatus = await freemiumStatusRes.json();
        console.log('Freemium status response:', freemiumStatus);
        if (freemiumStatus.free_jobs_posted !== 0 || freemiumStatus.free_jobs_remaining !== 2) {
            throw new Error(`Expected 0 posted, 2 remaining, got: ${JSON.stringify(freemiumStatus)}`);
        }
        console.log('[PASS] Initial freemium status is correct: 0 posted, 2 of 2 free posts remaining.');

        // 3. Test Post 1 (Free post 1 of 2)
        console.log('\n--- Step 3: Posting Job 1 (Free post 1 of 2) ---');
        const postJob1Res = await fetch(`${BASE_URL}/api/jobs`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                title: 'Senior Node.js Backend Engineer',
                company_name: 'Freemium Innovators PLC',
                location: 'Addis Ababa',
                deadline: '2026-12-31',
                description: 'Build robust scalable backend APIs.',
                job_type: 'Full-time',
                salary: '45,000 ETB'
            })
        });
        const postJob1Data = await postJob1Res.json();
        console.log('Job 1 response:', postJob1Data);
        if (postJob1Res.status !== 201 || postJob1Data.payment_status !== 'free' || postJob1Data.free_jobs_remaining !== 1) {
            throw new Error(`Job 1 should be free with 1 remaining. Response: ${JSON.stringify(postJob1Data)}`);
        }
        createdJobIds.push(postJob1Data.jobId);
        console.log(`[PASS] Job 1 created for free (ID: ${postJob1Data.jobId}, payment_status: free, remaining: 1)`);

        // Check DB for employer's updated free_jobs_posted
        const [empCheck1] = await pool.query('SELECT free_jobs_posted FROM employers WHERE id = ?', [testEmployerId]);
        console.log(`Employer free_jobs_posted in DB: ${empCheck1[0].free_jobs_posted}`);
        if (empCheck1[0].free_jobs_posted !== 1) {
            throw new Error(`Expected free_jobs_posted = 1, found ${empCheck1[0].free_jobs_posted}`);
        }

        // Verify Job 1 is visible in public getJobs
        const publicJobs1Res = await fetch(`${BASE_URL}/api/jobs`);
        const publicJobs1 = await publicJobs1Res.json();
        const foundJob1 = publicJobs1.find(j => j.id === postJob1Data.jobId);
        if (!foundJob1) {
            throw new Error('Job 1 should be active and visible in public job listings!');
        }
        console.log('[PASS] Job 1 is publicly visible to job seekers.');

        // 4. Test Post 2 (Free post 2 of 2)
        console.log('\n--- Step 4: Posting Job 2 (Free post 2 of 2) ---');
        const postJob2Res = await fetch(`${BASE_URL}/api/jobs`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                title: 'Frontend UI/UX Developer',
                company_name: 'Freemium Innovators PLC',
                location: 'Remote',
                deadline: '2026-12-31',
                description: 'Design and develop delightful interfaces.',
                job_type: 'Full-time',
                salary: '40,000 ETB'
            })
        });
        const postJob2Data = await postJob2Res.json();
        console.log('Job 2 response:', postJob2Data);
        if (postJob2Res.status !== 201 || postJob2Data.payment_status !== 'free' || postJob2Data.free_jobs_remaining !== 0) {
            throw new Error(`Job 2 should be free with 0 remaining. Response: ${JSON.stringify(postJob2Data)}`);
        }
        createdJobIds.push(postJob2Data.jobId);
        console.log(`[PASS] Job 2 created for free (ID: ${postJob2Data.jobId}, payment_status: free, remaining: 0)`);

        const [empCheck2] = await pool.query('SELECT free_jobs_posted FROM employers WHERE id = ?', [testEmployerId]);
        console.log(`Employer free_jobs_posted in DB: ${empCheck2[0].free_jobs_posted}`);
        if (empCheck2[0].free_jobs_posted !== 2) {
            throw new Error(`Expected free_jobs_posted = 2, found ${empCheck2[0].free_jobs_posted}`);
        }

        // 5. Test Post 3 (Subsequent post >= 2, REQUIRES 300 ETB VIA CHAPA)
        console.log('\n--- Step 5: Posting Job 3 (Should REQUIRE 300 ETB via Chapa) ---');
        const postJob3Res = await fetch(`${BASE_URL}/api/jobs`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                title: 'DevOps / Cloud Architect',
                company_name: 'Freemium Innovators PLC',
                location: 'Addis Ababa',
                deadline: '2026-12-31',
                description: 'Manage cloud infrastructure and CI/CD pipelines.',
                job_type: 'Contract',
                salary: '55,000 ETB'
            })
        });
        const postJob3Data = await postJob3Res.json();
        console.log('Job 3 response:', postJob3Data);
        if (postJob3Data.payment_status !== 'pending' || !postJob3Data.payment_required || !postJob3Data.checkout_url || !postJob3Data.tx_ref) {
            throw new Error(`Job 3 must require payment with payment_status=pending and checkout_url. Response: ${JSON.stringify(postJob3Data)}`);
        }
        createdJobIds.push(postJob3Data.jobId);
        console.log(`[PASS] Job 3 saved with payment_status='pending', checkout_url returned: ${postJob3Data.checkout_url}`);

        // Verify Job 3 is HIDDEN from public job seekers
        const publicJobs2Res = await fetch(`${BASE_URL}/api/jobs`);
        const publicJobs2 = await publicJobs2Res.json();
        const foundJob3Public = publicJobs2.find(j => j.id === postJob3Data.jobId);
        if (foundJob3Public) {
            throw new Error('CRITICAL BUG: Job 3 is pending payment but is visible to public seekers!');
        }
        console.log('[PASS] Job 3 is correctly HIDDEN from public job seekers while pending payment.');

        // Seeker fetching Job 3 by ID directly should get 404 or hidden message
        const seekerToken = jwt.sign({ id: 9999, email: 'seeker@joblink.et', role: 'job_seeker' }, JWT_SECRET, { expiresIn: '1h' });
        const directJob3Res = await fetch(`${BASE_URL}/api/jobs/${postJob3Data.jobId}`, {
            headers: { 'Authorization': `Bearer ${seekerToken}` }
        });
        if (directJob3Res.status !== 404) {
            throw new Error(`Direct seeker access to pending job should return 404, got status ${directJob3Res.status}`);
        }
        console.log('[PASS] Direct seeker access to pending job returned 404 as expected.');

        // 6. Test Chapa Webhook Verification
        console.log('\n--- Step 6: Testing Chapa Webhook to verify payment and activate Job 3 ---');
        const webhookRes = await fetch(`${BASE_URL}/api/payments/chapa-webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tx_ref: postJob3Data.tx_ref,
                status: 'success',
                amount: '300',
                currency: 'ETB'
            })
        });
        const webhookData = await webhookRes.json();
        console.log('Webhook response:', webhookData);
        if (webhookRes.status !== 200 || webhookData.status !== 'success') {
            throw new Error(`Webhook failed: ${JSON.stringify(webhookData)}`);
        }
        console.log('[PASS] Webhook processed successfully.');

        // Check Job 3 in DB: payment_status should now be 'paid' and status should be 'active'
        const [job3Check] = await pool.query('SELECT payment_status, status FROM jobs WHERE id = ?', [postJob3Data.jobId]);
        console.log(`Job 3 status in DB after webhook: payment_status = ${job3Check[0].payment_status}, status = ${job3Check[0].status}`);
        if (job3Check[0].payment_status !== 'paid' || job3Check[0].status !== 'active') {
            throw new Error(`Expected payment_status='paid' and status='active', got: ${JSON.stringify(job3Check[0])}`);
        }
        console.log('[PASS] Job 3 is now payment_status="paid" and status="active"!');

        // Check public jobs again: Job 3 should NOW be visible!
        const publicJobs3Res = await fetch(`${BASE_URL}/api/jobs`);
        const publicJobs3 = await publicJobs3Res.json();
        const foundJob3NowActive = publicJobs3.find(j => j.id === postJob3Data.jobId);
        if (!foundJob3NowActive) {
            throw new Error('Job 3 should now be publicly visible after payment verification!');
        }
        console.log('[PASS] Job 3 is now publicly visible to job seekers after payment!');

        console.log('\n=== ALL FREEMIUM & CHAPA PAYMENT TESTS PASSED SUCCESSFULLY! ===\n');
    } catch (err) {
        console.error('\n[FAIL] Test encountered an error:', err);
    } finally {
        // Cleanup test data
        if (createdJobIds.length > 0) {
            await pool.query('DELETE FROM jobs WHERE id IN (?)', [createdJobIds]).catch(() => {});
        }
        if (testEmployerId) {
            await pool.query('DELETE FROM employers WHERE id = ?', [testEmployerId]).catch(() => {});
        }
        console.log('Cleaned up test data.');
        process.exit(0);
    }
}

runFreemiumTests();
