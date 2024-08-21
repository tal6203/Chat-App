// controllers/messageController.js
const Message = require('../models/message');
const Chat = require('../models/chat');
const User = require('../models/user');

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Message management and retrieval
 */

const messageController = {
  /**
  * @swagger
  * /message/sendMessage:
  *   post:
  *     summary: Send a new message
  *     tags: [Messages]
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               chatId:
  *                 type: string
  *               content:
  *                 type: string
  *               senderUsername:
  *                 type: string
  *               fileUrl:
  *                 type: string
  *               fileType:
  *                 type: string
  *     responses:
  *       201:
  *         description: The created message
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 _id:
  *                   type: string
  *                 chatId:
  *                   type: string
  *                 senderUsername:
  *                   type: string
  *                 content:
  *                   type: string
  *                 fileUrl:
  *                   type: string
  *                 fileType:
  *                   type: string
  *                 timestamp:
  *                   type: string
  *                 readBy:
  *                   type: array
  *                   items:
  *                     type: object
  *                     properties:
  *                       readerId:
  *                         type: string
  *                       readAt:
  *                         type: string
  *       400:
  *         description: Invalid or empty message content passed into request
  *       403:
  *         description: Chat not found or sender not a member
  */
  sendMessage: async (req, res) => {
    try {
      const { chatId, content, senderUsername, fileUrl, fileType } = req.body;
      const sender = req.userId;

      if ((!content || !chatId || content.trim().length === 0) && !fileUrl) {
        return res.status(400).json({ error: "Invalid or empty message content passed into request" });
      }

      // Check if the user is a member of the chat
      const chat = await Chat.findById(chatId);

      if (!chat || !chat.users.includes(sender)) {
        return res.status(403).json({ error: "Chat not found or sender not a member" });
      }

      // Check if the chat was deleted by any of the users
      let shouldReactivateChat = chat.users.some(userId => chat.usersLeftOrDeleted.includes(userId.toString()));

      if (shouldReactivateChat) {
        // Reactivate chat by removing deletion marks for both users
        await Chat.findByIdAndUpdate(chatId, {
          $pull: { usersLeftOrDeleted: { $in: chat.users } },
        });
      }

      const newMessage = {
        chatId: chatId,
        sender: sender,
        senderUsername: senderUsername,
        content: content,
        fileUrl: fileUrl,
        fileType: fileType,
        readBy: []
      };

      const message = await Message.create(newMessage);

      // Update the chat by pushing the new message and incrementing unreadCount for other users
      await Chat.findByIdAndUpdate(chatId, {
        $push: { messages: message._id },
        // $inc: { 'unreadCount.$[elem].count': 1 },
        lastMessage: message._id
      }, {
        // arrayFilters: [{ 'elem.userId': { $ne: sender }, 'elem.userId': { $in: chat.users }, 'elem.userId': { $nin: chat.usersLeftOrDeleted } }],
        new: true,
      });


      res.status(201).json({ message: message });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // getMessagesByChatId: async (req, res) => {
  //   try {
  //     const { chatId } = req.params;
  //     const userId = req.userId;

  //     const unreadMessagesCount = await Message.countDocuments({
  //       chatId: chatId,
  //       'readBy.readerId': { $ne: userId }, sender: { $ne: userId },
  //       sender: { $ne: userId }
  //     });

  //     if (unreadMessagesCount > 0) {
  //       await Message.updateMany(
  //         { chatId: chatId, 'readBy.readerId': { $ne: userId }, sender: { $ne: userId } },
  //         { $addToSet: { readBy: { readerId: userId, readAt: new Date() } } }
  //       );
  //     }
  //     // Fetch messages in the chat
  //     // const chat = await Chat.findById(chatId)
  //     //   .populate({ path: 'messages', populate: { path: 'readBy.readerId', select: 'username profilePicture' } }).lean();

  //     const messages = await Message.find({ chatId: chatId })
  //       .populate({ path: 'readBy.readerId', select: 'username profilePicture' })
  //       .lean();


  //     // if (!chat) {
  //     //   return res.status(404).json({ error: 'Chat not found' });
  //     // }

  //     if (!messages) {
  //       return res.status(404).json({ error: 'Messages not found' });
  //     }

  //     await Chat.findByIdAndUpdate(chatId, {
  //       $set: { 'unreadCount.$[elem].count': 0 },
  //     }, {
  //       arrayFilters: [{ 'elem.userId': userId }]
  //     });

  //     // Return the messages
  //     res.status(200).json({ messages: messages });
  //   } catch (error) {
  //     console.error('Error fetching chat messages:', error);
  //     res.status(500).json({ error: 'Internal Server Error' });
  //   }
  // },


  // getMessagesByChatId: async (req, res) => {
  //   try {
  //     const { chatId } = req.params;
  //     const userId = req.userId;
  //     const limit = parseInt(req.query.limit) || 20; // Default to 20 messages per page if not specified
  //     const lastMessageId = req.query.lastMessageId; // Cursor for pagination


  //     const chat = await Chat.findById(chatId);
  //     if (!chat) {
  //       return res.status(404).json({ error: 'Chat not found' });
  //     }

  //     // Check if the user has previously left or deleted the chat
  //     const userDeletedTimestamp = chat.deleteHistoryTimestamp.get(userId.toString());

  //     // Updating unread messages
  //     const unreadMessagesCondition = {
  //       chatId: chatId,
  //       'readBy.readerId': { $ne: userId },
  //       sender: { $ne: userId },
  //     };
  //     if (lastMessageId) {
  //       unreadMessagesCondition._id = { $gt: lastMessageId }; // Fetch only unread messages that are newer than the cursor
  //     }

  //     const unreadMessagesCount = await Message.countDocuments(unreadMessagesCondition);

  //     if (unreadMessagesCount > 0) {
  //       await Message.updateMany(
  //         unreadMessagesCondition,
  //         { $addToSet: { readBy: { readerId: userId, readAt: new Date() } } }
  //       );
  //     }

  //     // Building query for messages
  //     const messageQuery = { chatId: chatId };
  //     if (userDeletedTimestamp) {
  //       // Only fetch messages that were sent after the user's deletion timestamp
  //       messageQuery.timestamp = { $gt: userDeletedTimestamp };
  //     }
  //     if (lastMessageId) {
  //       messageQuery._id = { $lt: lastMessageId }; // Fetch messages older than the last message ID
  //     }



  //     const messages = await Message.find(messageQuery)
  //       .sort({ _id: -1 }) // Sort by _id in descending order
  //       .limit(limit)
  //       .populate({ path: 'readBy.readerId', select: 'username profilePicture' })
  //       .lean();

  //     if (!messages) {
  //       return res.status(404).json({ error: 'Messages not found' });
  //     }

  //     // Update the chat's unread count
  //     await Chat.findByIdAndUpdate(chatId, {
  //       $set: { 'unreadCount.$[elem].count': 0 },
  //     }, {
  //       arrayFilters: [{ 'elem.userId': userId }]
  //     });
  //     // Return the messages in reverse order so the oldest is first
  //     res.status(200).json({ messages: messages.reverse() });
  //   } catch (error) {
  //     console.error('Error fetching chat messages:', error);
  //     res.status(500).json({ error: 'Internal Server Error' });
  //   }
  // },


  /**
  * @swagger
  * /message/getMessageByChatId/{chatId}:
  *   get:
  *     summary: Get messages by chat ID
  *     tags: [Messages]
  *     parameters:
  *       - in: path
  *         name: chatId
  *         schema:
  *           type: string
  *         required: true
  *         description: The chat ID
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         required: false
  *         description: The number of messages to retrieve
  *       - in: query
  *         name: lastMessageId
  *         schema:
  *           type: string
  *         required: false
  *         description: The last message ID for pagination
  *     responses:
  *       200:
  *         description: A list of messages
  *         content:
  *           application/json:
  *             schema:
  *               type: array
  *               items:
  *                 type: object
  *                 properties:
  *                   _id:
  *                     type: string
  *                   chatId:
  *                     type: string
  *                   sender:
  *                     type: string
  *                   senderUsername:
  *                     type: string
  *                   content:
  *                     type: string
  *                   fileUrl:
  *                     type: string
  *                   fileType:
  *                     type: string
  *                   timestamp:
  *                     type: string
  *                   readBy:
  *                     type: array
  *                     items:
  *                       type: object
  *                       properties:
  *                         readerId:
  *                           type: string
  *                         readAt:
  *                           type: string
  *       404:
  *         description: Chat not found or messages not found
  */
  getMessagesByChatId: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.userId;
      const limit = parseInt(req.query.limit) || 20;
      const lastMessageId = req.query.lastMessageId;

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      const userDeletedTimestamp = chat.deleteHistoryTimestamp.get(userId.toString());

      // Updating unread messages condition
      const unreadMessagesCondition = {
        chatId: chatId,
        'readBy.readerId': { $ne: userId },
        sender: { $ne: userId }
      };

      if (userDeletedTimestamp) {
        unreadMessagesCondition.timestamp = { $gt: userDeletedTimestamp };
      }

      if (lastMessageId) {
        unreadMessagesCondition._id = { $gt: lastMessageId };
      }

      const unreadMessagesCount = await Message.countDocuments(unreadMessagesCondition);

      if (unreadMessagesCount > 0) {
        await Message.updateMany(
          unreadMessagesCondition,
          { $addToSet: { readBy: { readerId: userId, readAt: new Date() } } }
        );
      }

      // Building query for messages
      const messageQuery = {
        chatId: chatId,
        $or: [
          { deletedForUsers: { $ne: userId } },
        ]
      };
      if (userDeletedTimestamp) {
        messageQuery.timestamp = { $gt: userDeletedTimestamp };
      }

      if (lastMessageId) {
        messageQuery._id = { $lt: lastMessageId };
      }

      const messages = await Message.find(messageQuery)
        .sort({ _id: -1 })
        .limit(limit)
        .populate({ path: 'readBy.readerId', select: 'username profilePicture' })
        .lean();

      if (!messages) {
        return res.status(404).json({ error: 'Messages not found' });
      }

      res.status(200).json({ messages: messages.reverse() });
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
  * @swagger
  * /message/editMessage/{messageId}:
  *   put:
  *     summary: Edit a message
  *     tags: [Messages]
  *     parameters:
  *       - in: path
  *         name: messageId
  *         schema:
  *           type: string
  *         required: true
  *         description: The message ID
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               content:
  *                 type: string
  *     responses:
  *       200:
  *         description: The updated message
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 _id:
  *                   type: string
  *                 chatId:
  *                   type: string
  *                 sender:
  *                   type: string
  *                 senderUsername:
  *                   type: string
  *                 content:
  *                   type: string
  *                 fileUrl:
  *                   type: string
  *                 fileType:
  *                   type: string
  *                 timestamp:
  *                   type: string
  *       404:
  *         description: Message not found
  *       403:
  *         description: Unauthorized - You are not the sender of this message
  */
  editMessage: async (req, res) => {
    try {
      const { messageId } = req.params;
      const { content } = req.body;
      const userId = req.userId;

      // Find the message and check if the user is the sender
      const message = await Message.findById(messageId);

      if (content.trim().length === 0) {
        return res.status(404).json({ error: 'Empty message content passed into request' })
      }

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      if (message.sender.toString() !== userId) {
        return res.status(403).json({ error: 'Unauthorized: You are not the sender of this message' });
      }

      // Update the content of the message
      message.content = content;
      await message.save();

      res.status(200).json({ message });
    } catch (error) {
      console.error('Error editing message:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
 * @swagger
 * /message/deleteMessage:
 *   post:
 *     summary: Delete a message
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageId:
 *                 type: string
 *               deleteForEveryone:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       404:
 *         description: Message not found
 *       403:
 *         description: Unauthorized - You are not the sender of this message
 */
  deleteMessage: async (req, res) => {
    try {
      const { messageId, deleteForEveryone } = req.body;
      const userId = req.userId;

      const message = await Message.findById(messageId);

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      if (message.sender.toString() !== userId) {
        return res.status(403).json({ error: 'Unauthorized: You are not the sender of this message' });
      }

      if (deleteForEveryone) {
        message.deletedForEveryone = true;
      } else {
        message.deletedForUsers.push(userId);
      }

      await message.save();

      res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

module.exports = messageController;
