const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `http://localhost:${process.env.PORT || 3000}/auth/google/callback`,
        scope: ['profile', 'email'],
        passReqToCallback: true
    }, async (req, accessToken, refreshToken, profile, done) => {
        try {
            const googleId = profile.id;
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            const name = profile.displayName || (profile.name ? `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim() : 'Google User');
            const photo = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

            if (!email && !googleId) {
                return done(new Error('Google did not return user email or ID'), null);
            }

            // Retrieve the state parameter to know intended role
            const rawState = (req.query && req.query.state) ? String(req.query.state).toLowerCase() : '';
            const intendedRole = rawState.includes('employer') ? 'employer' : 'job_seeker';

            // Query existing users across all tables
            const [employers] = await pool.query('SELECT * FROM employers WHERE google_id = ? OR email = ?', [googleId, email]);
            const [seekers] = await pool.query('SELECT * FROM job_seekers WHERE google_id = ? OR email = ?', [googleId, email]);
            const [admins] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);

            let user = null;
            let role = intendedRole;

            if (employers.length > 0) {
                // User already exists as an Employer in DB
                if (intendedRole !== 'employer') {
                    return done(null, false, { message: 'This email is already registered as an Employer' });
                }
                user = employers[0];
                user.role = 'employer';
                role = 'employer';
                if (!user.google_id) {
                    await pool.query('UPDATE employers SET google_id = ? WHERE id = ?', [googleId, user.id]);
                    user.google_id = googleId;
                }
            } else if (seekers.length > 0) {
                // User already exists as a Job Seeker in DB
                if (intendedRole !== 'job_seeker') {
                    return done(null, false, { message: 'This email is already registered as a Job Seeker' });
                }
                user = seekers[0];
                user.role = 'job_seeker';
                role = 'job_seeker';
                if (!user.google_id) {
                    await pool.query('UPDATE job_seekers SET google_id = ? WHERE id = ?', [googleId, user.id]);
                    user.google_id = googleId;
                }
            } else if (admins.length > 0) {
                // User is an administrator
                return done(null, false, { message: 'This email is already registered as an Administrator' });
            } else {
                // New user: register using the intended role from state
                if (intendedRole === 'employer') {
                    role = 'employer';
                    const [result] = await pool.query(
                        'INSERT INTO employers (name, email, password, google_id, company_name, profile_photo_url, account_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [name, email, 'google_oauth_user', googleId, name, photo, 'active']
                    );
                    const [newEmployers] = await pool.query('SELECT * FROM employers WHERE id = ?', [result.insertId]);
                    user = newEmployers[0];

                    try {
                        await pool.query(
                            'INSERT IGNORE INTO users (name, email, google_id, role, account_status) VALUES (?, ?, ?, ?, ?)',
                            [name, email, googleId, 'employer', 'active']
                        );
                    } catch (e) {
                        console.error('Users table sync error:', e);
                    }
                } else {
                    role = 'job_seeker';
                    const [result] = await pool.query(
                        'INSERT INTO job_seekers (name, email, google_id, profile_photo_url, is_email_verified, account_status) VALUES (?, ?, ?, ?, true, ?)',
                        [name, email, googleId, photo, 'active']
                    );
                    const [newUsers] = await pool.query('SELECT * FROM job_seekers WHERE id = ?', [result.insertId]);
                    user = newUsers[0];

                    try {
                        await pool.query(
                            'INSERT IGNORE INTO users (name, email, google_id, role, account_status) VALUES (?, ?, ?, ?, ?)',
                            [name, email, googleId, 'job_seeker', 'active']
                        );
                    } catch (e) {
                        console.error('Users table sync error:', e);
                    }
                }
            }

            user.role = role;
            return done(null, user);
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

    try {
        let user = null;
        let foundRole = role;

        // If role is provided, only check that specific table
        if (role) {
            let tableName = 'job_seekers';
            if (role === 'employer') tableName = 'employers';
            if (role === 'admin' || role === 'super_admin') tableName = 'admins';

            const [users] = await pool.query(`SELECT * FROM ${tableName} WHERE email = ?`, [email]);
            if (users.length > 0) {
                user = users[0];
                if (tableName !== 'admins') user.role = role;
            }
        } else {
            // If no role provided (fallback), check all tables
            const [admins] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
            if (admins.length > 0) {
                user = admins[0];
                foundRole = user.role;
            } else {
                const [employers] = await pool.query('SELECT * FROM employers WHERE email = ?', [email]);
                if (employers.length > 0) {
                    user = employers[0];
                    user.role = 'employer';
                    foundRole = 'employer';
                } else {
                    const [seekers] = await pool.query('SELECT * FROM job_seekers WHERE email = ?', [email]);
                    if (seekers.length > 0) {
                        user = seekers[0];
                        user.role = 'job_seeker';
                        foundRole = 'job_seeker';
                    }
                }
            }
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
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

        const token = jwt.sign(
            { id: user.id, email: user.email, role: role },
            process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: 'Switched role successfully',
            token,
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

        let photo = user.profile_photo || user.profile_photo_url;
        
        // If not found directly, check strictly role-specific table
        if (!photo) {
            if (user.role === 'job_seeker') {
                const [seekers] = await pool.query(
                    'SELECT profile_photo, profile_photo_url FROM job_seekers WHERE id = ? OR email = ?',
                    [id, email || user.email || '']
                ).catch(() => [[]]);
                if (seekers.length > 0) {
                    photo = seekers[0].profile_photo || seekers[0].profile_photo_url;
                }
            } else if (user.role === 'employer') {
                const [employers] = await pool.query(
                    'SELECT profile_photo, profile_photo_url FROM employers WHERE id = ? OR email = ?',
                    [id, email || user.email || '']
                ).catch(() => [[]]);
                if (employers.length > 0) {
                    photo = employers[0].profile_photo || employers[0].profile_photo_url;
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
                'SELECT profile_photo FROM users WHERE (id = ? OR email = ?) AND role = ?',
                [id, email || user.email || '', user.role]
            ).catch(() => [[]]);
            if (globalUsers.length > 0 && globalUsers[0].profile_photo) {
                photo = globalUsers[0].profile_photo;
            }
        }

        // Normalize path: absolute with leading slash or external URL
        if (photo && typeof photo === 'string') {
            photo = photo.trim();
            if (!photo.startsWith('http://') && !photo.startsWith('https://') && !photo.startsWith('/')) {
                photo = '/' + photo;
            }
        }

        const defaultAvatar = '/uploads/default-avatar.png';
        const finalPhoto = photo || defaultAvatar;

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
    const redirectUri = `http://localhost:${process.env.PORT || 3000}/api/auth/github/callback`;
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
        
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production', { expiresIn: '7d' });
        
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

// --- LinkedIn OAuth ---
exports.linkedinAuth = (req, res) => {
    const role = req.query.role || 'job_seeker';
    const clientId = process.env.LINKEDIN_CLIENT_ID || 'mock_linkedin_client_id';
    const redirectUri = `http://localhost:${process.env.PORT || 3000}/api/auth/linkedin/callback`;
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=r_liteprofile%20r_emailaddress&state=${role}`;
    res.redirect(url);
};

exports.linkedinCallback = async (req, res) => {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('No code provided');
    
    const role = state === 'employer' ? 'employer' : 'job_seeker';
    const table = role === 'employer' ? 'employers' : 'job_seekers';
    
    try {
        let name = 'LinkedIn User';
        let email = `linkedin_${code}@mock.com`;
        let linkedinId = `li_${code}`;
        
        let [users] = await pool.query(`SELECT * FROM ${table} WHERE linkedin_id = ?`, [linkedinId]);
        let user;
        
        if (users.length === 0) {
            [users] = await pool.query(`SELECT * FROM ${table} WHERE email = ?`, [email]);
            if (users.length > 0) {
                user = users[0];
                await pool.query(`UPDATE ${table} SET linkedin_id = ? WHERE id = ?`, [linkedinId, user.id]);
            } else {
                const [result] = await pool.query(
                    `INSERT INTO ${table} (name, email, linkedin_id) VALUES (?, ?, ?)`,
                    [name, email, linkedinId]
                );
                const [newUsers] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);
                user = newUsers[0];
            }
        } else {
            user = users[0];
        }
        user.role = role;
        
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production', { expiresIn: '7d' });
        
        const redirectPage = role === 'employer' ? '/employer.html' : '/seeker.html';
        const rolePrefix = role === 'employer' ? 'employer_' : 'seeker_';
        
        res.send(`<html><body><script>
            localStorage.setItem('token', '${token}');
            localStorage.setItem('user', JSON.stringify(${JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role, account_status: user.account_status || 'active' })}));
            localStorage.setItem('${rolePrefix}token', '${token}');
            localStorage.setItem('${rolePrefix}user', JSON.stringify(${JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role, account_status: user.account_status || 'active' })}));
            window.location.href = '${redirectPage}';
        </script></body></html>`);
    } catch (error) {
        console.error('LinkedIn OAuth Error:', error);
        res.status(500).send('Authentication failed');
    }
};

// --- Google OAuth ---
exports.googleAuth = (req, res, next) => {
    const rawState = req.query.state || 'jobseeker';
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: rawState,
        session: false
    })(req, res, next);
};

exports.googleCallback = (req, res, next) => {
    passport.authenticate('google', { session: false }, async (err, user, info) => {
        if (err || !user) {
            const errorMsg = (info && info.message) || (err && err.message) || 'Google authentication failed';
            console.error('Google OAuth callback error / role mismatch:', errorMsg);
            return res.redirect(`/?error=${encodeURIComponent(errorMsg)}`);
        }

        try {
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
                { expiresIn: '7d' }
            );

            const refreshToken = crypto.randomBytes(64).toString('hex');
            const table = user.role === 'employer' ? 'employers' : 'job_seekers';
            try {
                await pool.query(`UPDATE ${table} SET refresh_token = ? WHERE id = ?`, [refreshToken, user.id]);
                const cookiePrefix = user.role === 'employer' ? 'employer_' : 'seeker_';
                res.cookie(`${cookiePrefix}accessToken`, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
                res.cookie(`${cookiePrefix}refreshToken`, refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 });
            } catch (e) {
                console.error('Error saving refresh token for Google user:', e);
            }

            const redirectPage = user.role === 'employer' ? '/employer.html' : '/seeker.html';
            const rolePrefix = user.role === 'employer' ? 'employer_' : 'seeker_';

            res.send(`<!DOCTYPE html>
