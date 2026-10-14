const pool = require('./config/db');

async function migrate() {
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM jobs LIKE 'job_type'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE jobs ADD COLUMN job_type VARCHAR(50) DEFAULT 'Full-time'");
      console.log('Added job_type column to jobs table.');
    } else {
      await pool.query("ALTER TABLE jobs MODIFY COLUMN job_type VARCHAR(50) DEFAULT 'Full-time'");
      console.log('Modified job_type column to VARCHAR(50) DEFAULT Full-time.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
