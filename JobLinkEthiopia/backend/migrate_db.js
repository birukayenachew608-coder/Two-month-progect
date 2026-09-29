const pool = require('./config/db');

async function migrate() {
    try {
        console.log('Starting migration...');
        
        // Find existing index for email
        const [rows] = await pool.query('SHOW INDEXES FROM users WHERE Column_name = "email"');
        
        for (let row of rows) {
            if (row.Key_name !== 'PRIMARY') {
                console.log(`Dropping index ${row.Key_name}...`);
                await pool.query(`ALTER TABLE users DROP INDEX ${row.Key_name}`);
            }
        }
        
        // Add new unique index
        console.log('Adding composite unique index on (email, role)...');
        await pool.query('ALTER TABLE users ADD UNIQUE KEY unique_email_role (email, role)');
        
        console.log('Migration completed successfully!');
    } catch (err) {
        if (err.code === 'ER_DUP_KEYNAME') {
            console.log('Index unique_email_role already exists.');
        } else {
            console.error('Migration failed:', err);
        }
    } finally {
        process.exit();
    }
}

migrate();
