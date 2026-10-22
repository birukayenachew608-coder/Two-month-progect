const jwt = require('jsonwebtoken');

// Helper to reliably extract JWT token from Authorization header or cookies
function extractToken(req, targetRole) {
    let authHeader = req.headers && req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (token === 'null' || token === 'undefined') {
        token = null;
    }

    if (req.cookies) {
        if (token === 'employer_secure_cookie' || (targetRole === 'employer' && (!token || token.includes('cookie')))) {
            token = req.cookies.employer_accessToken || req.cookies.token || token;
        } else if (token === 'seeker_secure_cookie' || ((targetRole === 'job_seeker' || targetRole === 'seeker') && (!token || token.includes('cookie')))) {
            token = req.cookies.seeker_accessToken || req.cookies.token || token;
        } else if (token === 'secure_cookie_auth' || ((targetRole === 'admin' || targetRole === 'super_admin') && (!token || token.includes('cookie')))) {
            token = req.cookies.token || token;
        } else if (!token || token.includes('cookie')) {
            if (targetRole === 'employer') {
                token = req.cookies.employer_accessToken || req.cookies.token;
            } else if (targetRole === 'job_seeker' || targetRole === 'seeker') {
                token = req.cookies.seeker_accessToken || req.cookies.token;
            } else if (targetRole === 'admin' || targetRole === 'super_admin') {
                token = req.cookies.token;
            } else {
                token = req.cookies.token || req.cookies.employer_accessToken || req.cookies.seeker_accessToken;
            }
        }
    }

    if (token === 'seeker_secure_cookie' || token === 'employer_secure_cookie' || token === 'secure_cookie_auth') {
        if (req.cookies) {
            token = req.cookies.token || req.cookies.employer_accessToken || req.cookies.seeker_accessToken || null;
        } else {
            token = null;
        }
    }

    return token;
}

// 1. General JWT Authentication Middleware
exports.authenticateToken = (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ 
            status: 401, 
            error: 'Unauthorized', 
            message: 'Access denied. No valid token provided.' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            status: 401, 
            error: 'Unauthorized', 
            message: 'Invalid or expired token.' 
        });
    }
};

// 2. Generic Role Authorization Middleware
exports.requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        const normalizedAllowed = allowedRoles.map(r => (r === 'seeker' ? 'job_seeker' : r));
        if (normalizedAllowed.includes('admin') && !normalizedAllowed.includes('super_admin')) {
            normalizedAllowed.push('super_admin');
        }

        const targetHint = normalizedAllowed.length === 1 ? normalizedAllowed[0] : null;

        // If req.user is not yet populated by authenticateToken, verify token here
        if (!req.user || !req.user.role) {
            const token = extractToken(req, targetHint);
            if (!token) {
                return res.status(401).json({ 
                    status: 401, 
                    error: 'Unauthorized', 
                    message: 'Access denied. Authentication required.' 
                });
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production');
                req.user = decoded;
            } catch (error) {
                return res.status(401).json({ 
                    status: 401, 
                    error: 'Unauthorized', 
                    message: 'Invalid or expired token.' 
                });
            }
        }

        const userRole = req.user.role === 'seeker' ? 'job_seeker' : req.user.role;
        if (!normalizedAllowed.includes(userRole)) {
            const roleLabels = allowedRoles.map(r => r === 'job_seeker' ? 'Job Seeker' : (r === 'employer' ? 'Employer' : 'Administrator'));
            return res.status(403).json({ 
                status: 403, 
                error: 'Forbidden', 
                message: `Access Denied: This operation requires ${roleLabels.join(' or ')} privileges.` 
            });
        }

        next();
    };
};
exports.authorizeRole = exports.requireRole;

// 3. Strict Role-Specific Middleware: Job Seeker
exports.requireSeeker = (req, res, next) => {
    exports.requireRole('job_seeker')(req, res, next);
};
exports.verifySeeker = exports.requireSeeker;

// 4. Strict Role-Specific Middleware: Employer
exports.requireEmployer = (req, res, next) => {
    exports.requireRole('employer')(req, res, next);
};
exports.verifyEmployer = exports.requireEmployer;

// 5. Strict Role-Specific Middleware: Admin & Super Admin
exports.requireAdmin = (req, res, next) => {
    exports.requireRole('admin', 'super_admin')(req, res, next);
};
exports.verifyAdmin = exports.requireAdmin;

// 6. Strict Role-Specific Middleware: Super Admin Only
exports.requireSuperAdmin = (req, res, next) => {
    exports.requireRole('super_admin')(req, res, next);
};
exports.verifySuperAdmin = exports.requireSuperAdmin;

// 7. IP Whitelist Middleware (for Admin routes)
exports.checkIpWhitelist = async (req, res, next) => {
    if (process.env.ENABLE_STRICT_IP_WHITELIST !== 'true') {
        return next();
    }

    try {
        const pool = require('../config/db');
        const [ips] = await pool.query('SELECT ip_address FROM whitelisted_ips');
        
        if (ips.length === 0) {
            return next();
        }
        
        const clientIp = req.ip || req.connection.remoteAddress;
        const normalizedIp = clientIp.includes('::ffff:') ? clientIp.split('::ffff:')[1] : clientIp;
        
        const isWhitelisted = ips.some(row => {
            if (row.ip_address === normalizedIp || row.ip_address === clientIp) return true;
            if (row.ip_address.includes('/24')) {
                const base = row.ip_address.split('/')[0].split('.').slice(0,3).join('.');
                return normalizedIp.startsWith(base + '.');
            }
            return false;
        });
        
        if (!isWhitelisted) {
            console.warn(`[Security] Blocked access from non-whitelisted IP: ${normalizedIp}`);
            return res.status(403).json({ message: 'Access forbidden: IP address not whitelisted in Strict Mode.' });
        }
        
        next();
    } catch (error) {
        console.error('IP Whitelist check error:', error);
        res.status(500).json({ message: 'Internal server error during IP check' });
    }
};

// 8. Dynamic Status Check for Job Seekers (blocks banned seekers from performing restricted actions)
exports.checkNotBannedSeeker = async (req, res, next) => {
    try {
        const pool = require('../config/db');
        const seekerId = (req.user && req.user.id) || req.body.seeker_id || req.body.userId;
        if (seekerId) {
            const [seekerRows] = await pool.query('SELECT account_status FROM job_seekers WHERE id = ?', [seekerId]);
            if (seekerRows.length > 0 && String(seekerRows[0].account_status).toLowerCase() === 'banned') {
                return res.status(403).json({ message: 'Your account is banned. You cannot perform this action.' });
            }
        }
        next();
    } catch (err) {
        console.error('Banned seeker check error:', err);
        next();
    }
};
