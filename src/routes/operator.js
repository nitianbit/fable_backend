const express = require('express');
const operatorCtrl = require('../controllers/operator.controller');
const { authenticate } = require('../middleware/authenticate');
const { validateRequired, validateEmail, validatePassword, validateEnum } = require('../middleware/validation');

const router = express.Router();

// Public routes (no authentication required)
router.route('/')
    .get(operatorCtrl.list)
    .post(
        validateRequired(['companyName', 'email', 'phone', 'registrationNumber', 'licenseNumber']),
        validateEmail('email'),
        validatePassword('password'),
        operatorCtrl.create
    );

router.route('/search')
    .get(operatorCtrl.search);

router.route('/nearby')
    .get(operatorCtrl.getNearby);

// Routes that require authentication
router.route('/profile')
    .get(authenticate, operatorCtrl.loggedIn)
    .put(authenticate, operatorCtrl.updateProfile);

router.route('/change-password')
    .put(
        authenticate,
        validateRequired(['currentPassword', 'newPassword']),
        validatePassword('newPassword'),
        operatorCtrl.changePassword
    );

// Admin/Operator management routes
router.route('/:operatorId')
    .get(operatorCtrl.load, operatorCtrl.get)
    .put(operatorCtrl.load, operatorCtrl.update)
    .delete(operatorCtrl.load, operatorCtrl.remove);

router.route('/:operatorId/status')
    .put(
        validateRequired(['status']),
        validateEnum('status', ['Active', 'Inactive', 'Suspended', 'Pending']),
        operatorCtrl.updateStatus
    );

router.route('/:operatorId/verify')
    .put(
        validateRequired(['isVerified']),
        operatorCtrl.verify
    );

router.route('/:operatorId/stats')
    .get(operatorCtrl.getStats);

router.route('/:operatorId/fleet')
    .get(operatorCtrl.getFleet);

// Load operator when operatorId is present
router.param('operatorId', operatorCtrl.load);

module.exports = router;
