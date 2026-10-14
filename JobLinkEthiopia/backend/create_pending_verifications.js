const pool = require('./config/db');
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pending_verifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                code VARCHAR(10) NOT NULL,
                expires_at DATETIME NOT NULL,
                verified BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('pending_verifications table created');
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
