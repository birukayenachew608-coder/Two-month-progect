const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');

async function migrate() {
    console.log('--- Starting Base64 Profile Photo LONGTEXT Migration ---');
    const queries = [
        // users table
        "ALTER TABLE users MODIFY COLUMN profile_photo LONGTEXT",
        "ALTER TABLE users MODIFY COLUMN profile_picture LONGTEXT",
        // job_seekers table
        "ALTER TABLE job_seekers MODIFY COLUMN profile_photo LONGTEXT",
        "ALTER TABLE job_seekers MODIFY COLUMN profile_picture LONGTEXT",
        "ALTER TABLE job_seekers MODIFY COLUMN profile_photo_url LONGTEXT",
        // employers table
        "ALTER TABLE employers MODIFY COLUMN profile_photo LONGTEXT",
        "ALTER TABLE employers MODIFY COLUMN profile_picture LONGTEXT",
        "ALTER TABLE employers MODIFY COLUMN profile_photo_url LONGTEXT",
        // admins table
        "ALTER TABLE admins MODIFY COLUMN profile_photo LONGTEXT"
    ];

    for (const q of queries) {
        try {
            console.log(`Executing: ${q}...`);
            await pool.query(q);
            console.log(`SUCCESS: ${q}`);
        } catch (err) {
            console.warn(`Warning on query "${q}":`, err.message);
        }
    }
    console.log('--- Migration Finished Successfully ---');
    process.exit(0);
}

migrate();
