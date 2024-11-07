const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

// Send a message
router.post('/sendMessage', authMiddleware.authenticate, messageController.sendMessage);

// Get messages By chatId
router.get('/getMessageByChatId/:chatId', authMiddleware.authenticate, messageController.getMessagesByChatId);

// Get media messages by chatId with pagination
router.get('/getMediaMessagesByChatId/:chatId', authMiddleware.authenticate, messageController.getMediaMessagesByChatId);

// Edit a messsage
router.put('/editMessage/:messageId', authMiddleware.authenticate, messageController.editMessage);

// Delete a message
router.post('/deleteMessage', authMiddleware.authenticate, messageController.deleteMessage);

module.exports = router;
