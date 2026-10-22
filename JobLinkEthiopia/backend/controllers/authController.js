const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Issue access & refresh tokens with sliding session rotation, 15m/7d expiration and HttpOnly cookie
const issueAuthTokens = async (res, user, role) => {
    const userRole = user.role || role || 'job_seeker';

    // Set accessToken expiration to 15m
    const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: userRole },
        process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
        { expiresIn: '15m' }
    );

    // Set refreshToken expiration to 7d
    const refreshToken = jwt.sign(
        { id: user.id, email: user.email, role: userRole, type: 'refresh', jti: crypto.randomBytes(16).toString('hex') },
        process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
        { expiresIn: '7d' }
    );

    let table = 'job_seekers';
    if (userRole === 'employer') table = 'employers';
    if (userRole === 'admin' || userRole === 'super_admin') table = 'admins';

    try {
        await pool.query(`UPDATE ${table} SET refresh_token = ? WHERE id = ?`, [refreshToken, user.id]);
    } catch (dbErr) {
        console.error(`Error saving refresh token to ${table}:`, dbErr);
    }

    // Attach HttpOnly cookie for refreshToken (7 days)
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Also attach role-specific cookies and wipe opposing role cookies for complete clean slate
    if (userRole === 'job_seeker') {
        res.clearCookie('employer_accessToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
        res.clearCookie('employer_refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
        res.cookie('seeker_accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 15 * 60 * 1000 });
        res.cookie('seeker_refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
    } else if (userRole === 'employer') {
        res.clearCookie('seeker_accessToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
        res.clearCookie('seeker_refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
        res.cookie('employer_accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 15 * 60 * 1000 });
        res.cookie('employer_refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
    } else {
        res.cookie('token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 15 * 60 * 1000 });
    }

    return { accessToken, refreshToken };
};

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const defaultGoogleCallback = `${(process.env.APP_URL || (process.env.NODE_ENV === 'production' ? 'https://joblink-ethiopia.onrender.com' : `http://localhost:${process.env.PORT || 3000}`)).replace(/\/$/, '')}/api/auth/google/callback`;
    const googleCallbackURL = process.env.GOOGLE_CALLBACK_URL || defaultGoogleCallback;
    console.log(`[OAuth] Google Strategy initialized with callbackURL: ${googleCallbackURL}`);

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: googleCallbackURL,
        scope: ['profile', 'email'],
        passReqToCallback: true,
        proxy: true
    }, async (req, accessToken, refreshToken, profile, done) => {
        try {
            const googleId = profile.id;
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase().trim() : null;
            const name = profile.displayName || (profile.name ? `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim() : 'Google User');
            const photo = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

            if (!email && !googleId) {
                return done(new Error('Google did not return user email or ID'), null);
            }

            // Retrieve the state parameter or query to know intended role from frontend toggle
            const rawState = (req.query && req.query.state) ? String(req.query.state).trim() : '';
            const reqRole = (req.query && req.query.role) ? String(req.query.role).toLowerCase().trim() : '';
            let intendedRole = 'job_seeker';

            if (reqRole === 'employer') {
                intendedRole = 'employer';
            } else if (rawState.includes(':')) {
                const parts = rawState.split(':');
                intendedRole = parts[1].toLowerCase().trim() === 'employer' ? 'employer' : 'job_seeker';
            } else if (rawState.includes('|')) {
                const parts = rawState.split('|');
                intendedRole = parts[1].toLowerCase().trim() === 'employer' ? 'employer' : 'job_seeker';
            } else if (rawState.toLowerCase().includes('employer')) {
                intendedRole = 'employer';
            }

            // Query existing users across all tables
            const [employers] = await pool.query('SELECT * FROM employers WHERE google_id = ? OR email = ?', [googleId, email]);
            const [seekers] = await pool.query('SELECT * FROM job_seekers WHERE google_id = ? OR email = ?', [googleId, email]);
            const [admins] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);

            // 1. If administrator account exists
            if (admins.length > 0) {
                return done(null, false, { message: 'Administrator accounts must sign in using email and password' });
            }

            // 2. Strict Role Enforcement: strictly use intendedRole
            if (intendedRole === 'employer') {
                // If user already exists in employers table
                if (employers.length > 0) {
                    const user = employers[0];
                    user.role = 'employer';
                    if (!user.google_id) {
                        await pool.query('UPDATE employers SET google_id = ? WHERE id = ?', [googleId, user.id]);
                        user.google_id = googleId;
                    }
                    if (!user.profile_photo_url && photo) {
                        await pool.query('UPDATE employers SET profile_photo_url = ? WHERE id = ?', [photo, user.id]);
                        user.profile_photo_url = photo;
                    }
                    try {
                        await pool.query(
                            'INSERT INTO users (name, full_name, email, google_id, role, account_status, is_approved) VALUES (?, ?, ?, ?, "employer", "active", TRUE) ON DUPLICATE KEY UPDATE google_id = VALUES(google_id), role = "employer"',
                            [user.name || name, user.name || name, email, googleId]
                        );
                    } catch (e) { }
                    return done(null, user);
                }

                // If user does not have an employer account yet, create a new profile specifically for employer
                const [result] = await pool.query(
                    'INSERT INTO employers (name, email, password, google_id, company_name, profile_photo_url, is_email_verified, account_status) VALUES (?, ?, ?, ?, ?, ?, true, ?)',
                    [name, email, 'google_oauth_user', googleId, name, photo, 'active']
                );
                const [newEmployers] = await pool.query('SELECT * FROM employers WHERE id = ?', [result.insertId]);
                const newUser = newEmployers[0];
                newUser.role = 'employer';

                try {
                    await pool.query(
                        'INSERT INTO users (name, full_name, email, google_id, role, account_status, is_approved) VALUES (?, ?, ?, ?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE google_id = VALUES(google_id), role = "employer"',
                        [name, name, email, googleId, 'employer', 'active']
                    );
                } catch (e) {
                    console.error('Users table sync error:', e);
                }

                return done(null, newUser);
            } else {
                // intendedRole is job_seeker
                // If user already exists in job_seekers table
                if (seekers.length > 0) {
                    const user = seekers[0];
                    user.role = 'job_seeker';
                    if (!user.google_id) {
                        await pool.query('UPDATE job_seekers SET google_id = ? WHERE id = ?', [googleId, user.id]);
                        user.google_id = googleId;
                    }
                    if (!user.profile_photo_url && photo) {
                        await pool.query('UPDATE job_seekers SET profile_photo_url = ? WHERE id = ?', [photo, user.id]);
                        user.profile_photo_url = photo;
                    }
                    try {
                        await pool.query(
                            'INSERT INTO users (name, full_name, email, google_id, role, account_status, is_approved) VALUES (?, ?, ?, ?, "job_seeker", "active", TRUE) ON DUPLICATE KEY UPDATE google_id = VALUES(google_id), role = "job_seeker"',
                            [user.name || name, user.name || name, email, googleId]
                        );
                    } catch (e) { }
                    return done(null, user);
                }

                // If user does not have a job seeker account yet, create a new profile specifically for job_seeker
                const [result] = await pool.query(
                    'INSERT INTO job_seekers (name, email, password, google_id, profile_photo_url, is_email_verified, account_status) VALUES (?, ?, ?, ?, ?, true, ?)',
                    [name, email, 'google_oauth_user', googleId, photo, 'active']
                );
                const [newUsers] = await pool.query('SELECT * FROM job_seekers WHERE id = ?', [result.insertId]);
                const newUser = newUsers[0];
                newUser.role = 'job_seeker';

                try {
                    await pool.query(
                        'INSERT INTO users (name, full_name, email, google_id, role, account_status, is_approved) VALUES (?, ?, ?, ?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE google_id = VALUES(google_id), role = "job_seeker"',
                        [name, name, email, googleId, 'job_seeker', 'active']
                    );
                } catch (e) {
                    console.error('Users table sync error:', e);
                }

                return done(null, newUser);
            }
        } catch (err) {
            console.error('Google OAuth Strategy Error:', err);
            return done(err, null);
        }
    }));
}


exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const validRoles = ['job_seeker', 'employer', 'admin', 'super_admin'];
        const userRole = validRoles.includes(role) ? role : 'job_seeker';

        let tableName = 'job_seekers';
        if (userRole === 'employer') tableName = 'employers';
        if (userRole === 'admin' || userRole === 'super_admin') tableName = 'admins';

        // Check if user already exists in ANY table to enforce unique email across roles
        const [existingAdmins] = await pool.query(`SELECT id FROM admins WHERE email = ?`, [email]);
        const [existingEmployers] = await pool.query(`SELECT id FROM employers WHERE email = ?`, [email]);
        const [existingSeekers] = await pool.query(`SELECT id FROM job_seekers WHERE email = ?`, [email]);

        if (existingAdmins.length > 0 || existingEmployers.length > 0 || existingSeekers.length > 0) {
            return res.status(400).json({ message: 'This email is already registered in the system.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        let result;
        if (tableName === 'admins') {
            [result] = await pool.query(
                `INSERT INTO ${tableName} (name, email, password, role) VALUES (?, ?, ?, ?)`,
                [name, email, hashedPassword, userRole]
            );
        } else {
            [result] = await pool.query(
                `INSERT INTO ${tableName} (name, email, password) VALUES (?, ?, ?)`,
                [name, email, hashedPassword]
            );
        }

        res.status(201).json({ message: 'Registration successful', userId: result.insertId });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

exports.login = async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const cleanEmail = String(email).toLowerCase().trim();

        // Query candidate tables across the database
        const [employers] = await pool.query('SELECT * FROM employers WHERE email = ?', [cleanEmail]);
        const [seekers] = await pool.query('SELECT * FROM job_seekers WHERE email = ?', [cleanEmail]);
        const [admins] = await pool.query('SELECT * FROM admins WHERE email = ?', [cleanEmail]);

        // Strict Role Checking: validate the requested role from the UI against the database.
        // If a user has the 'Employer' tab active but enters an email registered only as a 'Job Seeker',
        // fail with 'No employer account found with this email.'
        // If a user has the 'Job Seeker' tab active but enters an email registered only as an 'Employer',
        // fail with 'No job seeker account found with this email.'
        const candidateList = [];
        const normalizedRole = role ? String(role).toLowerCase().trim() : null;

        if (normalizedRole === 'employer') {
            if (employers.length === 0) {
                if (seekers.length > 0) {
                    return res.status(401).json({ message: 'No employer account found with this email.' });
                }
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            candidateList.push({ data: employers[0], role: 'employer', table: 'employers' });
        } else if (normalizedRole === 'job_seeker' || normalizedRole === 'seeker' || normalizedRole === 'jobseeker') {
            if (seekers.length === 0) {
                if (employers.length > 0) {
                    return res.status(401).json({ message: 'No job seeker account found with this email.' });
                }
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            candidateList.push({ data: seekers[0], role: 'job_seeker', table: 'job_seekers' });
        } else if (normalizedRole === 'admin' || normalizedRole === 'super_admin') {
            if (admins.length === 0) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            candidateList.push({ data: admins[0], role: admins[0].role || 'admin', table: 'admins' });
        } else {
            // Fallback only when no role is specified
            if (seekers.length > 0) candidateList.push({ data: seekers[0], role: 'job_seeker', table: 'job_seekers' });
            if (employers.length > 0) candidateList.push({ data: employers[0], role: 'employer', table: 'employers' });
            if (admins.length > 0) candidateList.push({ data: admins[0], role: admins[0].role || 'admin', table: 'admins' });
        }

        if (candidateList.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Test password against candidate records
        let matchedCandidate = null;
        for (const candidate of candidateList) {
            const candidateUser = candidate.data;

            if (candidateUser.locked_until && new Date(candidateUser.locked_until) > new Date()) {
                return res.status(401).json({ message: 'Account locked. Please try again later.' });
            }

            const isMatch = await bcrypt.compare(password, candidateUser.password);
            if (isMatch) {
                matchedCandidate = candidate;
                break;
            }
        }

        if (!matchedCandidate) {
            // Track failed login attempt on the primary matching record
            const first = candidateList[0];
            if (first.table === 'employers' || first.table === 'job_seekers') {
                const failed = (first.data.failed_login_attempts || 0) + 1;
                if (failed >= 10) {
                    await pool.query(`UPDATE ${first.table} SET failed_login_attempts = ?, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?`, [failed, first.data.id]);
                } else {
                    await pool.query(`UPDATE ${first.table} SET failed_login_attempts = ? WHERE id = ?`, [failed, first.data.id]);
                }
            }
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = matchedCandidate.data;
        const userRole = matchedCandidate.role;
        const tableName = matchedCandidate.table;
        user.role = userRole;

        // Reset failed login attempts on success
        if (tableName === 'employers' || tableName === 'job_seekers') {
            if (user.failed_login_attempts > 0 || user.locked_until) {
                await pool.query(`UPDATE ${tableName} SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`, [user.id]);
            }
        }

        if (user.account_status === 'banned') {
            return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
        }

        // Issue access & refresh tokens
        const { accessToken } = await issueAuthTokens(res, user, userRole);

        // Dynamic redirectUrl based strictly on retrieved database role
        const dynamicRedirectUrl = (userRole === 'employer') ? '/employer.html' : ((userRole === 'admin' || userRole === 'super_admin') ? '/admin.html' : '/seeker.html');

        res.status(200).json({
            message: 'Login successful',
            token: accessToken,
            accessToken,
            redirectUrl: dynamicRedirectUrl,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: userRole,
                company_name: user.company_name || null,
                account_status: user.account_status || 'active',
                profile_photo: user.profile_photo || user.profile_photo_url || '/uploads/default-avatar.png',
                profile_photo_url: user.profile_photo || user.profile_photo_url || '/uploads/default-avatar.png'
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

exports.switchRole = async (req, res) => {
    const { targetRole } = req.body;
    const email = req.user.email; // From authenticateToken middleware

    try {
        let tableName = 'job_seekers';
        if (targetRole === 'employer') tableName = 'employers';
        if (targetRole === 'admin' || targetRole === 'super_admin') tableName = 'admins';

        const [users] = await pool.query(`SELECT * FROM ${tableName} WHERE email = ?`, [email]);

        if (users.length === 0) {
            return res.status(404).json({ message: `You do not have a ${targetRole} account yet.` });
        }

        const user = users[0];
        const role = tableName === 'admins' ? user.role : targetRole;

        const { accessToken } = await issueAuthTokens(res, user, role);

        res.status(200).json({
            message: 'Switched role successfully',
            token: accessToken,
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: role,
                account_status: user.account_status
            }
        });
    } catch (error) {
        console.error('Switch Role Error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

exports.getMe = async (req, res) => {
    try {
        const { id, role, email } = req.user;
        let tableName = 'job_seekers';
        if (role === 'employer') tableName = 'employers';
        if (role === 'admin' || role === 'super_admin') tableName = 'admins';

        let [users] = await pool.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);

        // Fallback by email if not found by id in role table
        if (users.length === 0 && (email || req.user.email)) {
            [users] = await pool.query(`SELECT * FROM ${tableName} WHERE email = ?`, [email || req.user.email]);
        }

        // Fallback to unified users table strictly matching role
        if (users.length === 0) {
            [users] = await pool.query('SELECT * FROM users WHERE (id = ? OR email = ?) AND role = ?', [id, email || req.user.email || '', role || 'job_seeker']);
        }

        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = users[0];
        user.role = role || user.role || 'job_seeker';

        let photo = user.profile_picture || user.profile_photo || user.profile_photo_url;

        // If not found directly, check strictly role-specific table
        if (!photo) {
            if (user.role === 'job_seeker') {
                const [seekers] = await pool.query(
                    'SELECT profile_picture, profile_photo, profile_photo_url FROM job_seekers WHERE id = ? OR email = ?',
                    [id, email || user.email || '']
                ).catch(() => [[]]);
                if (seekers.length > 0) {
                    photo = seekers[0].profile_picture || seekers[0].profile_photo || seekers[0].profile_photo_url;
                }
            } else if (user.role === 'employer') {
                const [employers] = await pool.query(
                    'SELECT profile_picture, profile_photo, profile_photo_url FROM employers WHERE id = ? OR email = ?',
                    [id, email || user.email || '']
                ).catch(() => [[]]);
                if (employers.length > 0) {
                    photo = employers[0].profile_picture || employers[0].profile_photo || employers[0].profile_photo_url;
                }
            } else if (user.role === 'admin' || user.role === 'super_admin') {
                const [admins] = await pool.query(
                    'SELECT profile_photo FROM admins WHERE id = ? OR email = ?',
                    [id, email || user.email || '']
                ).catch(() => [[]]);
                if (admins.length > 0) {
                    photo = admins[0].profile_photo;
                }
            }
        }

        // Check unified users table strictly with AND role = ?
        if (!photo && (email || user.email || id)) {
            const [globalUsers] = await pool.query(
                'SELECT profile_picture, profile_photo FROM users WHERE (id = ? OR email = ?) AND role = ?',
                [id, email || user.email || '', user.role]
            ).catch(() => [[]]);
            if (globalUsers.length > 0 && (globalUsers[0].profile_picture || globalUsers[0].profile_photo)) {
                photo = globalUsers[0].profile_picture || globalUsers[0].profile_photo;
            }
        }

        // Normalize path: absolute with leading slash or external URL
        if (photo && typeof photo === 'string') {
            photo = photo.trim();
            if (!photo.startsWith('http://') && !photo.startsWith('https://') && !photo.startsWith('data:') && !photo.startsWith('/')) {
                photo = '/' + photo;
            }
        }

        const defaultAvatar = '/uploads/default-avatar.png';
        const finalPhoto = photo || defaultAvatar;

        user.profile_picture = finalPhoto;
        user.profile_photo = finalPhoto;
        user.profile_photo_url = finalPhoto;

        delete user.password;
        delete user.two_factor_secret;
        delete user.refresh_token;

        res.status(200).json(user);
    } catch (error) {
        console.error('Get Me Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// --- GitHub OAuth ---
exports.githubAuth = (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID || 'mock_github_client_id';
    const baseUrl = (process.env.APP_URL || (process.env.NODE_ENV === 'production' ? 'https://joblink-ethiopia.onrender.com' : `http://localhost:${process.env.PORT || 3000}`)).replace(/\/$/, '');
    const redirectUri = `${baseUrl}/api/auth/github/callback`;
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
    res.redirect(url);
};

exports.githubCallback = async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('No code provided');

    try {
        let name = 'GitHub User';
        let email = `github_${code}@mock.com`;
        let githubId = `gh_${code}`;

        let [users] = await pool.query('SELECT * FROM job_seekers WHERE github_id = ?', [githubId]);
        let user;

        if (users.length === 0) {
            [users] = await pool.query('SELECT * FROM job_seekers WHERE email = ?', [email]);
            if (users.length > 0) {
                user = users[0];
                await pool.query('UPDATE job_seekers SET github_id = ? WHERE id = ?', [githubId, user.id]);
            } else {
                const [result] = await pool.query(
                    'INSERT INTO job_seekers (name, email, github_id) VALUES (?, ?, ?)',
                    [name, email, githubId]
                );
                const [newUsers] = await pool.query('SELECT * FROM job_seekers WHERE id = ?', [result.insertId]);
                user = newUsers[0];
            }
        } else {
            user = users[0];
        }
        user.role = 'job_seeker';
        const { accessToken: token } = await issueAuthTokens(res, user, 'job_seeker');

        res.send(`<html><body><script>
            localStorage.setItem('token', '${token}');
            localStorage.setItem('user', JSON.stringify(${JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role, account_status: user.account_status || 'active' })}));
            localStorage.setItem('seeker_token', '${token}');
            localStorage.setItem('seeker_user', JSON.stringify(${JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role, account_status: user.account_status || 'active' })}));
            window.location.href = '/seeker.html';
        </script></body></html>`);
    } catch (error) {
        console.error('GitHub OAuth Error:', error);
        res.status(500).send('Authentication failed');
    }
};

/* --- LinkedIn OAuth (temporarily disabled per mentor advice) ---
exports.linkedinAuth = (req, res) => {
    const rawRole = (req.query.role || req.query.state || 'jobseeker').toLowerCase();
    const role = rawRole.includes('employer') ? 'employer' : 'job_seeker';
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const port = process.env.PORT || 3000;
    const baseUrl = (process.env.APP_URL || (process.env.NODE_ENV === 'production' ? 'https://joblink-ethiopia.onrender.com' : `http://localhost:${port}`)).replace(/\/$/, '');

    const isApiPath = req.baseUrl ? req.baseUrl.includes('/api/auth') : (req.originalUrl && req.originalUrl.startsWith('/api/'));
    const defaultCallback = isApiPath 
        ? `${baseUrl}/api/auth/linkedin/callback`
        : `${baseUrl}/auth/linkedin/callback`;
    const redirectUri = process.env.LINKEDIN_CALLBACK_URL || defaultCallback;

    // Check if valid production credentials exist in environment
    const isConfigured = clientId && clientSecret && 
                         clientId !== 'mock_linkedin_client_id' && 
                         clientSecret !== 'mock_linkedin_client_secret';

    if (!isConfigured) {
        // Development / Simulated LinkedIn OAuth dialog
        const roleLabel = role === 'employer' ? 'Employer' : 'Job Seeker';
        return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in with LinkedIn - JobLink Ethiopia</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem;
      box-sizing: border-box;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      padding: 2.25rem;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
      box-sizing: border-box;
      text-align: left;
    }
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.35rem;
      font-weight: 700;
      color: #0a66c2;
    }
    .env-tag {
      background: #e0f2fe;
      color: #0369a1;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h2 {
      margin: 0 0 0.5rem 0;
      color: #0f172a;
      font-size: 1.4rem;
      font-weight: 700;
    }
    .subtitle {
      color: #64748b;
      font-size: 0.9rem;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .form-group {
      margin-bottom: 1.15rem;
    }
    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.4rem;
    }
    input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.95rem;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #0a66c2;
      box-shadow: 0 0 0 3px rgba(10, 102, 194, 0.15);
    }
    .btn-submit {
      width: 100%;
      background: #0a66c2;
      color: #ffffff;
      border: none;
      border-radius: 28px;
      padding: 0.85rem 1.25rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
      margin-top: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-submit:hover {
      background: #004182;
    }
    .btn-submit:active {
      transform: scale(0.99);
    }
    .cancel-link {
      display: block;
      margin-top: 1.25rem;
      text-align: center;
      color: #64748b;
      font-size: 0.875rem;
      text-decoration: none;
      font-weight: 500;
    }
    .cancel-link:hover {
      color: #0f172a;
      text-decoration: underline;
    }
    .note-box {
      background: #f8fafc;
      border-left: 3px solid #0a66c2;
      padding: 0.75rem 1rem;
      font-size: 0.8rem;
      color: #475569;
      margin-top: 1.5rem;
      border-radius: 0 6px 6px 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header-bar">
      <div class="logo-container">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#0a66c2"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
        LinkedIn
      </div>
      <span class="env-tag">Dev Simulation</span>
    </div>
    <h2>Sign in with LinkedIn</h2>
    <p class="subtitle">Authorize <strong>JobLink Ethiopia</strong> to sign you in as a verified <strong>${roleLabel}</strong>.</p>
    
    <form method="GET" action="${redirectUri}">
      <input type="hidden" name="code" value="mock_${Date.now()}" />
      <input type="hidden" name="state" value="${role}" />
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" name="name" value="${role === 'employer' ? 'Ethiopian Tech Recruiter' : 'Abebe Kebede'}" required />
      </div>
      <div class="form-group">
        <label>LinkedIn Email Address</label>
        <input type="email" name="email" value="${role === 'employer' ? 'recruiter@ethiojobs.et' : 'abebe.kebede@example.com'}" required />
      </div>
      <button type="submit" class="btn-submit">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
        Continue as ${roleLabel}
      </button>
      <a href="${role === 'employer' ? '/employer.html' : '/'}" class="cancel-link">Cancel and return</a>
    </form>
    <div class="note-box">
      <strong>Pro Tip:</strong> To connect your live LinkedIn app, set <code>LINKEDIN_CLIENT_ID</code> and <code>LINKEDIN_CLIENT_SECRET</code> in <code>.env</code>.
    </div>
  </div>
</body>
</html>`);
    }

    // Live LinkedIn OpenID Connect authorization URL
    const scopes = 'openid profile email';
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${role}`;
    res.redirect(authUrl);
};

exports.linkedinCallback = async (req, res) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
        console.error('LinkedIn OAuth Provider Error:', error, error_description);
        return res.redirect(`/?error=${encodeURIComponent(error_description || error || 'LinkedIn authentication cancelled')}`);
    }

    if (!code) {
        return res.redirect(`/?error=${encodeURIComponent('No authorization code received from LinkedIn')}`);
    }

    const rawState = (state || '').toLowerCase();
    const intendedRole = rawState.includes('employer') ? 'employer' : 'job_seeker';
    const isMock = code.startsWith('mock_') || !process.env.LINKEDIN_CLIENT_SECRET || process.env.LINKEDIN_CLIENT_SECRET === 'mock_linkedin_client_secret';

    let name = '';
    let email = '';
    let linkedinId = '';
    let photo = null;

    try {
        if (isMock) {
            // Simulated development data from prompt or parameters
            name = req.query.name || (intendedRole === 'employer' ? 'LinkedIn Employer' : 'LinkedIn Seeker');
            email = req.query.email || `linkedin_${code.slice(-6)}@joblink.et`;
            linkedinId = `li_${code}`;
            photo = '/uploads/default-avatar.png';
        } else {
            // Live LinkedIn OAuth Token Exchange
            const port = process.env.PORT || 3000;
            const baseUrl = (process.env.APP_URL || (process.env.NODE_ENV === 'production' ? 'https://joblink-ethiopia.onrender.com' : `http://localhost:${port}`)).replace(/\/$/, '');
            const isApiPath = req.baseUrl ? req.baseUrl.includes('/api/auth') : (req.originalUrl && req.originalUrl.startsWith('/api/'));
            const defaultCallback = isApiPath 
                ? `${baseUrl}/api/auth/linkedin/callback`
                : `${baseUrl}/auth/linkedin/callback`;
            const redirectUri = process.env.LINKEDIN_CALLBACK_URL || defaultCallback;

            const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    client_id: process.env.LINKEDIN_CLIENT_ID,
                    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
                    redirect_uri: redirectUri
                })
            });

            const tokenData = await tokenResponse.json();
            if (!tokenResponse.ok || !tokenData.access_token) {
                console.error('LinkedIn Token Exchange Failed:', tokenData);
                throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with LinkedIn');
            }

            const accessToken = tokenData.access_token;

            // Fetch user profile from LinkedIn OpenID Connect userinfo endpoint
            const userinfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const userinfo = await userinfoResponse.json();
            if (!userinfoResponse.ok || !userinfo.sub) {
                console.error('LinkedIn Userinfo Retrieval Failed:', userinfo);
                throw new Error('Failed to retrieve user profile from LinkedIn');
            }

            linkedinId = userinfo.sub;
            name = userinfo.name || `${userinfo.given_name || ''} ${userinfo.family_name || ''}`.trim() || 'LinkedIn User';
            email = userinfo.email;
            photo = userinfo.picture || null;
        }

        if (!email && !linkedinId) {
            return res.redirect(`/?error=${encodeURIComponent('LinkedIn did not return user email or ID')}`);
        }

        // Query existing accounts across all tables to enforce unique role and email constraints
        const [employers] = await pool.query('SELECT * FROM employers WHERE linkedin_id = ? OR email = ?', [linkedinId, email]);
        const [seekers] = await pool.query('SELECT * FROM job_seekers WHERE linkedin_id = ? OR email = ?', [linkedinId, email]);
        const [admins] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);

        let user = null;
        let role = intendedRole;

        if (employers.length > 0) {
            if (intendedRole !== 'employer') {
                return res.redirect(`/?error=${encodeURIComponent('This email is already registered as an Employer')}`);
            }
            user = employers[0];
            user.role = 'employer';
            role = 'employer';
            if (!user.linkedin_id) {
                await pool.query('UPDATE employers SET linkedin_id = ? WHERE id = ?', [linkedinId, user.id]);
                user.linkedin_id = linkedinId;
            }
        } else if (seekers.length > 0) {
            if (intendedRole !== 'job_seeker') {
                return res.redirect(`/?error=${encodeURIComponent('This email is already registered as a Job Seeker')}`);
            }
            user = seekers[0];
            user.role = 'job_seeker';
            role = 'job_seeker';
            if (!user.linkedin_id) {
                await pool.query('UPDATE job_seekers SET linkedin_id = ? WHERE id = ?', [linkedinId, user.id]);
                user.linkedin_id = linkedinId;
            }
        } else if (admins.length > 0) {
            return res.redirect(`/?error=${encodeURIComponent('This email is already registered as an Administrator')}`);
        } else {
            // Register new user with the intended role
            if (intendedRole === 'employer') {
                role = 'employer';
                const [result] = await pool.query(
                    'INSERT INTO employers (name, email, password, linkedin_id, company_name, profile_photo_url, account_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [name, email, 'linkedin_oauth_user', linkedinId, name, photo, 'active']
                );
                const [newEmployers] = await pool.query('SELECT * FROM employers WHERE id = ?', [result.insertId]);
                user = newEmployers[0];

                try {
                    await pool.query(
                        'INSERT IGNORE INTO users (name, email, linkedin_id, role, account_status) VALUES (?, ?, ?, ?, ?)',
                        [name, email, linkedinId, 'employer', 'active']
                    );
                } catch (e) {
                    console.error('Users table sync error for LinkedIn employer:', e);
                }
            } else {
                role = 'job_seeker';
                const [result] = await pool.query(
                    'INSERT INTO job_seekers (name, email, linkedin_id, profile_photo_url, is_email_verified, account_status) VALUES (?, ?, ?, ?, true, ?)',
                    [name, email, linkedinId, photo, 'active']
                );
                const [newUsers] = await pool.query('SELECT * FROM job_seekers WHERE id = ?', [result.insertId]);
                user = newUsers[0];

                try {
                    await pool.query(
                        'INSERT IGNORE INTO users (name, email, linkedin_id, role, account_status) VALUES (?, ?, ?, ?, ?)',
                        [name, email, linkedinId, 'job_seeker', 'active']
                    );
                } catch (e) {
                    console.error('Users table sync error for LinkedIn job_seeker:', e);
                }
            }
        }

        user.role = role;
        const { accessToken: token } = await issueAuthTokens(res, user, role);

        const redirectPage = user.role === 'employer' ? '/employer.html' : '/seeker.html';
        const rolePrefix = user.role === 'employer' ? 'employer_' : 'seeker_';

        res.send(`<!DOCTYPE html>
<html>
<head><title>LinkedIn Authentication</title></head>
<body>
<script>
    localStorage.setItem('token', '${token}');
    localStorage.setItem('user', JSON.stringify(${JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_name: user.company_name || null,
        account_status: user.account_status || 'active'
    })}));
    localStorage.setItem('${rolePrefix}token', '${token}');
    localStorage.setItem('${rolePrefix}user', JSON.stringify(${JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_name: user.company_name || null,
        account_status: user.account_status || 'active'
    })}));
    window.location.href = '${redirectPage}';
</script>
</body>
</html>`);
    } catch (error) {
        console.error('LinkedIn OAuth Error:', error);
        res.redirect(`/?error=${encodeURIComponent(error.message || 'LinkedIn authentication failed')}`);
    }
};
--- End LinkedIn OAuth --- */

// --- Google OAuth ---
exports.googleAuth = (req, res, next) => {
    let action = (req.query.action || '').toLowerCase().trim();
    let role = (req.query.role || '').toLowerCase().trim();
    const rawState = (req.query.state || '').trim();

    if (rawState) {
        if (rawState.includes(':')) {
            const parts = rawState.split(':');
            if (!action && parts[0]) action = parts[0].toLowerCase().trim();
            if (!role && parts[1]) role = parts[1].toLowerCase().trim();
        } else if (rawState.includes('|')) {
            const parts = rawState.split('|');
            if (!action && parts[0]) action = parts[0].toLowerCase().trim();
            if (!role && parts[1]) role = parts[1].toLowerCase().trim();
        } else {
            if (!action && (rawState === 'register' || rawState === 'login')) action = rawState;
            if (!role && (rawState.includes('employer') || rawState.includes('jobseeker') || rawState.includes('job_seeker'))) {
                role = rawState.includes('employer') ? 'employer' : 'job_seeker';
            }
        }
    }

    if (action !== 'register') action = 'login';
    const normalizedRole = (role === 'employer') ? 'employer' : 'job_seeker';
    const statePayload = `${action}:${normalizedRole}`;

    // Clean Slate: clear all existing auth cookies before starting OAuth handshake
    res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    res.clearCookie('seeker_accessToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('seeker_refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('employer_accessToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('employer_refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.redirect(`/?error=${encodeURIComponent('Google OAuth is not configured on this server.')}`);
    }

    const prompt = req.query.prompt || 'select_account consent';

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: statePayload,
        prompt: prompt,
        session: false
    })(req, res, next);
};

exports.googleCallback = (req, res, next) => {
    passport.authenticate('google', { session: false }, async (err, user, info) => {
        if (err || !user) {
            const errorMsg = (info && info.message) || (err && err.message) || 'Google authentication failed';
            console.error('[Google OAuth] Callback error / authentication rejected:', errorMsg);

            const rawState = (req.query && req.query.state) ? String(req.query.state).toLowerCase() : '';
            const isEmployer = rawState.includes('employer');
            const redirectBase = isEmployer ? '/employer.html' : '/';

            return res.redirect(`${redirectBase}?error=${encodeURIComponent(errorMsg)}`);
        }

        try {
            const { accessToken: token } = await issueAuthTokens(res, user, user.role);

            // Dynamic redirect page based strictly on database role
            const redirectPage = (user.role === 'employer') ? '/employer.html' : ((user.role === 'admin' || user.role === 'super_admin') ? '/admin.html' : '/seeker.html');
            const userPayload = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                company_name: user.company_name || null,
                account_status: user.account_status || 'active'
            };

            res.send(`<!DOCTYPE html>
<html>
<head><title>JobLink Ethiopia - Google Authentication</title></head>
<body>
<script>
    const userObj = ${JSON.stringify(userPayload)};
    const token = '${token}';
    const role = '${user.role}';

    // Clean Slate: wipe all old tokens and session data across the board
    const authKeys = [
        'token', 'accessToken', 'user',
        'seeker_token', 'seeker_user',
        'employer_token', 'employer_user',
        'admin_token', 'admin_user'
    ];
    authKeys.forEach(k => {
        try {
            localStorage.removeItem(k);
            sessionStorage.removeItem(k);
        } catch (e) {}
    });

    if (role === 'employer') {
        localStorage.setItem('employer_token', token);
        localStorage.setItem('employer_user', JSON.stringify(userObj));
    } else {
        localStorage.setItem('seeker_token', token);
        localStorage.setItem('seeker_user', JSON.stringify(userObj));
    }

    localStorage.setItem('token', token);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(userObj));

    // Dynamic redirect to correct dashboard
    window.location.replace('${redirectPage}');
</script>
</body>
</html>`);
        } catch (error) {
            console.error('Google Callback Token Error:', error);
            res.redirect(`/?error=${encodeURIComponent('Authentication processing error')}`);
        }
    })(req, res, next);
};

const { sendVerificationEmail } = require('../utils/email');

// --- Seeker Auth ---
exports.seekerRegister = async (req, res) => {
    const { name, email, password, registrationToken } = req.body;

    if (!registrationToken) return res.status(401).json({ message: 'Missing registration token. Please verify email first.' });

    try {
        const decoded = jwt.verify(registrationToken, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production');
        if (decoded.email !== email) return res.status(401).json({ message: 'Email does not match verified token.' });
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired registration token. Please verify email again.' });
    }

    const passwordRegex = /^(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long and contain at least one number and one special character.' });
    }

    try {
        const [existingSeekers] = await pool.query('SELECT id FROM job_seekers WHERE email = ?', [email]);
        if (existingSeekers.length > 0) {
            return res.status(400).json({ message: 'This email is already registered as a Job Seeker.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            'INSERT INTO job_seekers (name, email, password, is_email_verified) VALUES (?, ?, ?, true)',
            [name, email, hashedPassword]
        );

        // Section 6 Sync: Keep users table in sync
        await pool.query(
            'INSERT INTO users (name, full_name, email, password, password_hash, role, is_approved) VALUES (?, ?, ?, ?, ?, "job_seeker", TRUE) ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash)',
            [name, name, email, hashedPassword, hashedPassword]
        ).catch(err => console.warn('Sync to users table on seeker register:', err.message));

        const user = { id: result.insertId, name, email, role: 'job_seeker', account_status: 'active' };
        const { accessToken } = await issueAuthTokens(res, user, 'job_seeker');

        res.status(201).json({
            message: 'Registration successful.',
            token: accessToken,
            accessToken,
            user
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

exports.seekerLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const cleanEmail = String(email || '').toLowerCase().trim();
        const [users] = await pool.query('SELECT * FROM job_seekers WHERE email = ?', [cleanEmail]);

        if (users.length === 0) {
            const [empUsers] = await pool.query('SELECT id FROM employers WHERE email = ?', [cleanEmail]);
            if (empUsers.length > 0) {
                return res.status(401).json({ message: 'No job seeker account found with this email.' });
            }
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const actualRole = 'job_seeker';
        const tableName = 'job_seekers';

        const user = users[0];

        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            return res.status(401).json({ message: 'Account locked. Please try again later.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            let failedAttempts = (user.failed_login_attempts || 0) + 1;
            if (failedAttempts >= 10) {
                await pool.query(`UPDATE ${tableName} SET failed_login_attempts = ?, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?`, [failedAttempts, user.id]);
            } else {
                await pool.query(`UPDATE ${tableName} SET failed_login_attempts = ? WHERE id = ?`, [failedAttempts, user.id]);
            }
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.failed_login_attempts > 0 || user.locked_until) {
            await pool.query(`UPDATE ${tableName} SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`, [user.id]);
        }

        user.role = actualRole;
        const { accessToken } = await issueAuthTokens(res, user, actualRole);
        const dynamicRedirectUrl = (actualRole === 'employer') ? '/employer.html' : '/seeker.html';

        res.status(200).json({
            message: 'Login successful',
            token: accessToken,
            accessToken,
            redirectUrl: dynamicRedirectUrl,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: actualRole,
                company_name: user.company_name || null,
                account_status: user.account_status,
                profile_photo: user.profile_photo || user.profile_photo_url || '/uploads/default-avatar.png',
                profile_photo_url: user.profile_photo || user.profile_photo_url || '/uploads/default-avatar.png'
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

exports.seekerRefresh = async (req, res) => {
    const oldRefreshToken = req.cookies?.seeker_refreshToken || req.cookies?.refreshToken || req.body?.refreshToken;
    if (!oldRefreshToken) {
        return res.status(401).json({ message: 'No refresh token provided' });
    }

    try {
        let decoded;
        try {
            decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production');
        } catch (jwtErr) {
            return res.status(403).json({ message: 'Invalid or expired refresh token' });
        }

        if (decoded.role && decoded.role !== 'job_seeker') {
            return res.status(403).json({ message: 'Forbidden: Invalid token role for Job Seeker refresh.' });
        }

        // Query exclusively job_seekers table
        const [seekers] = await pool.query('SELECT * FROM job_seekers WHERE refresh_token = ?', [oldRefreshToken]);
        if (seekers.length === 0) {
            return res.status(403).json({ message: 'Invalid or revoked refresh token' });
        }

        const user = seekers[0];
        if (user.account_status === 'banned') {
            return res.status(403).json({ message: 'Account is banned' });
        }
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            return res.status(403).json({ message: 'Account locked. Please try again later.' });
        }

        user.role = 'job_seeker';
        const { accessToken } = await issueAuthTokens(res, user, 'job_seeker');

        res.status(200).json({
            message: 'Token refreshed successfully',
            token: accessToken,
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: 'job_seeker',
                account_status: user.account_status,
                profile_photo: user.profile_photo || user.profile_photo_url || '/uploads/default-avatar.png',
                profile_photo_url: user.profile_photo || user.profile_photo_url || '/uploads/default-avatar.png'
            }
        });
    } catch (error) {
        console.error('Seeker refresh token error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

exports.seekerGetMe = async (req, res) => {
    try {
        const seekerId = req.user.id;
        const [seekers] = await pool.query('SELECT * FROM job_seekers WHERE id = ?', [seekerId]);
        if (seekers.length === 0) {
            return res.status(404).json({ message: 'Job Seeker not found' });
        }
        const user = seekers[0];
        user.role = 'job_seeker';
        let photo = user.profile_picture || user.profile_photo || user.profile_photo_url || '/uploads/default-avatar.png';
        if (typeof photo === 'string') {
            photo = photo.trim();
            if (!photo.startsWith('http://') && !photo.startsWith('https://') && !photo.startsWith('data:') && !photo.startsWith('/')) {
                photo = '/' + photo;
            }
        }
        user.profile_picture = photo;
        user.profile_photo = photo;
        user.profile_photo_url = photo;
        delete user.password;
        delete user.refresh_token;
        delete user.two_factor_secret;
        res.status(200).json(user);
    } catch (error) {
        console.error('Seeker GetMe Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// --- Employer Auth ---
exports.employerRegister = async (req, res) => {
    const { name, email, password, registrationToken } = req.body;

    if (!registrationToken) return res.status(401).json({ message: 'Missing registration token. Please verify email first.' });

    try {
        const decoded = jwt.verify(registrationToken, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production');
        if (decoded.email !== email) return res.status(401).json({ message: 'Email does not match verified token.' });
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired registration token. Please verify email again.' });
    }

    const passwordRegex = /^(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long and contain at least one number and one special character.' });
    }

    try {
        const [existingEmployers] = await pool.query('SELECT id FROM employers WHERE email = ?', [email]);
        if (existingEmployers.length > 0) {
            return res.status(400).json({ message: 'This email is already registered as an Employer.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            'INSERT INTO employers (name, email, password, is_email_verified) VALUES (?, ?, ?, true)',
            [name, email, hashedPassword]
        );

        // Section 6 & FR-12 Sync: Keep users table in sync with is_approved = FALSE by default
        await pool.query(
            'INSERT INTO users (name, full_name, email, password, password_hash, role, is_approved) VALUES (?, ?, ?, ?, ?, "employer", FALSE) ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash)',
            [name, name, email, hashedPassword, hashedPassword]
        ).catch(err => console.warn('Sync to users table on employer register:', err.message));

        const user = { id: result.insertId, name, email, role: 'employer', account_status: 'active' };
        const { accessToken } = await issueAuthTokens(res, user, 'employer');

        res.status(201).json({
            message: 'Registration successful.',
            token: accessToken,
            accessToken,
            user
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

exports.employerLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const cleanEmail = String(email || '').toLowerCase().trim();
        const [users] = await pool.query('SELECT * FROM employers WHERE email = ?', [cleanEmail]);

        if (users.length === 0) {
            const [seekerUsers] = await pool.query('SELECT id FROM job_seekers WHERE email = ?', [cleanEmail]);
            if (seekerUsers.length > 0) {
                return res.status(401).json({ message: 'No employer account found with this email.' });
            }
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const actualRole = 'employer';
        const tableName = 'employers';

        const user = users[0];

        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            return res.status(401).json({ message: 'Account locked. Please try again later.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            let failedAttempts = (user.failed_login_attempts || 0) + 1;
            if (failedAttempts >= 10) {
                await pool.query(`UPDATE ${tableName} SET failed_login_attempts = ?, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?`, [failedAttempts, user.id]);
            } else {
                await pool.query(`UPDATE ${tableName} SET failed_login_attempts = ? WHERE id = ?`, [failedAttempts, user.id]);
            }
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.failed_login_attempts > 0 || user.locked_until) {
            await pool.query(`UPDATE ${tableName} SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`, [user.id]);
        }

        user.role = actualRole;
        const { accessToken } = await issueAuthTokens(res, user, actualRole);
        const dynamicRedirectUrl = (actualRole === 'employer') ? '/employer.html' : '/seeker.html';

        res.status(200).json({
            message: 'Login successful',
            token: accessToken,
            accessToken,
            redirectUrl: dynamicRedirectUrl,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: actualRole,
                company_name: user.company_name,
                account_status: user.account_status,
                profile_photo: user.profile_photo || user.profile_photo_url || '/uploads/default-avatar.png',
                profile_photo_url: user.profile_photo || user.profile_photo_url || '/uploads/default-avatar.png'
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

exports.employerRefresh = async (req, res) => {
    const oldRefreshToken = req.cookies?.employer_refreshToken || req.cookies?.refreshToken || req.body?.refreshToken;
    if (!oldRefreshToken) {
        return res.status(401).json({ message: 'No refresh token provided' });
    }

    try {
        let decoded;
        try {
            decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production');
        } catch (jwtErr) {
            return res.status(403).json({ message: 'Invalid or expired refresh token' });
        }

        if (decoded.role && decoded.role !== 'employer') {
            return res.status(403).json({ message: 'Forbidden: Invalid token role for Employer refresh.' });
        }

        // Query exclusively employers table
        const [employers] = await pool.query('SELECT * FROM employers WHERE refresh_token = ?', [oldRefreshToken]);
        if (employers.length === 0) {
            return res.status(403).json({ message: 'Invalid or revoked refresh token' });
        }

        const user = employers[0];
        if (user.account_status === 'banned') {
            return res.status(403).json({ message: 'Account is banned' });
        }
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            return res.status(403).json({ message: 'Account locked. Please try again later.' });
        }

        user.role = 'employer';
        const { accessToken } = await issueAuthTokens(res, user, 'employer');

        res.status(200).json({
            message: 'Token refreshed successfully',
            token: accessToken,
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: 'employer',
                account_status: user.account_status,
                company_name: user.company_name,
                profile_photo: user.profile_photo || user.profile_photo_url || '/uploads/default-avatar.png',
                profile_photo_url: user.profile_photo || user.profile_photo_url || '/uploads/default-avatar.png'
            }
        });
    } catch (error) {
        console.error('Employer refresh token error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

exports.employerGetMe = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required. No user session found.' });
        }
        const employerId = req.user.id;
        const employerEmail = req.user.email;

        let [employers] = await pool.query('SELECT * FROM employers WHERE id = ?', [employerId]);

        if (employers.length === 0 && employerEmail) {
            [employers] = await pool.query('SELECT * FROM employers WHERE email = ?', [employerEmail]);
        }

        if (employers.length === 0) {
            const [users] = await pool.query("SELECT * FROM users WHERE (id = ? OR email = ?) AND role = 'employer'", [employerId, employerEmail]);
            if (users.length > 0) {
                employers = users;
            }
        }

        if (employers.length === 0) {
            return res.status(404).json({ message: 'Employer profile not found' });
        }

        const user = employers[0];
        user.role = 'employer';
        let photo = user.profile_picture || user.profile_photo || user.profile_photo_url || '/uploads/default-avatar.png';
        if (typeof photo === 'string') {
            photo = photo.trim();
            if (!photo.startsWith('http://') && !photo.startsWith('https://') && !photo.startsWith('data:') && !photo.startsWith('/')) {
                photo = '/' + photo;
            }
        }
        user.profile_picture = photo;
        user.profile_photo = photo;
        user.profile_photo_url = photo;

        // Ensure key company fields are present
        user.company_name = user.company_name || user.name || '';
        user.contact_person = user.contact_person || user.name || '';
        user.headquarters_location = user.headquarters_location || user.location || '';
        user.about_company = user.about_company || user.bio || '';

        delete user.password;
        delete user.refresh_token;
        delete user.two_factor_secret;
        res.status(200).json(user);
    } catch (error) {
        console.error('Employer GetMe Error:', error);
        res.status(500).json({ message: `Database error while fetching profile: ${error.message}` });
    }
};

exports.seekerVerify = async (req, res) => {
    const { email, code } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM job_seekers WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = users[0];

        if (user.is_email_verified) return res.status(400).json({ message: 'Email is already verified.' });
        if (user.email_verification_code !== code) return res.status(400).json({ message: 'Invalid verification code.' });
        if (new Date() > new Date(user.email_verification_expires)) return res.status(400).json({ message: 'Verification code expired.' });

        await pool.query('UPDATE job_seekers SET is_email_verified = true, email_verification_code = NULL, email_verification_expires = NULL WHERE id = ?', [user.id]);

        user.role = 'job_seeker';
        const { accessToken } = await issueAuthTokens(res, user, 'job_seeker');

        res.status(200).json({
            message: 'Email verified successfully. Logging in...',
            token: accessToken,
            accessToken,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, account_status: user.account_status }
        });
    } catch (error) {
        console.error('Verify Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.employerVerify = async (req, res) => {
    const { email, code } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM employers WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = users[0];

        if (user.is_email_verified) return res.status(400).json({ message: 'Email is already verified.' });
        if (user.email_verification_code !== code) return res.status(400).json({ message: 'Invalid verification code.' });
        if (new Date() > new Date(user.email_verification_expires)) return res.status(400).json({ message: 'Verification code expired.' });

        await pool.query('UPDATE employers SET is_email_verified = true, email_verification_code = NULL, email_verification_expires = NULL WHERE id = ?', [user.id]);

        user.role = 'employer';
        const { accessToken } = await issueAuthTokens(res, user, 'employer');

        res.status(200).json({
            message: 'Email verified successfully. Logging in...',
            token: accessToken,
            accessToken,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, account_status: user.account_status }
        });
    } catch (error) {
        console.error('Verify Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.sendOtp = async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ message: 'A valid email address is required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    try {
        const [existingAdmins] = await pool.query('SELECT id FROM admins WHERE email = ?', [trimmedEmail]);
        const [existingEmployers] = await pool.query('SELECT id FROM employers WHERE email = ?', [trimmedEmail]);
        const [existingSeekers] = await pool.query('SELECT id FROM job_seekers WHERE email = ?', [trimmedEmail]);

        if (existingAdmins.length > 0 || existingEmployers.length > 0 || existingSeekers.length > 0) {
            return res.status(400).json({ message: 'This email is already registered in the system.' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiryDate = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        // Upsert pending_verifications
        await pool.query(
            `INSERT INTO pending_verifications (email, code, expires_at, verified)
             VALUES (?, ?, ?, false)
             ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at), verified = false`,
            [trimmedEmail, verificationCode, expiryDate]
        );

        const emailSent = await sendVerificationEmail(trimmedEmail, verificationCode);
        if (!emailSent) {
            return res.status(500).json({
                message: 'Failed to deliver verification email. Please ensure EMAIL_USER and EMAIL_APP_PASSWORD are configured on the server.'
            });
        }

        res.status(200).json({ message: 'Verification code sent to your email.' });
    } catch (error) {
        console.error('Send OTP Error:', error);
        res.status(500).json({ message: error.message || 'Internal server error while sending verification code.' });
    }
};

exports.verifyOtp = async (req, res) => {
    const { email, code } = req.body;
    try {
        const [pending] = await pool.query('SELECT * FROM pending_verifications WHERE email = ?', [email]);
        if (pending.length === 0) return res.status(404).json({ message: 'OTP request not found.' });

        const verification = pending[0];
        if (verification.code !== code) return res.status(400).json({ message: 'Invalid verification code.' });
        if (new Date() > new Date(verification.expires_at)) return res.status(400).json({ message: 'Verification code expired.' });

        await pool.query('UPDATE pending_verifications SET verified = true WHERE email = ?', [email]);

        const registrationToken = jwt.sign(
            { email },
            process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
            { expiresIn: '15m' }
        );

        res.status(200).json({ message: 'Email verified.', registrationToken });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// --- Refresh Token Rotation (Sliding Sessions) ---
exports.refreshToken = async (req, res) => {
    const oldRefreshToken = req.cookies?.refreshToken || req.cookies?.seeker_refreshToken || req.cookies?.employer_refreshToken || req.body?.refreshToken;

    if (!oldRefreshToken) {
        return res.status(401).json({ message: 'No refresh token provided' });
    }

    try {
        let user = null;
        let role = null;
        let table = null;

        // Query database to find matching refresh token across all tables
        const [seekers] = await pool.query('SELECT * FROM job_seekers WHERE refresh_token = ?', [oldRefreshToken]);
        if (seekers.length > 0) {
            user = seekers[0];
            role = 'job_seeker';
            table = 'job_seekers';
        } else {
            const [employers] = await pool.query('SELECT * FROM employers WHERE refresh_token = ?', [oldRefreshToken]);
            if (employers.length > 0) {
                user = employers[0];
                role = 'employer';
                table = 'employers';
            } else {
                const [admins] = await pool.query('SELECT * FROM admins WHERE refresh_token = ?', [oldRefreshToken]);
                if (admins.length > 0) {
                    user = admins[0];
                    role = user.role || 'admin';
                    table = 'admins';
                }
            }
        }

        if (!user) {
            return res.status(403).json({ message: 'Invalid or revoked refresh token' });
        }

        // Account status check
        if (user.account_status === 'banned') {
            return res.status(403).json({ message: 'Account is banned' });
        }
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            return res.status(403).json({ message: 'Account locked. Please try again later.' });
        }

        user.role = user.role || role;

        // Generate BOTH new accessToken (15m) AND new refreshToken (7d),
        // invalidate old token in DB, save new token, and overwrite the HttpOnly cookie
        const { accessToken } = await issueAuthTokens(res, user, user.role);

        res.status(200).json({
            message: 'Token refreshed successfully',
            token: accessToken,
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                account_status: user.account_status,
                profile_photo: user.profile_photo || user.profile_photo_url || '/uploads/default-avatar.png',
                profile_photo_url: user.profile_photo || user.profile_photo_url || '/uploads/default-avatar.png'
            }
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

exports.seekerLogout = async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.cookies?.seeker_refreshToken;
    if (refreshToken) {
        try {
            await pool.query('UPDATE job_seekers SET refresh_token = NULL WHERE refresh_token = ?', [refreshToken]);
        } catch (e) {
            console.error('Error clearing refresh token in DB:', e);
        }
    }
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('seeker_accessToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('seeker_refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.status(200).json({ message: 'Seeker logged out successfully' });
};

exports.employerLogout = async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.cookies?.employer_refreshToken;
    if (refreshToken) {
        try {
            await pool.query('UPDATE employers SET refresh_token = NULL WHERE refresh_token = ?', [refreshToken]);
        } catch (e) {
            console.error('Error clearing refresh token in DB:', e);
        }
    }
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('employer_accessToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('employer_refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.status(200).json({ message: 'Employer logged out successfully' });
};

exports.logout = async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.cookies?.seeker_refreshToken || req.cookies?.employer_refreshToken;
    if (refreshToken) {
        try {
            await pool.query('UPDATE job_seekers SET refresh_token = NULL WHERE refresh_token = ?', [refreshToken]);
            await pool.query('UPDATE employers SET refresh_token = NULL WHERE refresh_token = ?', [refreshToken]);
            await pool.query('UPDATE admins SET refresh_token = NULL WHERE refresh_token = ?', [refreshToken]);
        } catch (e) {
            console.error('Error clearing refresh token in DB:', e);
        }
    }
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('seeker_accessToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('seeker_refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('employer_accessToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('employer_refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.status(200).json({ message: 'Logged out successfully' });
};

