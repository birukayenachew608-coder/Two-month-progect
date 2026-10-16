const pool = require('./config/db');

async function migrateFreemium() {
    try {
        console.log('--- Starting Freemium & Chapa Migration ---');

        // 1. Check & Add free_jobs_posted in employers
        const [empCols] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'employers' 
              AND COLUMN_NAME = 'free_jobs_posted'
        `);

        if (empCols.length === 0) {
            console.log("Adding 'free_jobs_posted' to employers table...");
            await pool.query('ALTER TABLE employers ADD COLUMN free_jobs_posted INT NOT NULL DEFAULT 0');
            console.log("Successfully added 'free_jobs_posted' to employers.");
        } else {
            console.log("'free_jobs_posted' column already exists in employers.");
        }

        // 2. Check & Add payment_status in jobs
        const [jobCols] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'jobs' 
              AND COLUMN_NAME = 'payment_status'
        `);

        if (jobCols.length === 0) {
            console.log("Adding 'payment_status' to jobs table...");
            await pool.query("ALTER TABLE jobs ADD COLUMN payment_status ENUM('free', 'paid', 'pending') NOT NULL DEFAULT 'free'");
            console.log("Successfully added 'payment_status' to jobs.");
        } else {
            console.log("'payment_status' column already exists in jobs.");
        }

        // 3. Check & Add payment_reference in jobs
        const [refCols] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'jobs' 
              AND COLUMN_NAME = 'payment_reference'
        `);

        if (refCols.length === 0) {
            console.log("Adding 'payment_reference' to jobs table...");
            await pool.query('ALTER TABLE jobs ADD COLUMN payment_reference VARCHAR(255) DEFAULT NULL');
            console.log("Successfully added 'payment_reference' to jobs.");
        } else {
            console.log("'payment_reference' column already exists in jobs.");
        }

        // 4. Create payments table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employer_id INT NOT NULL,
                job_id INT NOT NULL,
                tx_ref VARCHAR(255) UNIQUE NOT NULL,
                amount DECIMAL(10, 2) NOT NULL DEFAULT 300.00,
                currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
                status ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
                chapa_response JSON DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE,
                FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
            )
        `);
        console.log("Checked/created 'payments' table.");

        console.log('--- Freemium & Chapa Migration Complete! ---');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

migrateFreemium();
