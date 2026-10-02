require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const jobRoutes = require('./routes/jobRoutes');
const seekerRoutes = require('./routes/seekerRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');

const app = express();

const cookieParser = require('cookie-parser');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from frontend directory
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Serve uploads directory
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Import IP Whitelist middleware
const { checkIpWhitelist } = require('./middleware/authMiddleware');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', checkIpWhitelist, adminRoutes);
app.use('/api/superadmin', checkIpWhitelist, superAdminRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/seeker', seekerRoutes);

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
 
