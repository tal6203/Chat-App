const Chat = require('../models/chat');
const User = require('../models/user');

/**
 * @swagger
 * tags:
 *   name: Chats
 *   description: Chat management and retrieval
 */

const chatController = {
  /**
  * @swagger
  * /chats/createChat:
  *   post:
  *     summary: Create a one-on-one chat
  *     tags: [Chats]
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               recipientId:
  *                 type: string
  *                 description: The recipient's user ID
  *     responses:
  *       201:
  *         description: Chat created or reactivated
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 chat:
  *                   type: object
  *                   properties:
  *                     _id:
  *                       type: string
  *                     chatName:
  *                       type: string
  *                     users:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           _id:
  *                             type: string
  *                           username:
  *                             type: string
  *                           profilePicture:
  *                             type: string
  *                     isGroupChat:
  *                       type: boolean
  *                     unreadCount:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           userId:
  *                             type: string
  *                           count:
  *                             type: number
  *       400:
  *         description: Chat already exists between these users
  *       404:
  *         description: User not found
  */
  createOneOnOneChat: async (req, res) => {
    try {
      const { recipientId } = req.body;
      const userId = req.userId;

      // Check if a chat already exists between the users
      const existingChat = await Chat.findOne({
        users: { $all: [userId, recipientId], $size: 2 },
        isGroupChat: false,
      }).populate({
        path: 'users',
        select: 'username profilePicture',
      });


      if (existingChat) {
        // Check if either user had previously left or deleted the chat
        let userLeftOrDeleted = existingChat.usersLeftOrDeleted.includes(userId);
        let recipientLeftOrDeleted = existingChat.usersLeftOrDeleted.includes(recipientId);

        if (userLeftOrDeleted || recipientLeftOrDeleted) {
          // Remove users from usersLeftOrDeleted if they are in it
          existingChat.usersLeftOrDeleted = existingChat.usersLeftOrDeleted.filter(u => u.toString() !== userId && u.toString() !== recipientId);

          await existingChat.save();

          return res.status(200).json({ message: 'Chat reactivated', chat: existingChat });
        } else {
          return res.status(400).json({ error: 'Chat already exists between these users' });
        }
      }

      const sender = await User.findById(userId);
      const recipient = await User.findById(recipientId);
      if (!sender || !recipient) {
        return res.status(404).json({ error: 'User not found' });
      }
      const chat_name = `${sender.username} and ${recipient.username}`;

      const unreadCount = [{ userId, count: 0 }, { userId: recipientId, count: 0 }];

      // Create a new one-on-one chat
      const newChat = new Chat({
        chatName: chat_name,
        users: [userId, recipientId],
        isGroupChat: false,
        unreadCount: unreadCount,
        usersLeftOrDeleted: [], // Initialize empty
        deleteHistoryTimestamp: new Map()
      });
      // Save the new chat
      await newChat.save();

      // Populate the users field in the new chat
      const populatedChat = await Chat.findById(newChat._id).populate({
        path: 'users',
        select: 'username profilePicture',
      });

      // Update the users with the new chat ID
      await User.updateMany({ _id: { $in: [userId, recipientId] } }, { $push: { chats: newChat._id } });



      res.status(201).json({ chat: populatedChat });
    } catch (error) {
      console.error('Error creating one-on-one chat:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
  * @swagger
  * /chats/createGroup:
  *   post:
  *     summary: Create a group chat
  *     tags: [Chats]
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               members:
  *                 type: array
  *                 items:
  *                   type: string
  *                 description: Array of user IDs to be included in the group
  *               chatName:
  *                 type: string
  *                 description: Name of the group chat
  *               groupPicture:
  *                 type: string
  *                 description: URL of the group picture
  *     responses:
  *       201:
  *         description: Group chat created
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 chat:
  *                   type: object
  *                   properties:
  *                     _id:
  *                       type: string
  *                     chatName:
  *                       type: string
  *                     users:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           _id:
  *                             type: string
  *                           username:
  *                             type: string
  *                           profilePicture:
  *                             type: string
  *                     isGroupChat:
  *                       type: boolean
  *                     unreadCount:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           userId:
  *                             type: string
  *                           count:
  *                             type: number
  *                     groupAdmin:
  *                       type: object
  *                       properties:
  *                         _id:
  *                           type: string
  *                         username:
  *                           type: string
  *       400:
  *         description: You must be part of the group
  */
  createGroupChat: async (req, res) => {
    try {
      const { members, chatName, groupPicture } = req.body;
      const userId = req.userId;

      // Ensure the admin is included in the members
      if (!members.includes(userId)) {
        return res.status(400).json({ error: 'You must be part of the group' });
      }

      // Check if a chat already exists with the same members
      // const existingChat = await Chat.findOne({
      //   users: { $all: members, $size: members.length },
      //   isGroupChat: true,
      // });

      // if (existingChat) {
      //   return res.status(400).json({ error: 'Group chat already exists with these members' });
      // }

      const unreadCount = members.map(memberId => ({ userId: memberId, count: 0 }));

      // Create a new group chat with the admin specified
      const newChat = new Chat({
        users: members,
        isGroupChat: true,
        chatName,
        groupAdmin: userId,
        unreadCount: unreadCount,
        groupPicture: groupPicture,
        usersLeftOrDeleted: [], // Initialize empty for group chat
        deleteHistoryTimestamp: new Map()
      });

      await newChat.save();

      // Populate the users field in the new chat
      const populatedChat = await Chat.findById(newChat._id).populate([{
        path: 'users',
        select: 'username profilePicture',
      }, { path: 'groupAdmin', select: 'username' }]);


      // Update the users with the new chat ID
      await User.updateMany({ _id: { $in: members } }, { $push: { chats: newChat._id } });


      res.status(201).json({ chat: populatedChat });
    } catch (error) {
      console.error('Error creating group chat:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
  * @swagger
  * /chats/resetUnreadCount:
  *   post:
  *     summary: Reset unread count for a user in a chat
  *     tags: [Chats]
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               chatId:
  *                 type: string
  *               userId:
  *                 type: string
  *     responses:
  *       200:
  *         description: Unread count reset
  */
  resetUnreadCount: async (req, res) => {
    try {
      const { chatId, userId } = req.body;
      await Chat.updateOne({ _id: chatId, 'unreadCount.userId': userId }, {
        '$set': { 'unreadCount.$.count': 0 }
      });
      res.status(200).json({ message: 'Unread count reset' });
    } catch (error) {
      console.error('Error resetting unread count:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },


  /**
  * @swagger
  * /chats/{userId}:
  *   get:
  *     summary: Get chats by user ID
  *     tags: [Chats]
  *     responses:
  *       200:
  *         description: List of chats for the user
  *         content:
  *           application/json:
  *             schema:
  *               type: array
  *               items:
  *                 type: object
  *                 properties:
  *                   _id:
  *                     type: string
  *                   chatName:
  *                     type: string
  *                   users:
  *                     type: array
  *                     items:
  *                       type: object
  *                       properties:
  *                         _id:
  *                           type: string
  *                         username:
  *                           type: string
  *                         profilePicture:
  *                           type: string
  *                   isGroupChat:
  *                     type: boolean
  *                   unreadCount:
  *                     type: array
  *                     items:
  *                       type: object
  *                       properties:
  *                         userId:
  *                           type: string
  *                         count:
  *                           type: number
  *                   lastMessage:
  *                     type: string
  */
  getChatsByUserId: async (req, res) => {
    try {
      const userId = req.userId;

      // Ensure userId is indexed in the User model
      const user = await User.findById(userId).lean();

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Index 'users' field in Chat model and use lean for performance
      const populatedChats = await Chat.find({
        users: userId,
        usersLeftOrDeleted: { $ne: userId }
      }).populate([
        { path: 'users', select: 'username profilePicture status' },
        { path: 'groupAdmin', select: 'username' },
        'lastMessage'
      ]).lean().exec();

      res.status(200).json({ chats: populatedChats });
    } catch (error) {
      console.error('Error fetching user chats:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
   * @swagger
   * /chats/renameGroup:
   *   put:
   *     summary: Update group chat name
   *     tags: [Chats]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               chatId:
   *                 type: string
   *               newGroupName:
   *                 type: string
   *     responses:
   *       200:
   *         description: Group name updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 chat:
   *                   type: object
   *                   properties:
   *                     _id:
   *                       type: string
   *                     chatName:
   *                       type: string
   */
  updateGroupName: async (req, res) => {
    try {
      const { chatId, newGroupName } = req.body;
      const userId = req.userId;

      // Find the chat and check if the user is the admin
      const chat = await Chat.findOne({ _id: chatId, isGroupChat: true, groupAdmin: userId });

      if (!chat) {
        return res.status(404).json({ error: 'Group chat not found or you are not the admin' });
      }

      // Update the chat name
      chat.chatName = newGroupName;
      await chat.save();

      res.status(200).json({ message: 'Group name updated successfully', chat: chat });
    } catch (error) {
      console.error('Error updating group name:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
   * @swagger
   * /chats/updateGroupPicture:
   *   put:
   *     summary: Update group chat picture
   *     tags: [Chats]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               chatId:
   *                 type: string
   *               newGroupPicture:
   *                 type: string
   *     responses:
   *       200:
   *         description: Group picture updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 chat:
   *                   type: object
   *                   properties:
   *                     _id:
   *                       type: string
   *                     groupPicture:
   *                       type: string
   */
  updateGroupPicture: async (req, res) => {
    try {
      const { chatId, newGroupPicture } = req.body;
      const userId = req.userId;

      // Find the chat and check if the user is the admin
      const chat = await Chat.findOne({ _id: chatId, isGroupChat: true, groupAdmin: userId });

      if (!chat) {
        return res.status(404).json({ error: 'Group chat not found or you are not the admin' });
      }

      // Update the chat name
      chat.groupPicture = newGroupPicture;
      await chat.save();

      res.status(200).json({ message: 'Group picture updated successfully', chat: chat });
    } catch (error) {
      console.error('Error updating Group picture:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // deleteUsersFromGroup: async (req, res) => {
  //   try {
  //     const { chatId, usersToDelete } = req.body;
  //     const userId = req.userId;

  //     // Find the group chat and check if the user is the admin
  //     const groupChat = await Chat.findOne({ _id: chatId, isGroupChat: true, groupAdmin: userId });

  //     if (!groupChat) {
  //       return res.status(404).json({ error: 'Group chat not found or you are not the admin' });
  //     }

  //     // Remove the specified users from the group
  //     groupChat.users = groupChat.users.filter((user) => !usersToDelete.includes(user.toString()));

  //     // Update the group chat
  //     await groupChat.save();

  //     res.status(200).json({ message: 'Users removed from the group successfully', chat: groupChat });
  //   } catch (error) {
  //     console.error('Error deleting users from the group:', error);
  //     res.status(500).json({ error: 'Internal Server Error' });
  //   }
  // },

  /**
  * @swagger
  * /chats/group/delete-users:
  *   delete:
  *     summary: Delete users from a group chat
  *     tags: [Chats]
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               chatId:
  *                 type: string
  *               usersToDelete:
  *                 type: array
  *                 items:
  *                   type: string
  *     responses:
  *       200:
  *         description: Users removed from the group successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 message:
  *                   type: string
  *                 chat:
  *                   type: object
  *                   properties:
  *                     _id:
  *                       type: string
  *                     users:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           _id:
  *                             type: string
  *                           username:
  *                             type: string
  *                           profilePicture:
  *                             type: string
  */
  deleteUsersFromGroup: async (req, res) => {
    try {
      const { chatId, usersToDelete } = req.body;
      const userId = req.userId;


      // Ensure the requester is the admin of the group chat
      const groupChat = await Chat.findOne({ _id: chatId, isGroupChat: true, groupAdmin: userId });
      if (!groupChat) {
        return res.status(404).json({ error: 'Group chat not found or you are not the admin' });
      }

      const currentTime = new Date();

      // Update the chat and get the updated document in a single operation
      const updatedChat = await Chat.findOneAndUpdate(
        { _id: chatId },
        {
          $pull: {
            users: { $in: usersToDelete },
            unreadCount: { userId: { $in: usersToDelete } },
            favoriteBy: { $in: usersToDelete }
          },
          $addToSet: { usersLeftOrDeleted: { $each: usersToDelete } },
          $set: usersToDelete.reduce((acc, userId) => {
            acc[`deleteHistoryTimestamp.${userId}`] = currentTime;
            return acc;
          }, {})
        },
        { new: true } // Return the updated document
      ).populate({ path: 'users', select: 'username profilePicture' })
        .populate('groupAdmin', 'username');

      if (!updatedChat) {
        return res.status(404).json({ error: 'Error updating the group chat' });
      }

      res.status(200).json({ message: 'Users removed from the group successfully', chat: updatedChat });
    } catch (error) {
      console.error('Error deleting users from the group:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
 * @swagger
 * /chats/toggleFavorite/{chatId}:
 *   put:
 *     summary: Toggle the favorite status of a chat for the current user
 *     tags: [Chats]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the chat to toggle favorite status
 *     responses:
 *       200:
 *         description: Favorite status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 chat:
 *                   type: object
 *       404:
 *         description: Chat not found
 */
  toggleFavorite: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.userId;

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      const isFavorite = chat.favoriteBy.includes(userId);
      const update = isFavorite
        ? { $pull: { favoriteBy: userId } }
        : { $addToSet: { favoriteBy: userId } };

      const updatedChat = await Chat.findByIdAndUpdate(chatId, update, { new: true }).populate([
        { path: 'users', select: 'username profilePicture status' },
        { path: 'groupAdmin', select: 'username' },
        'lastMessage'
      ]).lean();

      return res.status(200).json({ message: "Favorite status toggled", chat: updatedChat });
    } catch (error) {
      console.error("Error toggling favorite status:", error);
      return res.status(500).json({ message: "Server error" });
    }
  },

  // addUsersToGroup: async (req, res) => {
  //   try {
  //     const { chatId, usersToAdd } = req.body;
  //     const userId = req.userId;

  //     // Find the group chat and check if the user is the admin
  //     const groupChat = await Chat.findOne({ _id: chatId, isGroupChat: true, groupAdmin: userId });

  //     if (!groupChat) {
  //       return res.status(404).json({ error: 'Group chat not found or you are not the admin' });
  //     }

  //     // Add the specified users to the group
  //     groupChat.users = [...new Set([...groupChat.users, ...usersToAdd])];

  //     // Update the group chat
  //     await groupChat.save();

  //     res.status(200).json({ message: 'Users added to the group successfully', chat: groupChat });
  //   } catch (error) {
  //     console.error('Error adding users to the group:', error);
  //     res.status(500).json({ error: 'Internal Server Error' });
  //   }
  // },

  /**
   * @swagger
   * /chats/group/add-users:
   *   put:
   *     summary: Add users to a group chat
   *     tags: [Chats]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               chatId:
   *                 type: string
   *               usersToAdd:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Users added to the group successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 chat:
   *                   type: object
   *                   properties:
   *                     _id:
   *                       type: string
   *                     users:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           _id:
   *                             type: string
   *                           username:
   *                             type: string
   *                           profilePicture:
   *                             type: string
   */
  addUsersToGroup: async (req, res) => {
    try {
      const { chatId, usersToAdd } = req.body;
      const userId = req.userId;

      // Check if the requesting user is the admin of the group chat
      const groupChat = await Chat.findOne({ _id: chatId, isGroupChat: true, groupAdmin: userId });
      if (!groupChat) {
        return res.status(404).json({ error: 'Group chat not found or you are not the admin' });
      }

      const currentTime = new Date();

      const unreadCountEntries = usersToAdd.map(userId => ({
        userId,
        count: 0
      }));

      // Update the chat by adding new users and removing them from usersLeftOrDeleted if they're in it
      const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
          $addToSet: { users: { $each: usersToAdd } },
          $pull: { usersLeftOrDeleted: { $in: usersToAdd } },
          $push: { unreadCount: { $each: unreadCountEntries } },
          $set: usersToAdd.reduce((acc, userId) => {
            acc[`deleteHistoryTimestamp.${userId}`] = currentTime;
            return acc;
          }, {})
        },
        { new: true }
      ).populate({ path: 'users', select: 'username profilePicture' })
        .populate('groupAdmin', 'username');

      if (!updatedChat) {
        return res.status(404).json({ error: 'Error updating the group chat' });
      }

      res.status(200).json({ message: 'Users added to the group successfully', chat: updatedChat });
    } catch (error) {
      console.error('Error adding users to the group:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
  * @swagger
  * /chats/group/shared-chat-groups:
  *   get:
  *     summary: Get shared chat groups between two users
  *     tags: [Chats]
  *     parameters:
  *       - in: query
  *         name: partnerId
  *         schema:
  *           type: string
  *         required: true
  *         description: The partner's user ID
  *     responses:
  *       200:
  *         description: List of shared groups
  *         content:
  *           application/json:
  *             schema:
  *               type: array
  *               items:
  *                 type: object
  *                 properties:
  *                   _id:
  *                     type: string
  *                   chatName:
  *                     type: string
  *                   users:
  *                     type: array
  *                     items:
  *                       type: object
  *                       properties:
  *                         _id:
  *                           type: string
  *                         username:
  *                           type: string
  */
  getSharedChatGroups: async (req, res) => {
    try {
      const currentUserId = req.userId;
      const { partnerId } = req.query;

      if (!currentUserId || !partnerId) {
        return res.status(400).json({ message: 'Both user IDs are required.' });
      }

      // Find group chats where both userId1 and userId2 are members
      const sharedGroups = await Chat.find({
        users: { $all: [currentUserId, partnerId] },
        isGroupChat: true
      }).populate('users', '-password').lean();

      res.status(200).json({ sharedGroups: sharedGroups });
    } catch (error) {
      console.error('Error finding shared chat groups:', error);
      throw new Error('Error finding shared chat groups');
    }
  },

  /**
   * @swagger
   * /chats/deleteChat:
   *   post:
   *     summary: Delete a chat
   *     tags: [Chats]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               chatId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Chat deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 chat:
   *                   type: object
   *                   properties:
   *                     _id:
   *                       type: string
   *                     users:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           _id:
   *                             type: string
   *                           username:
   *                             type: string
   *                           profilePicture:
   *                             type: string
   */
  deleteChat: async (req, res) => {
    try {
      const { chatId } = req.body;
      const userId = req.userId;

      const chat = await Chat.findById(chatId);

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      // For group chats, remove the user and mark the chat as deleted
      if (chat.isGroupChat) {
        // Remove the user from the group chat
        chat.users = chat.users.filter(user => user.toString() !== userId);

        // If not already marked as deleted, add the user to usersLeftOrDeleted
        if (chat.users.length === 0) {
          // Delete the chat if no users are left
          await Chat.deleteOne({ _id: chat._id });
          return res.status(200).json({ message: 'Chat group deleted successfully' });
        } else {
          if (chat.groupAdmin.toString() === userId) {
            const randomIndex = Math.floor(Math.random() * chat.users.length);
            chat.groupAdmin = chat.users[randomIndex];
          }
          // Add the user to usersLeftOrDeleted if not already included
          if (!chat.usersLeftOrDeleted.includes(userId)) {
            chat.usersLeftOrDeleted.push(userId);
          }
        }
      } else {
        // For one-on-one chats, just mark the chat as deleted
        if (!chat.usersLeftOrDeleted.includes(userId)) {
          chat.usersLeftOrDeleted.push(userId);
        }
      }

      // Remove from favorites if the chat was favorited
      chat.favoriteBy = chat.favoriteBy.filter(favUserId => favUserId.toString() !== userId);

      chat.unreadCount = chat.unreadCount.map(count => {
        if (count.userId.toString() === userId) {
          return { ...count, count: 0 };
        }
        return count;
      });
      // Update the deleteHistoryTimestamp for this user
      chat.deleteHistoryTimestamp.set(userId.toString(), new Date());

      const savedChat = await chat.save(); // Save the chat first
      const updatedChat = await Chat.findById(savedChat._id) // Then fetch and populate it
        .populate([{
          path: 'users',
          select: 'username profilePicture',
        }, { path: 'groupAdmin', select: 'username' }]);
      res.status(200).json({ message: 'Chat deleted successfully', chat: updatedChat });
    } catch (error) {
      console.error('Error deleting chat:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }




};

module.exports = chatController;
