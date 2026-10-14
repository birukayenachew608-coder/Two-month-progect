
const nodemailer = require('nodemailer');

// For development, we can use Ethereal Email
// In production, configure standard SMTP in environment variables
const createTransporter = async () => {
    console.log('ENV Check -> Email Loaded:', !!process.env.EMAIL_USER);
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
    });
};

exports.sendVerificationEmail = async (to, code) => {
    try {
        const transporter = await createTransporter();
        let info = await transporter.sendMail({
            from: `"JobLink Ethiopia" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: "Verify Your Email - JobLink Ethiopia",
            text: `Your email verification code is: ${code}. It is valid for 10 minutes.`,
            html: `<h3>Welcome to JobLink Ethiopia!</h3><p>Your email verification code is: <strong>${code}</strong></p><p>It is valid for 10 minutes.</p>`,
        });

        console.log("Message sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending verification email:", error);
        return false;
    }
};
