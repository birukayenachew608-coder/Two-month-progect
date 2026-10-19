const jwt = require('jsonwebtoken');

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    
    if (req.cookies) {
        if (token === 'employer_secure_cookie') {
            token = req.cookies.employer_accessToken;
        } else if (token === 'seeker_secure_cookie') {
            token = req.cookies.seeker_accessToken;
        } else if (token === 'secure_cookie_auth') {
            token = req.cookies.token;
        } else if (!token || token === 'null' || token === 'undefined') {
            token = req.cookies.token || req.cookies.employer_accessToken || req.cookies.seeker_accessToken;
        }
    }

    if (!token || token === 'null' || token === 'undefined' || token === 'secure_cookie_auth' || token === 'seeker_secure_cookie' || token === 'employer_secure_cookie') {
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else {
            return res.status(401).json({ status: 401, error: 'Unauthorized', message: 'Access denied. No valid token provided.' });
        }
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ status: 401, error: 'Unauthorized', message: 'Invalid or expired token.' });
    }
};

exports.verifySeeker = (req, res, next) => {
    let authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (req.cookies) {
        if (token === 'seeker_secure_cookie' || !token) {
            token = req.cookies.seeker_accessToken || (!authHeader ? req.cookies.token : null) || token;
        }
    }

    if (!token || token === 'seeker_secure_cookie' || token === 'employer_secure_cookie') {
        return res.status(401).json({ message: 'Access denied. No valid Job Seeker token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production');
        if (decoded.role !== 'job_seeker') {
            return res.status(403).json({ message: 'Forbidden: Job Seeker access required.' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

exports.verifyEmployer = (req, res, next) => {
    let authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (req.cookies) {
        if (token === 'employer_secure_cookie' || !token) {
            token = req.cookies.employer_accessToken || (!authHeader ? req.cookies.token : null) || token;
        }
    }

    if (!token || token === 'seeker_secure_cookie' || token === 'employer_secure_cookie') {
        return res.status(401).json({ message: 'Access denied. No valid Employer token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production');
        if (decoded.role !== 'employer') {
            return res.status(403).json({ message: 'Forbidden: Employer access required.' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

exports.authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        // If req.user is not yet populated, extract and verify access token from headers or cookies
        if (!req.user || !req.user.role) {
            let authHeader = req.headers && req.headers['authorization'];
            let token = authHeader && authHeader.split(' ')[1];

            if (req.cookies && (!token || token.includes('cookie') || token === 'null' || token === 'undefined')) {
                if ((allowedRoles.includes('admin') || allowedRoles.includes('super_admin')) && req.cookies.token) {
                    token = req.cookies.token;
                } else if (allowedRoles.includes('job_seeker') && req.cookies.seeker_accessToken) {
                    token = req.cookies.seeker_accessToken;
                } else if (allowedRoles.includes('employer') && req.cookies.employer_accessToken) {
                    token = req.cookies.employer_accessToken;
                } else {
                    token = req.cookies.token || req.cookies.employer_accessToken || req.cookies.seeker_accessToken;
                }
            }

            if (token && token !== 'seeker_secure_cookie' && token !== 'employer_secure_cookie' && token !== 'secure_cookie_auth' && token !== 'null' && token !== 'undefined') {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production');
                    req.user = decoded;
                } catch (error) {
                    if (req.accepts && req.accepts('html') && !req.xhr && !req.path.startsWith('/api/')) {
                        return res.redirect('/admin-login.html');
                    }
                    return res.status(401).json({ status: 401, error: 'Unauthorized', message: 'Invalid or expired token.' });
                }
            }
        }

        // Check the req.user.role property (extracted from verified access token)
        if (!req.user || !req.user.role) {
            if (req.accepts && req.accepts('html') && !req.xhr && !req.path.startsWith('/api/')) {
                return res.redirect('/admin-login.html');
            }
            return res.status(401).json({ status: 401, error: 'Unauthorized', message: 'Unauthorized: Authentication required.' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            if (req.accepts && req.accepts('html') && !req.xhr && !req.path.startsWith('/api/')) {
                return res.redirect(req.user.role === 'admin' ? '/admin.html' : '/admin-login.html');
            }
            return res.status(403).json({ 
                status: 403,
                error: 'Forbidden',
                message: `Forbidden: Access requires role ${allowedRoles.join(' or ')}.` 
            });
        }

        next();
    };
};

exports.requireRole = exports.authorizeRole;

exports.verifyAdmin = (req, res, next) => {
    exports.authorizeRole('admin', 'super_admin')(req, res, next);
};

exports.verifySuperAdmin = (req, res, next) => {
    exports.authorizeRole('super_admin')(req, res, next);
};

exports.checkIpWhitelist = async (req, res, next) => {
    // If strict IP whitelisting is not explicitly enabled, allow access (prevents blocking admins on cloud deployments like Render)
    if (process.env.ENABLE_STRICT_IP_WHITELIST !== 'true') {
        return next();
    }

    try {
        const pool = require('../config/db');
        const [ips] = await pool.query('SELECT ip_address FROM whitelisted_ips');
        
        // If no IPs are whitelisted, allow access (Strict Mode is effectively disabled)
        if (ips.length === 0) {
            return next();
        }
        
        const clientIp = req.ip || req.connection.remoteAddress;
        // Normalize IPv6 mapped IPv4 (e.g. ::ffff:127.0.0.1)
        const normalizedIp = clientIp.includes('::ffff:') ? clientIp.split('::ffff:')[1] : clientIp;
        
        // Some rudimentary support for subnet masking (e.g. 10.0.1.0/24) could go here. 
        // For strict exact matching:
        const isWhitelisted = ips.some(row => {
            if (row.ip_address === normalizedIp || row.ip_address === clientIp) return true;
            // Basic subnet handling for the demo (like 10.0.1.0/24 -> matches 10.0.1.*)
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
