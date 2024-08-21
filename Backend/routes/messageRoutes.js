const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

// Send a message
router.post('/sendMessage', authMiddleware.authenticate, messageController.sendMessage);

// Get messages By chatId
router.get('/getMessageByChatId/:chatId', authMiddleware.authenticate, messageController.getMessagesByChatId);

// Edit a messsage
router.put('/editMessage/:messageId', authMiddleware.authenticate, messageController.editMessage);

// Delete a message
router.post('/deleteMessage', authMiddleware.authenticate, messageController.deleteMessage);

module.exports = router;
