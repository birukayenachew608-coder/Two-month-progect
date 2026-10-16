const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Secure Chapa Webhook endpoint (Requires valid HMAC signature from Chapa)
router.post('/chapa-webhook', paymentController.handleChapaWebhook);

// Chapa Callback browser redirect endpoint (Redirects back to employer dashboard)
router.get('/chapa-callback', paymentController.handleChapaCallback);

// Initialize checkout session with official Chapa API
router.post('/initialize', paymentController.initializePaymentEndpoint);

module.exports = router;
