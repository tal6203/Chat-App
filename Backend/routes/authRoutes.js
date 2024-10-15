const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register a new user
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Send to email rest password
router.post('/verification-email', authController.sendEmailToRest);

// Login-Guest
router.post('/guest', authController.loginGuest);

//Logout
router.get('/logout', authController.logout);

module.exports = router;
