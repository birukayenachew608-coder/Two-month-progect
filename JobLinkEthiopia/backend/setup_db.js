const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setup() {
    try {
        const isAiven = (process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud.com'));
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT, 10) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'joblink_ethiopia',
            ssl: (process.env.DB_SSL === 'true' || isAiven) ? { rejectUnauthorized: false } : undefined,
            multipleStatements: true
        });

        const sqlPath = path.join(__dirname, 'database.sql');
        let sql = fs.readFileSync(sqlPath, 'utf8');

        if (process.env.DB_NAME && process.env.DB_NAME !== 'joblink_ethiopia') {
            sql = sql.replace(/CREATE DATABASE IF NOT EXISTS [^;]+;/gi, '')
                     .replace(/USE [^;]+;/gi, '');
        }

        console.log('Executing database.sql...');
        await connection.query(sql);
        console.log('Database and tables created successfully in', process.env.DB_NAME || 'joblink_ethiopia');

        await connection.end();
    } catch (error) {
        console.error('Error creating database:', error);
    }
}

setup();
