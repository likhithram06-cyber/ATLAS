// What this file does: routing for authentication operations
const express = require('express');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register',    authController.register);
router.post('/login',       authController.login);
router.post('/google',      authController.googleAuth);
router.get('/me', verifyToken, authController.getMe);
router.put('/save-property/:id', verifyToken, authController.toggleSaveProperty);

module.exports = router;
