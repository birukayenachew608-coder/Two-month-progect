const pool = require('./config/db');

async function migrateJobAlerts() {
  try {
    console.log('Ensuring job_alerts table and required schema exist...');
    
    // 1. Create table if not exists with all required columns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_seeker_id INT NULL,
        seeker_id INT NULL,
        job_sector VARCHAR(255) NOT NULL DEFAULT 'Software & Tech',
        keyword VARCHAR(255) DEFAULT NULL,
        location VARCHAR(255) DEFAULT 'Addis Ababa',
        frequency ENUM('daily', 'weekly', 'instant') DEFAULT 'daily',
        email_notification TINYINT(1) DEFAULT 1,
        telegram_notification TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (job_seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE,
        FOREIGN KEY (seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Check if job_seeker_id column exists
    const [cols] = await pool.query("SHOW COLUMNS FROM job_alerts LIKE 'job_seeker_id'");
    if (cols.length === 0) {
      console.log('Adding job_seeker_id column to job_alerts...');
      await pool.query("ALTER TABLE job_alerts ADD COLUMN job_seeker_id INT NULL AFTER id");
    }

    // 3. Make seeker_id nullable if it was NOT NULL
    const [seekerCol] = await pool.query("SHOW COLUMNS FROM job_alerts LIKE 'seeker_id'");
    if (seekerCol.length > 0 && seekerCol[0].Null === 'NO') {
      await pool.query("ALTER TABLE job_alerts MODIFY COLUMN seeker_id INT NULL");
    }

    // 4. Check if foreign key constraint exists for job_seeker_id
    const [fks] = await pool.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'job_alerts' 
        AND COLUMN_NAME = 'job_seeker_id' 
        AND REFERENCED_TABLE_NAME = 'job_seekers'
    `);
    if (fks.length === 0) {
      console.log('Adding foreign key constraint for job_seeker_id -> job_seekers(id)...');
      try {
        await pool.query("ALTER TABLE job_alerts ADD CONSTRAINT fk_job_alerts_job_seeker_id FOREIGN KEY (job_seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE");
      } catch (fkErr) {
        console.warn('FK constraint notice:', fkErr.message);
      }
    }

    // 5. Ensure updated_at column exists
    const [updatedCol] = await pool.query("SHOW COLUMNS FROM job_alerts LIKE 'updated_at'");
    if (updatedCol.length === 0) {
      console.log('Adding updated_at column...');
      await pool.query("ALTER TABLE job_alerts ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
    }

    // 6. Sync job_seeker_id with seeker_id if any existing records had seeker_id
    await pool.query("UPDATE job_alerts SET job_seeker_id = seeker_id WHERE job_seeker_id IS NULL AND seeker_id IS NOT NULL");
    await pool.query("UPDATE job_alerts SET seeker_id = job_seeker_id WHERE seeker_id IS NULL AND job_seeker_id IS NOT NULL");

    console.log('job_alerts table migration successfully verified!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateJobAlerts();
