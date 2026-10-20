const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Parse DATABASE_URL / MYSQL_URL if provided by cloud hosting
let dbConfig = {};
const connectionUri = process.env.DATABASE_URL || process.env.MYSQL_URL;

if (connectionUri) {
    try {
        const parsedUrl = new URL(connectionUri);
        dbConfig = {
            host: parsedUrl.hostname,
            port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 3306,
            user: decodeURIComponent(parsedUrl.username),
            password: decodeURIComponent(parsedUrl.password),
            database: parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, '') : 'defaultdb',
        };
    } catch (e) {
        console.warn('[DB] Could not parse connection URI, falling back to separate env variables:', e.message);
    }
}

const isAiven = (process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud.com')) || 
                (connectionUri && connectionUri.includes('aivencloud.com'));

const pool = mysql.createPool({
    host: dbConfig.host || process.env.DB_HOST || 'localhost',
    port: dbConfig.port || (process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306),
    user: dbConfig.user || process.env.DB_USER || 'root',
    password: dbConfig.password !== undefined ? dbConfig.password : (process.env.DB_PASSWORD || ''),
    database: dbConfig.database || process.env.DB_NAME || 'joblink_ethiopia',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl: (process.env.DB_SSL === 'true' || isAiven) ? { rejectUnauthorized: false } : undefined
});

// Proactive connection health check on startup
pool.getConnection()
    .then(connection => {
        console.log(`[DB] ✅ Connected to MySQL database (${dbConfig.database || process.env.DB_NAME || 'joblink_ethiopia'}) on ${dbConfig.host || process.env.DB_HOST || 'localhost'}:${dbConfig.port || process.env.DB_PORT || 3306}`);
        connection.release();
    })
    .catch(err => {
        console.error('[DB] ❌ Initial database connection error:', err.message);
    });

module.exports = pool;

