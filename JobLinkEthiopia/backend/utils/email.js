const axios = require('axios');

/**
 * Sends transactional email verification code via HTTP REST APIs (HTTPS port 443).
 * This completely eliminates SMTP port blocks (465, 587, 25) on cloud hosting platforms like Render.
 * 
 * Supported Providers:
 * 1. Resend: Set RESEND_API_KEY (and optionally EMAIL_FROM)
 * 2. Brevo (Sendinblue): Set BREVO_API_KEY (and optionally EMAIL_USER)
 */
exports.sendVerificationEmail = async (to, code) => {
    const resendKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : null;
    const brevoKey = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;

    if (!resendKey && !brevoKey) {
        console.error('[Email] ❌ No HTTP email API key found. Please set RESEND_API_KEY (from https://resend.com) or BREVO_API_KEY (from https://brevo.com) in your Render environment variables.');
        return false;
    }

    const htmlContent = `
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
    `;

    // 1. Resend Provider (https://resend.com)
    if (resendKey) {
        try {
            const fromEmail = process.env.EMAIL_FROM || 'JobLink Ethiopia <onboarding@resend.dev>';
            const res = await axios.post(
                'https://api.resend.com/emails',
                {
                    from: fromEmail,
                    to: [to],
                    subject: 'Verify Your Email - JobLink Ethiopia',
                    html: htmlContent
                },
                {
                    headers: {
                        'Authorization': `Bearer ${resendKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            console.log(`[Email] ✅ Verification email delivered via Resend API (ID: ${res.data?.id}) to ${to}`);
            return true;
        } catch (error) {
            const errDetails = error.response?.data?.message || error.response?.data || error.message;
            console.error('[Email] ❌ Resend API Error:', errDetails);
            // If Brevo key also exists, fall through to Brevo
            if (!brevoKey) return false;
        }
    }

    // 2. Brevo Provider (https://brevo.com)
    if (brevoKey) {
        try {
            const senderEmail = process.env.EMAIL_USER || process.env.EMAIL_FROM || 'birukayenachew608@gmail.com';
            const res = await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: {
                        name: 'JobLink Ethiopia',
                        email: senderEmail
                    },
                    to: [{ email: to }],
                    subject: 'Verify Your Email - JobLink Ethiopia',
                    htmlContent: htmlContent
                },
                {
                    headers: {
                        'api-key': brevoKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            console.log(`[Email] ✅ Verification email delivered via Brevo API (MessageId: ${res.data?.messageId}) to ${to}`);
            return true;
        } catch (error) {
            const errDetails = error.response?.data?.message || error.response?.data || error.message;
            console.error('[Email] ❌ Brevo API Error:', errDetails);
            return false;
        }
    }

    return false;
};
