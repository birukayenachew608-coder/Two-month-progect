const bcrypt = require('bcrypt');
const pool = require('./config/db');

async function seedAdmin() {
    const email = 'birukayenachew608@gmail.com';
    const password = 'password123'; // The default password we will set
    const name = 'Admin User';
    
    try {
        console.log(`Hashing password for ${email}...`);
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log('Inserting into admins table...');
        const [result] = await pool.query(
            'INSERT INTO admins (name, email, password, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = ?, name = ?',
            [name, email, hashedPassword, 'admin', hashedPassword, name]
        );
        
        console.log('Success! Admin user seeded/updated.');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
    } catch (err) {
        console.error('Error seeding admin user:', err);
    } finally {
        process.exit();
    }
}

seedAdmin();
