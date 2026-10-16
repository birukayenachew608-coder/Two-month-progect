const pool = require('./config/db');

async function migrate() {
    try {
        console.log('--- Starting Social Links Migration for job_seekers ---');

        // Check and add github_url
        const [githubCols] = await pool.query("SHOW COLUMNS FROM job_seekers LIKE 'github_url'");
        if (githubCols.length === 0) {
            console.log('Adding github_url column to job_seekers table...');
            await pool.query("ALTER TABLE job_seekers ADD COLUMN github_url VARCHAR(255) DEFAULT NULL AFTER resume_file_url");
            console.log('Successfully added github_url.');
        } else {
            console.log('github_url column already exists in job_seekers.');
        }

        // Check and add linkedin_url
        const [linkedinCols] = await pool.query("SHOW COLUMNS FROM job_seekers LIKE 'linkedin_url'");
        if (linkedinCols.length === 0) {
            console.log('Adding linkedin_url column to job_seekers table...');
            await pool.query("ALTER TABLE job_seekers ADD COLUMN linkedin_url VARCHAR(255) DEFAULT NULL AFTER github_url");
            console.log('Successfully added linkedin_url.');
        } else {
            console.log('linkedin_url column already exists in job_seekers.');
        }

        // Check and add portfolio_url
        const [portfolioCols] = await pool.query("SHOW COLUMNS FROM job_seekers LIKE 'portfolio_url'");
        if (portfolioCols.length === 0) {
            console.log('Adding portfolio_url column to job_seekers table...');
            await pool.query("ALTER TABLE job_seekers ADD COLUMN portfolio_url VARCHAR(255) DEFAULT NULL AFTER linkedin_url");
            console.log('Successfully added portfolio_url.');
        } else {
            console.log('portfolio_url column already exists in job_seekers.');
        }

        console.log('--- Social Links Migration completed successfully! ---');
    } catch (err) {
        console.error('Migration failed with error:', err);
        process.exitCode = 1;
    } finally {
        process.exit();
    }
}

migrate();