<html>
<head><title>Google Authentication</title></head>
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
            console.error('Google Callback Token Error:', error);
            res.redirect(`/?error=${encodeURIComponent('Authentication processing error')}`);
        }
    })(req, res, next);
};

const crypto = require('crypto');
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
        const [existingAdmins] = await pool.query('SELECT id FROM admins WHERE email = ?', [email]);
        const [existingEmployers] = await pool.query('SELECT id FROM employers WHERE email = ?', [email]);
        const [existingSeekers] = await pool.query('SELECT id FROM job_seekers WHERE email = ?', [email]);
        
        if (existingAdmins.length > 0 || existingEmployers.length > 0 || existingSeekers.length > 0) {
            return res.status(400).json({ message: 'This email is already registered in the system.' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            'INSERT INTO job_seekers (name, email, password, is_email_verified) VALUES (?, ?, ?, true)',
            [name, email, hashedPassword]
        );
        
        const user = { id: result.insertId, name, email, role: 'job_seeker', account_status: 'active' };

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
            { expiresIn: '7d' }
        );
        
        const refreshToken = crypto.randomBytes(64).toString('hex');
        await pool.query('UPDATE job_seekers SET refresh_token = ? WHERE id = ?', [refreshToken, user.id]);
        
        res.cookie('seeker_accessToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.cookie('seeker_refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 });
        
        res.status(201).json({ 
            message: 'Registration successful.', 
            token, 
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
        const [users] = await pool.query('SELECT * FROM job_seekers WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ message: 'Invalid email or password' });
        
        const user = users[0];
        
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            return res.status(401).json({ message: 'Account locked. Please try again later.' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            let failedAttempts = (user.failed_login_attempts || 0) + 1;
            if (failedAttempts >= 10) {
                await pool.query('UPDATE job_seekers SET failed_login_attempts = ?, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?', [failedAttempts, user.id]);
            } else {
                await pool.query('UPDATE job_seekers SET failed_login_attempts = ? WHERE id = ?', [failedAttempts, user.id]);
            }
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        if (user.failed_login_attempts > 0 || user.locked_until) {
            await pool.query('UPDATE job_seekers SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);
        }
        
        user.role = 'job_seeker';
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
            { expiresIn: '7d' }
        );
        
        const refreshToken = crypto.randomBytes(64).toString('hex');
        await pool.query('UPDATE job_seekers SET refresh_token = ? WHERE id = ?', [refreshToken, user.id]);
        
        res.cookie('seeker_accessToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.cookie('seeker_refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 });
        
        res.status(200).json({
            message: 'Login successful',
            token,
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
        console.error('Login Error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

exports.seekerRefresh = async (req, res) => {
    const refreshToken = req.cookies.seeker_refreshToken;
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });
    
    try {
        const [users] = await pool.query('SELECT * FROM job_seekers WHERE refresh_token = ?', [refreshToken]);
        if (users.length === 0) return res.status(403).json({ message: 'Invalid refresh token' });
        
        const user = users[0];
        user.role = 'job_seeker';
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
            { expiresIn: '7d' }
        );
        
        res.cookie('seeker_accessToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
        
        res.status(200).json({
            message: 'Token refreshed successfully',
            token,
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
        console.error('Refresh Error:', error);
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
        const [existingAdmins] = await pool.query('SELECT id FROM admins WHERE email = ?', [email]);
        const [existingEmployers] = await pool.query('SELECT id FROM employers WHERE email = ?', [email]);
        const [existingSeekers] = await pool.query('SELECT id FROM job_seekers WHERE email = ?', [email]);
        
        if (existingAdmins.length > 0 || existingEmployers.length > 0 || existingSeekers.length > 0) {
            return res.status(400).json({ message: 'This email is already registered in the system.' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            'INSERT INTO employers (name, email, password, is_email_verified) VALUES (?, ?, ?, true)',
            [name, email, hashedPassword]
        );
        
        const user = { id: result.insertId, name, email, role: 'employer', account_status: 'active' };

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
            { expiresIn: '7d' }
        );
        
        const refreshToken = crypto.randomBytes(64).toString('hex');
        await pool.query('UPDATE employers SET refresh_token = ? WHERE id = ?', [refreshToken, user.id]);
        
        res.cookie('employer_accessToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.cookie('employer_refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 });

        res.status(201).json({ 
            message: 'Registration successful.', 
            token, 
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
        const [users] = await pool.query('SELECT * FROM employers WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ message: 'Invalid email or password' });
        
        const user = users[0];
        
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            return res.status(401).json({ message: 'Account locked. Please try again later.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            let failedAttempts = (user.failed_login_attempts || 0) + 1;
            if (failedAttempts >= 10) {
                await pool.query('UPDATE employers SET failed_login_attempts = ?, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?', [failedAttempts, user.id]);
            } else {
                await pool.query('UPDATE employers SET failed_login_attempts = ? WHERE id = ?', [failedAttempts, user.id]);
            }
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        if (user.failed_login_attempts > 0 || user.locked_until) {
            await pool.query('UPDATE employers SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);
        }

        user.role = 'employer';
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
            { expiresIn: '7d' }
        );
        
        const refreshToken = crypto.randomBytes(64).toString('hex');
        await pool.query('UPDATE employers SET refresh_token = ? WHERE id = ?', [refreshToken, user.id]);
        
        res.cookie('employer_accessToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.cookie('employer_refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 });
        
        res.status(200).json({
            message: 'Login successful',
            token,
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
        console.error('Login Error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

exports.employerRefresh = async (req, res) => {
    const refreshToken = req.cookies.employer_refreshToken;
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });
    
    try {
        const [users] = await pool.query('SELECT * FROM employers WHERE refresh_token = ?', [refreshToken]);
        if (users.length === 0) return res.status(403).json({ message: 'Invalid refresh token' });
        
        const user = users[0];
        user.role = 'employer';
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
            { expiresIn: '7d' }
        );
        
        res.cookie('employer_accessToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
        
        res.status(200).json({
            message: 'Token refreshed successfully',
            token,
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
        console.error('Refresh Error:', error);
        res.status(500).json({ message: 'Internal server error' });
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
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
            { expiresIn: '7d' }
        );
        
        const refreshToken = crypto.randomBytes(64).toString('hex');
        await pool.query('UPDATE job_seekers SET refresh_token = ? WHERE id = ?', [refreshToken, user.id]);
        
        res.cookie('seeker_accessToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.cookie('seeker_refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 });
        
        res.status(200).json({
            message: 'Email verified successfully. Logging in...',
            token,
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
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
            { expiresIn: '7d' }
        );
        
        const refreshToken = crypto.randomBytes(64).toString('hex');
        await pool.query('UPDATE employers SET refresh_token = ? WHERE id = ?', [refreshToken, user.id]);
        
        res.cookie('employer_accessToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.cookie('employer_refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 });
        
        res.status(200).json({
            message: 'Email verified successfully. Logging in...',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, account_status: user.account_status }
        });
    } catch (error) {
        console.error('Verify Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.sendOtp = async (req, res) => {
    const { email } = req.body;
    try {
        const [existingAdmins] = await pool.query('SELECT id FROM admins WHERE email = ?', [email]);
        const [existingEmployers] = await pool.query('SELECT id FROM employers WHERE email = ?', [email]);
        const [existingSeekers] = await pool.query('SELECT id FROM job_seekers WHERE email = ?', [email]);
        
        if (existingAdmins.length > 0 || existingEmployers.length > 0 || existingSeekers.length > 0) {
            return res.status(400).json({ message: 'This email is already registered in the system.' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiryDate = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        // Upsert pending_verifications
        const [existingPending] = await pool.query('SELECT id FROM pending_verifications WHERE email = ?', [email]);
        if (existingPending.length > 0) {
            await pool.query('UPDATE pending_verifications SET code = ?, expires_at = ?, verified = false WHERE email = ?', [verificationCode, expiryDate, email]);
        } else {
            await pool.query('INSERT INTO pending_verifications (email, code, expires_at, verified) VALUES (?, ?, ?, false)', [email, verificationCode, expiryDate]);
        }

        await sendVerificationEmail(email, verificationCode);
        res.status(200).json({ message: 'OTP sent successfully.' });
    } catch (error) {
        console.error('Send OTP Error:', error);
        res.status(500).json({ message: 'Internal server error' });
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

exports.seekerLogout = async (req, res) => {
    res.clearCookie('seeker_accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
    res.clearCookie('seeker_refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
    res.status(200).json({ message: 'Seeker logged out successfully' });
};

exports.employerLogout = async (req, res) => {
    res.clearCookie('employer_accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
    res.clearCookie('employer_refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
    res.status(200).json({ message: 'Employer logged out successfully' });
};

