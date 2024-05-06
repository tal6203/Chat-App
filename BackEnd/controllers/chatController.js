const Chat = require('../models/chat');
const User = require('../models/user');


const chatController = {
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
          $pull: { users: { $in: usersToDelete } },
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

      // Update the chat by adding new users and removing them from usersLeftOrDeleted if they're in it
      const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
          $addToSet: { users: { $each: usersToAdd } },
          $pull: { usersLeftOrDeleted: { $in: usersToAdd } },
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
        },{ path: 'groupAdmin', select: 'username' }]);
      res.status(200).json({ message: 'Chat deleted successfully', chat: updatedChat });
    } catch (error) {
      console.error('Error deleting chat:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }




};

module.exports = chatController;
