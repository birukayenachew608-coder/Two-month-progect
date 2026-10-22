const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
    try { dns.setDefaultResultOrder('ipv4first'); } catch (_) {}
}
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const jobRoutes = require('./routes/jobRoutes');
const seekerRoutes = require('./routes/seekerRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const employerRoutes = require('./routes/employerRoutes');
const userRoutes = require('./routes/userRoutes');
const alertRoutes = require('./routes/alertRoutes');
const reportRoutes = require('./routes/reportRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
app.set('trust proxy', 1 /* number of proxies between user and server */);

const cookieParser = require('cookie-parser');
const passport = require('passport');
const fs = require('fs');

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or reflect origin
        if (!origin) return callback(null, true);
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json({
    limit: '15mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());
app.use(passport.initialize());

// Import IP Whitelist and RBAC middleware
const { checkIpWhitelist, authorizeRole } = require('./middleware/authMiddleware');

// Protected Admin HTML routes (Removed from generic public static folder)
const protectedPagesPath = path.join(__dirname, 'protected_pages');

// Strict No-Cache Headers for sensitive Admin pages to prevent cached DOM leak (FOUC)
const setNoCacheHeaders = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};

// Apply no-cache headers to protected dashboard HTML pages and admin endpoints
app.use(['/seeker.html', '/employer.html', '/admin.html', '/admin-profile.html', '/admin-security.html', '/admin-security', '/admin'], setNoCacheHeaders);

// Strictly protect admin-security.html with backend authorizeRole middleware: super_admin ONLY
app.get(['/admin-security.html', '/admin-security'], setNoCacheHeaders, authorizeRole('super_admin'), (req, res) => {
    res.sendFile(path.join(protectedPagesPath, 'admin-security.html'));
});

// Convenience route to redirect /admin to static /admin.html (auth handled by frontend JS)
app.get('/admin', setNoCacheHeaders, (req, res) => {
    res.redirect('/admin.html');
});

// Serve static files from frontend directory
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Serve uploads directories
const uploadsPath = path.join(__dirname, 'uploads');
const publicUploadsPath = path.join(__dirname, 'public/uploads');
const publicProfilesPath = path.join(publicUploadsPath, 'profiles');
const backendProfilesPath = path.join(uploadsPath, 'profiles');

if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
if (!fs.existsSync(publicUploadsPath)) fs.mkdirSync(publicUploadsPath, { recursive: true });
if (!fs.existsSync(publicProfilesPath)) fs.mkdirSync(publicProfilesPath, { recursive: true });
if (!fs.existsSync(backendProfilesPath)) fs.mkdirSync(backendProfilesPath, { recursive: true });

app.use('/uploads', express.static(uploadsPath));
app.use('/uploads', express.static(publicUploadsPath));
app.use('/public/uploads', express.static(publicUploadsPath));

// Import upload routes
const uploadRoutes = require('./routes/uploadRoutes');

// Import authController for direct OAuth routes
const authController = require('./controllers/authController');

// Direct OAuth routes requested for Google & LinkedIn Sign In
app.get('/auth/google', authController.googleAuth);
app.get('/auth/google/callback', authController.googleCallback);
app.all('/auth/logout', authController.logout);
// LinkedIn OAuth temporarily disabled per mentor advice
// app.get('/auth/linkedin', authController.linkedinAuth);
// app.get('/auth/linkedin/callback', authController.linkedinCallback);

// Dedicated Refresh Token endpoint
app.post('/api/refresh-token', authController.refreshToken);
app.post('/api/refresh', authController.refreshToken);

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', checkIpWhitelist, adminRoutes);
app.use('/api/superadmin', checkIpWhitelist, superAdminRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/seeker', seekerRoutes);
app.use('/api/seekers', seekerRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/employer', employerRoutes);
app.use('/api/employers', employerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payments', paymentRoutes);

// Public informational pages
app.get(['/terms', '/terms.html'], (req, res) => {
    res.sendFile(path.join(frontendPath, 'terms.html'));
});

app.get(['/privacy', '/privacy.html'], (req, res) => {
    res.sendFile(path.join(frontendPath, 'privacy.html'));
});

// Fallback to index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Catch-all middleware route to serve 404.html for unmatched routes (app.use catch-all, Express 5 compatible)
app.use((req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({
            status: 404,
            error: 'Not Found',
            message: `API endpoint not found: ${req.originalUrl}`
        });
    }
    res.status(404).sendFile(path.join(frontendPath, '404.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ message: 'Something broke!' });
});

const pool = require('./config/db');

async function autoSeedLocalIps() {
    try {
        await pool.query(`
            INSERT IGNORE INTO whitelisted_ips (ip_address, label) 
            VALUES ('::1', 'Localhost IPv6'), ('127.0.0.1', 'Localhost IPv4');
        `);
        console.log('[Security] Verified localhost IPs in whitelist.');
    } catch (err) {
        console.error('[Security] Error auto-seeding local IPs:', err);
    }

    try {
        await pool.query("ALTER TABLE job_seekers ADD COLUMN IF NOT EXISTS profile_picture LONGTEXT;").catch(() => {});
        await pool.query("ALTER TABLE employers ADD COLUMN IF NOT EXISTS profile_picture LONGTEXT;").catch(() => {});
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture LONGTEXT;").catch(() => {});
        await pool.query("ALTER TABLE job_seekers MODIFY COLUMN profile_photo LONGTEXT;").catch(() => {});
        await pool.query("ALTER TABLE job_seekers MODIFY COLUMN profile_picture LONGTEXT;").catch(() => {});
        await pool.query("ALTER TABLE job_seekers MODIFY COLUMN profile_photo_url LONGTEXT;").catch(() => {});
        await pool.query("ALTER TABLE employers MODIFY COLUMN profile_photo LONGTEXT;").catch(() => {});
        await pool.query("ALTER TABLE employers MODIFY COLUMN profile_picture LONGTEXT;").catch(() => {});
        await pool.query("ALTER TABLE employers MODIFY COLUMN profile_photo_url LONGTEXT;").catch(() => {});
        await pool.query("ALTER TABLE users MODIFY COLUMN profile_photo LONGTEXT;").catch(() => {});
        await pool.query("ALTER TABLE users MODIFY COLUMN profile_picture LONGTEXT;").catch(() => {});
        await pool.query("ALTER TABLE admins MODIFY COLUMN profile_photo LONGTEXT;").catch(() => {});
        await pool.query("ALTER TABLE job_seekers ADD COLUMN IF NOT EXISTS github_url VARCHAR(255) DEFAULT NULL;").catch(() => {});
        await pool.query("ALTER TABLE job_seekers ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255) DEFAULT NULL;").catch(() => {});
        await pool.query("ALTER TABLE job_seekers ADD COLUMN IF NOT EXISTS portfolio_url VARCHAR(255) DEFAULT NULL;").catch(() => {});
        await pool.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS sector VARCHAR(255) DEFAULT 'Software & Tech';").catch(() => {});
    } catch (colErr) {
        // Ignored if columns already present
    }
}

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    autoSeedLocalIps().then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    });
}

module.exports = app;
 
