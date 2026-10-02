const jwt = require('jsonwebtoken');

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    
    if ((!token || token === 'secure_cookie_auth') && req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey_change_me_in_production');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ message: 'Invalid or expired token.' });
    }
};

exports.verifySuperAdmin = (req, res, next) => {
    // Requires authenticateToken to be run first, which sets req.user
    if (!req.user) {
        return res.status(401).json({ message: 'Access denied. No user context.' });
    }
    
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Forbidden. Super Admin access required.' });
    }
    
    next();
};

exports.checkIpWhitelist = async (req, res, next) => {
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
