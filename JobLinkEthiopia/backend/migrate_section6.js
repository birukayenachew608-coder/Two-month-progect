const pool = require('./config/db.js');

async function migrate() {
    try {
        console.log('Starting Section 6 schema sync...');

        // 1. users table: ensure full_name, email, password_hash, role, is_approved
        const [uCols] = await pool.query('SHOW COLUMNS FROM users');
        const uColNames = uCols.map(c => c.Field);
        if (!uColNames.includes('is_approved')) {
            await pool.query('ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT FALSE');
            console.log('Added is_approved to users');
        }
        if (!uColNames.includes('full_name')) {
            await pool.query('ALTER TABLE users ADD COLUMN full_name VARCHAR(255) NULL');
            await pool.query('UPDATE users SET full_name = name WHERE full_name IS NULL');
            console.log('Added full_name to users');
        }
        if (!uColNames.includes('password_hash')) {
            await pool.query('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL');
            await pool.query('UPDATE users SET password_hash = password WHERE password_hash IS NULL');
            console.log('Added password_hash to users');
        }

        // 2. employers table: ensure is_approved
        const [eCols] = await pool.query('SHOW COLUMNS FROM employers');
        const eColNames = eCols.map(c => c.Field);
        if (!eColNames.includes('is_approved')) {
            await pool.query('ALTER TABLE employers ADD COLUMN is_approved BOOLEAN DEFAULT FALSE');
            console.log('Added is_approved to employers');
        }

        // Also sync any existing active employers to is_approved = true
        await pool.query("UPDATE employers SET is_approved = TRUE WHERE account_status = 'active'");
        await pool.query("UPDATE users SET is_approved = TRUE WHERE account_status = 'active'");

        // 3. jobs table: ensure status supports 'open' and 'closed' and existing values
        await pool.query("ALTER TABLE jobs MODIFY COLUMN status ENUM('open', 'active', 'closed', 'flagged', 'pending_review', 'pending') DEFAULT 'active'");
        console.log('Updated jobs status column');

        // 4. applications table: ensure message column
        const [aCols] = await pool.query('SHOW COLUMNS FROM applications');
        const aColNames = aCols.map(c => c.Field);
        if (!aColNames.includes('message')) {
            await pool.query('ALTER TABLE applications ADD COLUMN message TEXT NULL');
            console.log('Added message to applications');
        }

        console.log('Section 6 schema synchronization completed successfully!');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
