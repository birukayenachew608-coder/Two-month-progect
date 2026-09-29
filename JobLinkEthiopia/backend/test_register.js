const bcrypt = require('bcrypt');
const pool = require('./config/db');

async function testRegister() {
    const name = 'Test User';
    const email = 'test@example.com';
    const password = 'password123';
    const role = 'job_seeker';

    try {
        const validRoles = ['job_seeker', 'employer', 'admin', 'super_admin'];
        const userRole = validRoles.includes(role) ? role : 'job_seeker';
        
        let tableName = 'job_seekers';
        if (userRole === 'employer') tableName = 'employers';
        if (userRole === 'admin' || userRole === 'super_admin') tableName = 'admins';

        console.log(`Checking existing users in ${tableName}...`);
        const [existingUsers] = await pool.query(`SELECT id FROM ${tableName} WHERE email = ?`, [email]);
        if (existingUsers.length > 0) {
            console.log(`Email is already registered as ${userRole}`);
            return;
        }

        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        let result;
        if (tableName === 'admins') {
            console.log('Inserting admin...');
            [result] = await pool.query(
                `INSERT INTO ${tableName} (name, email, password, role) VALUES (?, ?, ?, ?)`,
                [name, email, hashedPassword, userRole]
            );
        } else {
            console.log(`Inserting into ${tableName}...`);
            [result] = await pool.query(
                `INSERT INTO ${tableName} (name, email, password) VALUES (?, ?, ?)`,
                [name, email, hashedPassword]
            );
        }

        console.log('Registration successful, insertId:', result.insertId);
    } catch (error) {
        console.error('Registration Error:', error);
    } finally {
        process.exit();
    }
}

testRegister();
