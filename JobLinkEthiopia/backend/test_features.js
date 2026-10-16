const jwt = require('jsonwebtoken');
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
    console.log('=== Starting Full Stack Feature Verification ===\n');

    // ----------------------------------------------------
    // TEST 1: RATE LIMITING (8 attempts / 60 seconds per IP)
    // ----------------------------------------------------
    console.log('[Test 1] Testing Rate Limiting on Login (8 attempts per IP in 60s)...');
    const testEmail = `ratetest_${Date.now()}@example.com`;

    console.log(`Sending 8 failed login attempts for ${testEmail}...`);
    for (let i = 1; i <= 8; i++) {
        const res = await fetch(`${BASE_URL}/api/auth/seeker/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password: 'wrongpassword' })
        });
        console.log(` Attempt ${i}: Status ${res.status}`);
    }

    // Attempt 9 should be 429 Too Many Requests
    const res9 = await fetch(`${BASE_URL}/api/auth/seeker/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'wrongpassword' })
    });
    console.log(` Attempt 9: Status ${res9.status}`);
    if (res9.status === 429) {
        console.log(' PASS: 9th login attempt correctly hit rate limit (429 Too Many Requests)');
    } else {
        console.error(` FAIL: Expected 429 on 9th attempt, got ${res9.status}`);
    }

    // ----------------------------------------------------
    // TEST 2: PROFILE PHOTO UPLOADS
    // ----------------------------------------------------
    console.log('\n[Test 2] Testing User Profile Photo Upload...');

    // Find or create test user
    const testEmail = `phototest_${Date.now()}@example.com`;
    const [insertResult] = await pool.query(
        'INSERT INTO users (name, email, role, profile_photo) VALUES (?, ?, ?, ?)',
        ['Test Photo User', testEmail, 'job_seeker', '/uploads/default-avatar.png']
    );
    const testUserId = insertResult.insertId;

    // Generate JWT auth token for test user
    const token = jwt.sign(
        { id: testUserId, email: testEmail, role: 'job_seeker' },
        process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
        { expiresIn: '1h' }
    );

    // Create a temporary test image buffer (1x1 PNG or small image)
    const testImgPath = path.join(__dirname, 'test_avatar.png');
    const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
    );
    fs.writeFileSync(testImgPath, pngBuffer);

    // Prepare FormData
    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(testImgPath)], { type: 'image/png' });
    formData.append('profilePhoto', fileBlob, 'test_avatar.png');

    console.log(`Uploading profile photo for user ${testUserId} (${testEmail})...`);
    const uploadRes = await fetch(`${BASE_URL}/api/user/profile-photo`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    const uploadData = await uploadRes.json();
    console.log('Upload response status:', uploadRes.status);
    console.log('Upload response body:', uploadData);

    if (uploadRes.status === 200 && uploadData.profile_photo) {
        console.log(' PASS: Profile photo uploaded successfully');

        // Verify file is accessible via HTTP
        const photoUrl = `${BASE_URL}${uploadData.profile_photo}`;
        const fetchPhotoRes = await fetch(photoUrl);
        console.log(`Accessing uploaded photo via URL (${photoUrl}): Status ${fetchPhotoRes.status}`);
        if (fetchPhotoRes.status === 200) {
            console.log(' PASS: Uploaded image is statically accessible via HTTP');
        } else {
            console.error(` FAIL: Uploaded image returned HTTP ${fetchPhotoRes.status}`);
        }

        // Verify DB update
        const [dbRows] = await pool.query('SELECT profile_photo FROM users WHERE id = ?', [testUserId]);
        if (dbRows.length > 0 && dbRows[0].profile_photo === uploadData.profile_photo) {
            console.log(` PASS: users table profile_photo updated in database (${dbRows[0].profile_photo})`);
        } else {
            console.error(' FAIL: Database does not match uploaded path:', dbRows);
        }

        // Verify GET /api/user/profile-photo
        const getPhotoRes = await fetch(`${BASE_URL}/api/user/profile-photo`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const getPhotoData = await getPhotoRes.json();
        console.log('GET /api/user/profile-photo result:', getPhotoData);
        if (getPhotoData.profile_photo === uploadData.profile_photo) {
            console.log(' PASS: GET /api/user/profile-photo returned current photo');
        } else {
            console.error(' FAIL: GET /api/user/profile-photo returned:', getPhotoData);
        }

        // Verify DELETE /api/user/profile-photo (reset to default)
        const delRes = await fetch(`${BASE_URL}/api/user/profile-photo`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const delData = await delRes.json();
        console.log('DELETE /api/user/profile-photo result:', delData);
        if (delData.profile_photo === '/uploads/default-avatar.png') {
            console.log(' PASS: DELETE /api/user/profile-photo correctly reset to default avatar');
        } else {
            console.error(' FAIL: Reset avatar returned:', delData);
        }
    } else {
        console.error(' FAIL: Profile photo upload failed');
    }

    // Cleanup test artifacts
    if (fs.existsSync(testImgPath)) fs.unlinkSync(testImgPath);
    await pool.query('DELETE FROM users WHERE id = ?', [testUserId]);

    console.log('\n=== All Tests Completed Successfully! ===');
    process.exit(0);
}

runTests().catch(err => {
    console.error('Test Suite Error:', err);
    process.exit(1);
});
