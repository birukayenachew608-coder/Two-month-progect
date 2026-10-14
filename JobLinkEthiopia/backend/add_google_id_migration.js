const pool = require('./config/db');

async function migrate() {
    try {
        console.log('Running Google OAuth database migration...');

        // 1. Check & add google_id to job_seekers
        const [jsCols] = await pool.query("SHOW COLUMNS FROM job_seekers LIKE 'google_id'");
        if (jsCols.length === 0) {
            await pool.query("ALTER TABLE job_seekers ADD COLUMN google_id VARCHAR(255) UNIQUE DEFAULT NULL AFTER linkedin_id");
            console.log('Added google_id column to job_seekers table.');
        } else {
            console.log('google_id column already exists in job_seekers.');
        }

        // 2. Check & add google_id to employers
        const [empCols] = await pool.query("SHOW COLUMNS FROM employers LIKE 'google_id'");
        if (empCols.length === 0) {
            await pool.query("ALTER TABLE employers ADD COLUMN google_id VARCHAR(255) UNIQUE DEFAULT NULL AFTER linkedin_id");
            console.log('Added google_id column to employers table.');
        } else {
            console.log('google_id column already exists in employers.');
        }

        // 3. Ensure users table exists with google_id
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) DEFAULT NULL,
                role ENUM('job_seeker', 'employer', 'admin') DEFAULT 'job_seeker',
                google_id VARCHAR(255) UNIQUE DEFAULT NULL,
                account_status ENUM('active', 'banned', 'pending_verification') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Ensured users table exists with google_id column.');

        const [userCols] = await pool.query("SHOW COLUMNS FROM users LIKE 'google_id'");
        if (userCols.length === 0) {
            await pool.query("ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE DEFAULT NULL");
            console.log('Added google_id column to users table.');
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
