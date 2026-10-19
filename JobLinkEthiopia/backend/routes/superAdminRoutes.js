const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { authenticateToken, verifySuperAdmin } = require('../middleware/authMiddleware');

// Protect all routes with authenticateToken and verifySuperAdmin
router.use(authenticateToken);
router.use(verifySuperAdmin);

// Super Admin session verification endpoint
router.get('/verify', (req, res) => {
    res.json({ success: true, message: 'Super admin verified successfully', user: req.user });
});

// IP Whitelisting Routes
router.get('/ips', superAdminController.getIps);
router.post('/ips', verifySuperAdmin, superAdminController.addIp);
router.delete('/ips/:id', verifySuperAdmin, superAdminController.removeIp);

// Admin Role Management Routes
router.get('/admins', superAdminController.getAdmins);
router.put('/admins/:id/role', verifySuperAdmin, superAdminController.updateAdminRole);
router.post('/admins/invite', verifySuperAdmin, superAdminController.inviteAdmin);
router.delete('/admins/:id', verifySuperAdmin, superAdminController.removeAdmin);

module.exports = router;
