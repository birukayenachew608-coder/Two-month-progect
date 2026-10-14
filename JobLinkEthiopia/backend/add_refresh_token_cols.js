const pool = require('./config/db');

async function addColumns() {
    try {
        console.log('Adding refresh_token to job_seekers...');
        await pool.query('ALTER TABLE job_seekers ADD COLUMN refresh_token VARCHAR(255) DEFAULT NULL');
        console.log('Success: job_seekers updated.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column refresh_token already exists in job_seekers.');
        } else {
            console.error('Error on job_seekers:', err);
        }
    }

    try {
        console.log('Adding refresh_token to employers...');
        await pool.query('ALTER TABLE employers ADD COLUMN refresh_token VARCHAR(255) DEFAULT NULL');
        console.log('Success: employers updated.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column refresh_token already exists in employers.');
        } else {
            console.error('Error on employers:', err);
        }
    }
    
    process.exit(0);
}

addColumns();
