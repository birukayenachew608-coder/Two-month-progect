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

const app = express();
app.set('trust proxy', 1 /* number of proxies between user and server */);

const cookieParser = require('cookie-parser');
const passport = require('passport');
const fs = require('fs');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Serve static files from frontend directory
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Serve uploads directories
const uploadsPath = path.join(__dirname, 'uploads');
const publicUploadsPath = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
if (!fs.existsSync(publicUploadsPath)) fs.mkdirSync(publicUploadsPath, { recursive: true });

app.use('/uploads', express.static(uploadsPath));
app.use('/uploads', express.static(publicUploadsPath));
app.use('/public/uploads', express.static(publicUploadsPath));

// Import IP Whitelist middleware
const { checkIpWhitelist } = require('./middleware/authMiddleware');

// Import authController for direct OAuth routes
const authController = require('./controllers/authController');

// Direct OAuth routes requested for Google Sign In
app.get('/auth/google', authController.googleAuth);
app.get('/auth/google/callback', authController.googleCallback);

// Routes
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

// Fallback to index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
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
}

const PORT = process.env.PORT || 3000;

autoSeedLocalIps().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
 
