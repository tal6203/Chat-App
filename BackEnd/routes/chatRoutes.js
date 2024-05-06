const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

// Create a chat (one-on-one)
router.post('/createChat', authMiddleware.authenticate, chatController.createOneOnOneChat);

// Create a chat (group)
router.post('/createGroup', authMiddleware.authenticate, chatController.createGroupChat);

// Get all chats By UserId
router.get('/:userId', authMiddleware.authenticate, chatController.getChatsByUserId);

//Rename the Group name
router.put('/renameGroup', authMiddleware.authenticate, chatController.updateGroupName);

//Update the Group Picture
router.put('/updateGroupPicture', authMiddleware.authenticate, chatController.updateGroupPicture);

//Deleting Users from the Group
router.delete('/group/delete-users', authMiddleware.authenticate, chatController.deleteUsersFromGroup);

//Adding Users from the Group
router.put('/group/add-users', authMiddleware.authenticate, chatController.addUsersToGroup);


router.get('/group/shared-chat-groups', authMiddleware.authenticate, chatController.getSharedChatGroups);

// Route to reset unread count
router.post('/resetUnreadCount', authMiddleware.authenticate, chatController.resetUnreadCount);

//Route to delete chat
router.post('/deleteChat', authMiddleware.authenticate, chatController.deleteChat);


module.exports = router;
