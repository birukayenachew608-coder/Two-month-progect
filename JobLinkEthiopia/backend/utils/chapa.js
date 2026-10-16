const axios = require('axios');
const crypto = require('crypto');

const CHAPA_API_URL = 'https://api.chapa.co/v1';

/**
 * Initialize a Chapa payment checkout session
 * Strictly calls official Chapa API endpoint https://api.chapa.co/v1/transaction/initialize using Axios
 */
async function initializePayment({
    amount = 300,
    currency = 'ETB',
    email,
    firstName = 'Employer',
    lastName = 'Name',
    tx_ref,
    callback_url,
    return_url,
    title = 'Job Post Fee',
    description = 'Job listing publication fee',
    baseUrl = 'http://localhost:3000',
    jobId,
    payment_method
}) {
    // Strictly read API key from process.env.CHAPA_SECRET_KEY
    const chapaSecretKey = process.env.CHAPA_SECRET_KEY;
    if (!chapaSecretKey) {
        console.error('[CHAPA] CHAPA_SECRET_KEY is not configured in backend environment');
        return { success: false, error: 'CHAPA_SECRET_KEY is not configured in backend environment' };
    }

    // Resolve clean, valid first_name and last_name with required fallback strings
    const resolvedFirstName = (firstName && typeof firstName === 'string' && firstName.trim()) ? firstName.trim() : 'Employer';
    const resolvedLastName = (lastName && typeof lastName === 'string' && lastName.trim()) ? lastName.trim() : 'Name';

    // Validate email format and ensure it uses a deliverable domain; fallback to EMAIL_USER if missing or placeholder
    const emailCandidate = (email && typeof email === 'string' && email.trim()) ? email.trim() : '';
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(emailCandidate) && 
                         !emailCandidate.includes('example.com') && 
                         !emailCandidate.includes('joblink.et');
    const resolvedEmail = isValidEmail ? emailCandidate : (process.env.EMAIL_USER || 'birukayenachew608@gmail.com');

    // Chapa enforces strict character length limits: title <= 16 chars, description <= 50 chars
    const cleanTitle = (title || 'Job Post Fee').toString().substring(0, 16);
    const cleanDesc = (description || 'Job listing publication fee').toString().substring(0, 50);

    const requestPayload = {
        amount: String(amount || 300),
        currency: currency || 'ETB',
        email: resolvedEmail,
        first_name: resolvedFirstName,
        last_name: resolvedLastName,
        tx_ref,
        callback_url: callback_url || `${baseUrl}/api/payments/chapa-webhook`,
        return_url: return_url || `${baseUrl}/employer.html?payment=pending&job_id=${jobId || ''}&tx_ref=${encodeURIComponent(tx_ref)}`,
        customization: {
            title: cleanTitle,
            description: cleanDesc
        }
    };

    console.log(`[CHAPA] Initializing checkout via Axios for tx_ref: ${tx_ref}, email: ${resolvedEmail}, name: ${resolvedFirstName} ${resolvedLastName}`);

    try {
        const response = await axios.post(`${CHAPA_API_URL}/transaction/initialize`, requestPayload, {
            headers: {
                'Authorization': `Bearer ${chapaSecretKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.status === 'success' && response.data.data?.checkout_url) {
            console.log(`[CHAPA] Checkout initialized successfully. Checkout URL: ${response.data.data.checkout_url}`);
            return {
                success: true,
                checkout_url: response.data.data.checkout_url,
                tx_ref,
                raw: response.data
            };
        }

        const msg = typeof response.data?.message === 'object' 
            ? JSON.stringify(response.data.message) 
            : (response.data?.message || 'Chapa initialization returned unsuccessful status');
        console.error('Chapa API Error Details:', response.data);
        return {
            success: false,
            error: msg,
            raw: response.data
        };
    } catch (error) {
        console.error('Chapa API Error Details:', error.response?.data || error.message);
        const errData = error.response?.data;
        let errorMessage = 'Failed to initialize payment session with Chapa gateway';
        if (errData) {
            if (typeof errData.message === 'string') {
                errorMessage = errData.message;
            } else if (typeof errData.message === 'object') {
                errorMessage = Object.entries(errData.message).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ');
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        return {
            success: false,
            error: errorMessage,
            raw: errData || error.message
        };
    }
}

/**
 * Verify a transaction with Chapa API
 * @param {string} tx_ref
 */
async function verifyTransaction(tx_ref) {
    const chapaSecretKey = process.env.CHAPA_SECRET_KEY;
    if (!chapaSecretKey) {
        return { verified: false, error: 'CHAPA_SECRET_KEY not configured' };
    }

    try {
        console.log(`[CHAPA] Verifying transaction via Axios: ${tx_ref}`);
        const response = await axios.get(`${CHAPA_API_URL}/transaction/verify/${tx_ref}`, {
            headers: {
                'Authorization': `Bearer ${chapaSecretKey}`
            }
        });

        if (response.data && response.data.status === 'success') {
            return {
                verified: true,
                status: (response.data.data?.status || 'success').toLowerCase(),
                data: response.data.data
            };
        }
        console.warn('Chapa API Error Details:', response.data);
        return { verified: false, data: response.data, error: response.data?.message || 'Transaction verification failed' };
    } catch (error) {
        console.error('Chapa API Error Details:', error.response?.data || error.message);
        return { verified: false, error: error.response?.data?.message || error.message };
    }
}

/**
 * Verify Chapa Webhook Signature
 * Strictly validates HMAC-SHA256 signature from Chapa
 * @param {string|Buffer} rawBody
 * @param {string} signature
 */
function verifyWebhookSignature(rawBody, signature) {
    const secret = process.env.CHAPA_WEBHOOK_SECRET || process.env.CHAPA_SECRET_KEY;
    if (!secret || !signature) {
        return false;
    }
    try {
        const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        return hash === signature;
    } catch (e) {
        console.error('[CHAPA] Error checking webhook signature:', e);
        return false;
    }
}

module.exports = {
    initializePayment,
    verifyTransaction,
    verifyWebhookSignature
};
