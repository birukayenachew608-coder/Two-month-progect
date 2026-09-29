const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const validRoles = ['job_seeker', 'employer', 'admin', 'super_admin'];
        const userRole = validRoles.includes(role) ? role : 'job_seeker';

        let tableName = 'job_seekers';
        if (userRole === 'employer') tableName = 'employers';
        if (userRole === 'admin' || userRole === 'super_admin') tableName = 'admins';

        // Check if user already exists in ANY table to enforce unique email across roles
        const [existingAdmins] = await pool.query(`SELECT id FROM admins WHERE email = ?`, [email]);
        const [existingEmployers] = await pool.query(`SELECT id FROM employers WHERE email = ?`, [email]);
        const [existingSeekers] = await pool.query(`SELECT id FROM job_seekers WHERE email = ?`, [email]);

        if (existingAdmins.length > 0 || existingEmployers.length > 0 || existingSeekers.length > 0) {
            return res.status(400).json({ message: 'This email is already registered in the system.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        let result;
        if (tableName === 'admins') {
            [result] = await pool.query(
                `INSERT INTO ${tableName} (name, email, password, role) VALUES (?, ?, ?, ?)`,
                [name, email, hashedPassword, userRole]
            );
        } else {
            [result] = await pool.query(
                `INSERT INTO ${tableName} (name, email, password) VALUES (?, ?, ?)`,
                [name, email, hashedPassword]
            );
        }

        res.status(201).json({ message: 'Registration successful', userId: result.insertId });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

exports.login = async (req, res) => {
    const { email, password, role } = req.body;

    try {
        let user = null;
        let foundRole = role;

        // If role is provided, only check that specific table
        if (role) {
            let tableName = 'job_seekers';
            if (role === 'employer') tableName = 'employers';
            if (role === 'admin' || role === 'super_admin') tableName = 'admins';

            const [users] = await pool.query(`SELECT * FROM ${tableName} WHERE email = ?`, [email]);
            if (users.length > 0) {
                user = users[0];
                if (tableName !== 'admins') user.role = role;
            }
        } else {
            // If no role provided (fallback), check all tables
            const [admins] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
            if (admins.length > 0) {
                user = admins[0];
                foundRole = user.role;
            } else {
                const [employers] = await pool.query('SELECT * FROM employers WHERE email = ?', [email]);
                if (employers.length > 0) {
                    user = employers[0];
                    user.role = 'employer';
                    foundRole = 'employer';
                } else {
                    const [seekers] = await pool.query('SELECT * FROM job_seekers WHERE email = ?', [email]);
                    if (seekers.length > 0) {
                        user = seekers[0];
                        user.role = 'job_seeker';
                        foundRole = 'job_seeker';
                    }
                }
            }
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

exports.switchRole = async (req, res) => {
    const { targetRole } = req.body;
    const email = req.user.email; // From authenticateToken middleware

    try {
        let tableName = 'job_seekers';
        if (targetRole === 'employer') tableName = 'employers';
        if (targetRole === 'admin' || targetRole === 'super_admin') tableName = 'admins';

        const [users] = await pool.query(`SELECT * FROM ${tableName} WHERE email = ?`, [email]);

        if (users.length === 0) {
            return res.status(404).json({ message: `You do not have a ${targetRole} account yet.` });
        }

        const user = users[0];
        const role = tableName === 'admins' ? user.role : targetRole;

        const token = jwt.sign(
            { id: user.id, email: user.email, role: role },
            process.env.JWT_SECRET || 'supersecretkey_change_me_in_production',
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Switched role successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: role
            }
        });
    } catch (error) {
        console.error('Switch Role Error:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};
