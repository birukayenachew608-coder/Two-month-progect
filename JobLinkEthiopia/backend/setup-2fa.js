const pool = require('./config/db');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setup() {
    try {
        const [admins] = await pool.query('SELECT id, email, name FROM admins');
        if (admins.length === 0) {
            console.log('No admins found in database.');
            process.exit(0);
        }

        console.log('Available admins:');
        admins.forEach((a, i) => console.log(`${i + 1}. ${a.name} (${a.email})`));

        rl.question('Select admin number to setup 2FA for: ', async (answer) => {
            const index = parseInt(answer) - 1;
            if (isNaN(index) || index < 0 || index >= admins.length) {
                console.log('Invalid selection.');
                process.exit(1);
            }

            const admin = admins[index];
            const secret = speakeasy.generateSecret({ name: `JobLinkEthiopia Admin (${admin.email})` });

            await pool.query('UPDATE admins SET two_factor_secret = ? WHERE id = ?', [secret.base32, admin.id]);
            
            qrcode.toString(secret.otpauth_url, { type: 'terminal' }, function (err, url) {
                console.log('\n--- SCAN THIS QR CODE WITH GOOGLE AUTHENTICATOR ---\n');
                console.log(url);
                console.log('\n---------------------------------------------------\n');
                console.log('2FA Secret (Manual Entry): ', secret.base32);
                console.log('\nNow you can login and verify with your authenticator app!');
                process.exit(0);
            });
        });
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

setup();
