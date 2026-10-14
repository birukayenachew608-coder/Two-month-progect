const pool = require('./config/db');

async function migrate() {
    try {
        console.log('Running profile_photo migration...');

        // 1. Add profile_photo to users table
        const [userCols] = await pool.query("SHOW COLUMNS FROM users LIKE 'profile_photo'");
        if (userCols.length === 0) {
            console.log('Adding profile_photo to users table...');
            await pool.query("ALTER TABLE users ADD COLUMN profile_photo VARCHAR(255) DEFAULT '/uploads/default-avatar.png'");
            console.log('profile_photo added to users table successfully.');
        } else {
            console.log('profile_photo already exists on users table.');
        }

        // 2. Add profile_photo to job_seekers table if not exists (for parity with profile_photo_url)
        const [seekerCols] = await pool.query("SHOW COLUMNS FROM job_seekers LIKE 'profile_photo'");
        if (seekerCols.length === 0) {
            console.log('Adding profile_photo to job_seekers table...');
            await pool.query("ALTER TABLE job_seekers ADD COLUMN profile_photo VARCHAR(255) DEFAULT '/uploads/default-avatar.png'");
            console.log('profile_photo added to job_seekers table.');
        }

        // 3. Add profile_photo to employers table if not exists
        const [empCols] = await pool.query("SHOW COLUMNS FROM employers LIKE 'profile_photo'");
        if (empCols.length === 0) {
            console.log('Adding profile_photo to employers table...');
            await pool.query("ALTER TABLE employers ADD COLUMN profile_photo VARCHAR(255) DEFAULT '/uploads/default-avatar.png'");
            console.log('profile_photo added to employers table.');
        }

        console.log('Profile photo migration finished successfully!');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        process.exit();
    }
}

migrate();
