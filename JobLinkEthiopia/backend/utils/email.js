const axios = require('axios');

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

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

/**
 * Sends a Job Alert notification email to a job seeker using Brevo API (with Resend fallback).
 * Formats a clean, high-converting job alert card with Job Title, Company, Location, Salary, Deadline, and link.
 */
exports.sendJobAlertEmail = async ({ to, recipientName, job }) => {
    const brevoKey = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;
    const resendKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : null;

    if (!brevoKey && !resendKey) {
        console.warn(`[JobAlert Email] ⚠️ Neither BREVO_API_KEY nor RESEND_API_KEY set. Simulated email delivery to ${to} for job: "${job.title}" at "${job.company_name || 'JobLink'}"`);
        return true;
    }

    const appUrl = (process.env.APP_URL || 'https://joblink-ethiopia.onrender.com').replace(/\/+$/, '');
    const jobUrl = job.id ? `${appUrl}/job-details.html?id=${job.id}` : `${appUrl}/seeker.html`;
    const seekerName = recipientName || 'Job Seeker';

    const formattedSalary = job.salary ? `<span style="display: inline-block; padding: 4px 12px; background: #e0f2fe; color: #0369a1; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-right: 8px; margin-bottom: 8px;">💰 ${escapeHtml(job.salary)}</span>` : '';
    const jobTypeBadge = job.job_type ? `<span style="display: inline-block; padding: 4px 12px; background: #f1f5f9; color: #475569; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-right: 8px; margin-bottom: 8px;">💼 ${escapeHtml(job.job_type)}</span>` : '';
    const locationBadge = job.location ? `<span style="display: inline-block; padding: 4px 12px; background: #fef3c7; color: #92400e; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-right: 8px; margin-bottom: 8px;">📍 ${escapeHtml(job.location)}</span>` : '';
    const sectorBadge = (job.sector || job.job_sector || job.category) ? `<span style="display: inline-block; padding: 4px 12px; background: #ede9fe; color: #6d28d9; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 8px;">🏷️ ${escapeHtml(job.sector || job.job_sector || job.category)}</span>` : '';

    const cleanDescription = (job.description || '').slice(0, 280) + ((job.description && job.description.length > 280) ? '...' : '');

    let deadlineText = '';
    if (job.deadline) {
        try {
            const d = new Date(job.deadline);
            if (!isNaN(d.getTime())) {
                deadlineText = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            }
        } catch (_) {}
    }

    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
            <div style="border-bottom: 2px solid #f1f5f9; padding-bottom: 18px; margin-bottom: 20px; text-align: center;">
                <h1 style="color: #0284c7; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">JobLink Ethiopia</h1>
                <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">New Job Match for Your Job Alert</p>
            </div>

            <p style="color: #334155; font-size: 15px; line-height: 1.5; margin-top: 0;">
                Hello <strong>${escapeHtml(seekerName)}</strong>,
            </p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 4px;">
                A new job matching your preferred <strong>sector and location</strong> was just posted on JobLink Ethiopia:
            </p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; margin: 20px 0;">
                <h2 style="color: #0f172a; margin: 0 0 6px 0; font-size: 20px; font-weight: 700;">
                    ${escapeHtml(job.title)}
                </h2>
                <p style="color: #0284c7; font-size: 15px; font-weight: 600; margin: 0 0 14px 0;">
                    🏢 ${escapeHtml(job.company_name || 'Verified Employer')}
                </p>

                <div style="margin-bottom: 14px;">
                    ${formattedSalary}
                    ${jobTypeBadge}
                    ${locationBadge}
                    ${sectorBadge}
                </div>

                <p style="color: #475569; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0; background: #ffffff; padding: 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    ${escapeHtml(cleanDescription)}
                </p>

                ${deadlineText ? `<p style="color: #e11d48; font-size: 12px; font-weight: 600; margin: 0 0 18px 0;">⏰ Application Deadline: ${escapeHtml(deadlineText)}</p>` : ''}

                <div style="text-align: center; margin-top: 8px;">
                    <a href="${jobUrl}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                        View & Apply for Job &rarr;
                    </a>
                </div>
            </div>

            <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 16px 0 0 0; text-align: center;">
                You received this email because you configured a Job Alert matching this sector and location.
                You can manage or disable your alert preferences anytime from your <a href="${appUrl}/seeker.html" style="color: #0284c7; text-decoration: none;">dashboard</a>.
            </p>
            <div style="border-top: 1px solid #f1f5f9; padding-top: 14px; margin-top: 20px; text-align: center;">
                <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
                    &copy; ${new Date().getFullYear()} JobLink Ethiopia. All rights reserved.
                </p>
            </div>
        </div>
    `;

    // 1. Primary: Brevo HTTP API
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
                    to: [{ email: to, name: seekerName }],
                    subject: `New Job Match: ${job.title} at ${job.company_name || 'JobLink Ethiopia'}`,
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

            console.log(`[JobAlert Email] ✅ Job alert email delivered via Brevo API (MessageId: ${res.data?.messageId}) to ${to}`);
            return true;
        } catch (error) {
            const errDetails = error.response?.data?.message || error.response?.data || error.message;
            console.error(`[JobAlert Email] ❌ Brevo API Error for ${to}:`, errDetails);
            if (!resendKey) return false;
        }
    }

    // 2. Fallback: Resend HTTP API
    if (resendKey) {
        try {
            const fromEmail = process.env.EMAIL_FROM || 'JobLink Ethiopia <onboarding@resend.dev>';
            const res = await axios.post(
                'https://api.resend.com/emails',
                {
                    from: fromEmail,
                    to: [to],
                    subject: `New Job Match: ${job.title} at ${job.company_name || 'JobLink Ethiopia'}`,
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

            console.log(`[JobAlert Email] ✅ Job alert email delivered via Resend API (ID: ${res.data?.id}) to ${to}`);
            return true;
        } catch (error) {
            const errDetails = error.response?.data?.message || error.response?.data || error.message;
            console.error(`[JobAlert Email] ❌ Resend API Error for ${to}:`, errDetails);
            return false;
        }
    }

    return false;
};
