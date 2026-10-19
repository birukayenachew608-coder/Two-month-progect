const nodemailer = require('nodemailer');
const dns = require('dns');
const dnsPromises = dns.promises;

// Set default result order to IPv4 first if supported by Node runtime
if (typeof dns.setDefaultResultOrder === 'function') {
    try {
        dns.setDefaultResultOrder('ipv4first');
    } catch (_) {}
}

const resolveIPv4Host = async (hostname) => {
    try {
        const addresses = await dnsPromises.resolve4(hostname);
        if (addresses && addresses.length > 0) {
            return addresses[0];
        }
    } catch (err) {
        console.warn(`[Email] Could not resolve IPv4 for ${hostname}, falling back to hostname:`, err.message);
    }
    return hostname;
};

const createTransporter = async () => {
    const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : null;
    const rawPass = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
    const pass = rawPass ? rawPass.replace(/\s+/g, '') : null;

    if (!user || !pass) {
        console.warn('[Email] ⚠️ Missing EMAIL_USER or EMAIL_APP_PASSWORD in environment variables.');
    }

    // Support custom SMTP configuration if provided
    if (process.env.SMTP_HOST) {
        const targetHost = process.env.SMTP_HOST.trim();
        const ipv4Host = await resolveIPv4Host(targetHost);
        return nodemailer.createTransport({
            host: ipv4Host,
            port: parseInt(process.env.SMTP_PORT || '465', 10),
            secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
            tls: {
                servername: targetHost,
                rejectUnauthorized: false
            },
            auth: { user, pass }
        });
    }

    // Strictly resolve smtp.gmail.com to IPv4 address to eliminate ENETUNREACH on Render
    const ipv4Gmail = await resolveIPv4Host('smtp.gmail.com');
    console.log(`[Email] Using IPv4 Gmail SMTP address: ${ipv4Gmail}:587`);

    return nodemailer.createTransport({
        host: ipv4Gmail,
        port: 587,
        secure: false, // Use STARTTLS on port 587
        tls: {
            servername: 'smtp.gmail.com'
        },
        auth: {
            user: user,
            pass: pass,
        },
    });
};

exports.sendVerificationEmail = async (to, code) => {
    const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : null;
    const rawPass = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
    const pass = rawPass ? rawPass.replace(/\s+/g, '') : null;

    if (!user || !pass) {
        console.error('[Email] ❌ Cannot send email: EMAIL_USER and EMAIL_APP_PASSWORD must be configured in environment variables.');
        return false;
    }

    try {
        const transporter = await createTransporter();
        const info = await transporter.sendMail({
            from: `"JobLink Ethiopia" <${user}>`,
            to: to,
            subject: "Verify Your Email - JobLink Ethiopia",
            text: `Your email verification code is: ${code}. It is valid for 10 minutes.`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #0284c7; margin: 0; font-size: 24px;">JobLink Ethiopia</h2>
                        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Connecting Talent with Opportunity</p>
                    </div>
                    <div style="padding: 20px; background: #f8fafc; border-radius: 8px; text-align: center; border: 1px solid #f1f5f9;">
                        <p style="color: #334155; font-size: 14px; margin-top: 0;">Use the verification code below to verify your email address:</p>
                        <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0f172a; margin: 16px 0; padding: 12px 24px; background: #ffffff; border: 2px dashed #0284c7; border-radius: 8px; display: inline-block;">
                            ${code}
                        </div>
                        <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
                    </div>
                    <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 20px; margin-bottom: 0;">If you did not request this verification code, please disregard this email.</p>
                </div>
            `,
        });

        console.log(`[Email] ✅ Verification email sent to ${to} (MessageId: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error('[Email] ❌ Error sending verification email:', error.message || error);
        return false;
    }
};
