const pool = require('./config/db');

async function migrate() {
    try {
        console.log('Running super admin migrations...');
        
        // Ensure role column has the new enums
        await pool.query(`ALTER TABLE admins MODIFY COLUMN role ENUM('admin', 'super_admin', 'moderator', 'auditor') DEFAULT 'admin'`);
        console.log('Updated admins table role enum.');

        // Create ip_whitelist table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ip_whitelist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ip_address VARCHAR(45) NOT NULL,
                label VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Created ip_whitelist table.');

        console.log('Migrations complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
