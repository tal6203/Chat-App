const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Get all users
router.get('/', authMiddleware.authenticate, userController.getAllUsers);

// Get user by Id
router.get('/:userId', authMiddleware.authenticate, userController.getUserById);

// Search for users by username
router.get('/search/:username', authMiddleware.authenticate, userController.searchUsers);

// Update user profile with image upload
router.put('/updateProfile/:userId', authMiddleware.authenticate, userController.updateProfile);

// Delete the user's own account
router.delete('/:userId', authMiddleware.authenticate, userController.deleteOwnAccount);

module.exports = router;
