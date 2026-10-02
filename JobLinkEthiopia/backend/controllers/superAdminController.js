const pool = require('../config/db');

const net = require('net');

function isValidIp(ip) {
    // net.isIP returns 4 for IPv4, 6 for IPv6, and 0 for invalid
    return net.isIP(ip) !== 0;
}

exports.getIps = async (req, res) => {
    try {
        const [ips] = await pool.query('SELECT * FROM whitelisted_ips ORDER BY created_at DESC');
        res.status(200).json(ips);
    } catch (error) {
        console.error('Error fetching IPs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.addIp = async (req, res) => {
    const { ip_address, label } = req.body;
    if (!ip_address) return res.status(400).json({ message: 'IP address is required' });
    
    if (!isValidIp(ip_address.trim())) {
        return res.status(400).json({ message: 'Invalid IP address format' });
    }
    try {
        const [result] = await pool.query('INSERT INTO whitelisted_ips (ip_address, label) VALUES (?, ?)', [ip_address, label || '']);
        res.status(201).json({ id: result.insertId, ip_address, label });
    } catch (error) {
        console.error('Error adding IP:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.removeIp = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM whitelisted_ips WHERE id = ?', [id]);
        res.status(200).json({ message: 'IP removed successfully' });
    } catch (error) {
        console.error('Error removing IP:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getAdmins = async (req, res) => {
    try {
        const [admins] = await pool.query('SELECT id, name, email, role FROM admins ORDER BY created_at DESC');
        res.status(200).json(admins);
    } catch (error) {
        console.error('Error fetching admins:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateAdminRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ['admin', 'super_admin', 'moderator', 'auditor'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }
    
    // Don't allow super admin to change their own role to prevent lockout
    if (req.user.id == id && role !== 'super_admin') {
        return res.status(403).json({ message: 'Cannot demote yourself from super admin.' });
    }

    try {
        const [result] = await pool.query('UPDATE admins SET role = ? WHERE id = ?', [role, id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Admin not found' });
        res.status(200).json({ message: 'Admin role updated' });
    } catch (error) {
        console.error('Error updating admin role:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.inviteAdmin = async (req, res) => {
    const { name, email, role } = req.body;
    const validRoles = ['admin', 'super_admin', 'moderator', 'auditor'];
    const newRole = validRoles.includes(role) ? role : 'admin';
    
    try {
        const bcrypt = require('bcrypt');
        const crypto = require('crypto');
        
        // Generate a secure random password (12 characters)
        const tempPassword = crypto.randomBytes(8).toString('hex').slice(0, 12);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        const [result] = await pool.query('INSERT INTO admins (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, newRole]);
        
        // Return the temporary password so the Super Admin can share it securely
        res.status(201).json({ 
            id: result.insertId, 
            name, 
            email, 
            role: newRole,
            tempPassword: tempPassword,
            message: 'Admin invited successfully. Please share the temporary password securely.'
        });
    } catch (error) {
        console.error('Error inviting admin:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'An admin with this email already exists.' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.removeAdmin = async (req, res) => {
    const { id } = req.params;
    if (req.user.id == id) {
        return res.status(403).json({ message: 'Cannot remove yourself.' });
    }
    try {
        const [result] = await pool.query('DELETE FROM admins WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Admin not found' });
        res.status(200).json({ message: 'Admin removed successfully' });
    } catch (error) {
        console.error('Error removing admin:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
