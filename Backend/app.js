const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const Chat = require('./models/chat');
const Message = require('./models/message');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

require('dotenv').config();

const app = express();
const server = http.createServer(app);


app.use(express.json());
app.use(cors());


// MongoDB connection
mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});


// Use routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/chats', chatRoutes);
app.use('/message', messageRoutes);

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Chat API',
      version: '1.0.0',
      description: 'API Documentation for Chat Application',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 8080}`, // Change to your server URL
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'], // Paths to your API files
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));




const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


const URL_CONNECT = process.env.FrontEnd;

const io = require('socket.io')(server, {
  cors: {
    origin: `${URL_CONNECT}`,
    credentials: true,
  },
});



const connectedUsers = new Map(); // Map to store connected users with socket.id as the key


io.on('connection', async (socket) => {
  console.log('A User connected');

  socket.on('setup', async (userData) => {
    socket.join(userData._id);

    socket.userId = userData._id;

    // Add user to connected users map with socket.id as the key
    connectedUsers.set(socket.id, userData._id);

    const userId = userData._id;

    const chats = await Chat.find({ 'unreadCount.userId': userId });

    chats.forEach(chat => {
      const unread = chat.unreadCount.find(u => u.userId.toString() === userData._id);
      if (unread && unread.count > 0) {
        socket.emit('new message notification', {
          chatId: chat._id,
          count: unread.count
        });
      }
    });

    // Send updated list of connected users to all clients
    io.emit('connectedUsers', Array.from(connectedUsers.values()));
  });



  // Joining a chat room
  socket.on('join chat', (chatId) => {
    socket.join(chatId);
    console.log(`User with socket.id ${socket.id} joined chat room: ${chatId}`);
  });

  // Leaving a chat room
  socket.on('leave chat', (chatId) => {
    socket.leave(chatId);
    console.log(`User with socket.id ${socket.id} left chat room: ${chatId}`);
  });


  socket.on('typing', (chatId, userId, username) => {
    io.to(chatId).emit('typing', { chatId, userId, username });
  });

  socket.on('stop typing', (chatId, userId, username) => {
    io.to(chatId).emit('stop typing', { chatId, userId, username });
  });

  socket.on('read messsages', async (chatId, data) => {
    io.to(chatId).emit('read messsages', data.messages);
  });

  socket.on('add-users-group', async ({ chat, user, usernames }) => {

    const names = usernames.join(', ');
    const systemMessageContent = `${user.username} added ${names} to the group.`;

    const systemMessage = new Message({
      chatId: chat._id,
      sender: user._id,
      senderUsername: user.username,
      content: systemMessageContent,
      systemMessage: true
    });

    await systemMessage.save();

    await Chat.findByIdAndUpdate(chat._id, {
      $set: { lastMessage: systemMessage._id },
      $push: { messages: systemMessage._id }
    });

    chat.users.forEach(userId => {
      const userIdString = userId._id.toString();
      io.to(userIdString).emit('added users group', { systemMessage, chat });
    })
  });

  socket.on('delete-users-group', async ({ chat, currentUser, user }) => {
    const systemMessageContent = `${currentUser.username} deleted ${user.username} to the group.`;

    const systemMessage = new Message({
      chatId: chat._id,
      sender: currentUser._id,
      senderUsername: currentUser.username,
      content: systemMessageContent,
      systemMessage: true
    });

    await systemMessage.save();

    await Chat.findByIdAndUpdate(chat._id, {
      $set: { lastMessage: systemMessage._id },
      $push: { messages: systemMessage._id }
    });

    const removedUserId = user._id

    chat.users.forEach(userId => {
      const userIdString = userId._id.toString();
      io.to(userIdString).emit('deleted users group', { systemMessage, chat, removedUserId });
    });


    io.to(removedUserId).emit('deleted users group', { systemMessage, chat, removedUserId });

    const messageAlert = `The admin ${currentUser.username} has removed you from the group.`

    io.to(removedUserId).emit('alert message removed from group', messageAlert);
  });

  socket.on('update group name', async ({ chat, user, updateGroupName }) => {
    const systemMessageContent = `${user.username} updated the group name to ${updateGroupName}.`;

    const systemMessage = new Message({
      chatId: chat._id,
      sender: user._id,
      senderUsername: user.username,
      content: systemMessageContent,
      systemMessage: true
    });

    await systemMessage.save();

    await Chat.findByIdAndUpdate(chat._id, {
      $set: { lastMessage: systemMessage._id },
      $push: { messages: systemMessage._id }
    });

    chat.users.forEach(userId => {
      const userIdString = userId.toString();
      io.to(userIdString).emit('updated group name', { systemMessage, chat });
    })
  });

  socket.on('update picture group', async ({ chat, user }) => {
    const systemMessageContent = `${user.username} updated the picture group.`;

    const systemMessage = new Message({
      chatId: chat._id,
      sender: user._id,
      senderUsername: user.username,
      content: systemMessageContent,
      systemMessage: true
    });

    await systemMessage.save();

    await Chat.findByIdAndUpdate(chat._id, {
      $set: { lastMessage: systemMessage._id },
      $push: { messages: systemMessage._id }
    });

    chat.users.forEach(userId => {
      const userIdString = userId.toString();
      io.to(userIdString).emit('update picture group', { systemMessage, chat });
    })
  });

  socket.on('left group', async ({ chat, user }) => {
    const updateMessage = `${user.username} has left the group.`;
    const systemMessage = new Message({
      chatId: chat._id,
      sender: user._id,
      senderUsername: user.username,
      content: updateMessage,
      systemMessage: true
    });

    await systemMessage.save();

    // Update the chat's last message and messages array
    await Chat.findByIdAndUpdate(chat._id, {
      $set: { lastMessage: systemMessage._id },
      $push: { messages: systemMessage._id }
    });


    chat.users.forEach(user => {
      const userIdString = user._id.toString();
      io.to(userIdString).emit('user left group', { systemMessage, chat });
    })
  });

  socket.on('message deleted for everyone', async ({ chatId, messageId }) => {
    // Broadcast to all users in the chat room except the sender
    const chat = await Chat.findById(chatId).select('users -_id').lean();
    chat.users.forEach(user => {
      const userIdString = user._id.toString();
      io.to(userIdString).emit('message deleted for everyone', { chatId, messageId });
    })
  });

  socket.on('message edited', async ({ chatId, messageId, newContent }) => {
    // Update the message in your database
    await Message.findByIdAndUpdate(messageId, { content: newContent }, { new: true });


    const chat = await Chat.findById(chatId).populate('lastMessage').exec();
    if (chat.lastMessage.equals(messageId)) {
      chat.users.forEach(user => {
        const userIdString = user._id.toString();
        io.to(userIdString).emit('update last message', chat);
      });
    }
    // Broadcast the edited message to all users in the chat room
    io.to(chatId).emit('message edited', { messageId, newContent });
  });

  socket.on('create new group', async (newChat, currentUser) => {

    const updateMessage = `${currentUser.username} created the group`;
    const systemMessage = new Message({
      chatId: newChat._id,
      sender: currentUser._id,
      senderUsername: currentUser.username,
      content: updateMessage,
      systemMessage: true
    });

    await systemMessage.save();

    // Update the chat's last message and messages array
    await Chat.findByIdAndUpdate(newChat._id, {
      $set: { lastMessage: systemMessage._id },
      $push: { messages: systemMessage._id }
    });

    newChat.lastMessage = systemMessage;


    newChat.users.forEach(user => {
      const userIdString = user._id.toString();
      io.to(userIdString).emit('new group created', newChat);
    })
  });

  // socket.on('new message', async (newMessageReceived) => {
  //   try {
  //     const { chatId, sender, senderUsername, content, _id, timestamp } = newMessageReceived;


  //     // Validate the required fields
  //     if (!chatId || !sender || !senderUsername || !content || !_id || !timestamp) {
  //       console.log('Invalid message structure');
  //       return;
  //     }

  //     const room = io.sockets.adapter.rooms.get(chatId);
  //     if (room && room.size > 1) {

  //       const readByUpdates = Array.from(room)
  //         .map(socketId => io.sockets.sockets.get(socketId))
  //         .filter(recipientSocket => recipientSocket && recipientSocket.userId && recipientSocket.userId !== sender)
  //         .map(recipientSocket => ({ readerId: recipientSocket.userId, readAt: new Date() }));

  //       if (readByUpdates.length > 0) {
  //         const readByMessageUpdate = await Message.findByIdAndUpdate(_id, {
  //           $addToSet: { readBy: { $each: readByUpdates } }
  //         }, { new: true }).populate({ path: 'readBy.readerId', select: 'username profilePicture' }).exec();

  //         newMessageReceived = readByMessageUpdate;
  //       }
  //     }



  //     // Emit the new message to the chat
  //     io.to(chatId).emit('new message', newMessageReceived);


  //     await Chat.findByIdAndUpdate(chatId, { lastMessage: _id }).exec();

  //     // Fetch the updated chat with populated fields
  //     const updatedChat = await Chat.findById(chatId)
  //       .populate({ path: 'users', select: 'username profilePicture' })
  //       .populate({ path: 'groupAdmin', select: 'username' })
  //       .populate('lastMessage');

  //     // Iterate over the users to send notifications and updates
  //     updatedChat.users.forEach(async (user) => {
  //       const userIdString = user._id.toString();
  //       io.to(userIdString).emit('update last message', updatedChat);

  //       if (userIdString !== sender) {
  //         // Emit 'add new contact' and 'update last message'
  //         io.to(userIdString).emit('add new contact', updatedChat);

  //         // Emit 'new message notification'
  //         const unreadCount = updatedChat.unreadCount.find(u => u.userId.toString() === userIdString)?.count || 0;
  //         io.to(userIdString).emit('new message notification', {
  //           chatId,
  //           count: unreadCount
  //         });
  //       }
  //     });


  //   } catch (error) {
  //     console.error('Error handling new message:', error);
  //   }
  // });




  socket.on('new message', async (newMessageReceived) => {
    try {
      const { chatId, sender, content, _id, fileUrl } = newMessageReceived;

      // Validate the required fields
      if ((!chatId || !sender || !content || !_id) && !fileUrl) {
        console.log('Invalid message structure');
        return;
      }

      // Fetch chat details
      const chat = await Chat.findById(chatId)
        .populate({ path: 'users', select: 'username profilePicture' })
        .populate('lastMessage')
        .exec();

      // Check if chat is found
      if (!chat) {
        console.log('Chat not found');
        return;
      }

      // Identify users in the chat room
      const room = io.sockets.adapter.rooms.get(chatId);
      const usersInRoom = room ? Array.from(room).map(socketId => io.sockets.sockets.get(socketId).userId) : [];
      const usersLeftOrDeletedSet = new Set(chat.usersLeftOrDeleted.map(user => user._id.toString()));

      // Prepare the update object
      const update = {
      };

      // Determine users to update unread count for
      const usersToUpdate = chat.users
        .filter(user =>
          !usersInRoom.includes(user._id.toString()) &&
          !usersLeftOrDeletedSet.has(user._id.toString()) &&
          user._id.toString() !== sender
        )
        .map(user => user._id);

      if (usersToUpdate.length > 0) {
        update.$inc = { 'unreadCount.$[elem].count': 1 };
      }

      // Update the chat document and retrieve the updated data
      const updateOptions = usersToUpdate.length > 0 ? { new: true, arrayFilters: [{ 'elem.userId': { $in: usersToUpdate } }] } : { new: true };
      const updatedChat = await Chat.findByIdAndUpdate(chatId, update, updateOptions)
        .populate({ path: 'users', select: 'username profilePicture status' })
        .populate('lastMessage')
        .exec();

      // Update readBy status for users in the chat room
      const readByUpdates = usersInRoom.filter(userId => userId !== sender)
        .map(userId => ({ readerId: userId, readAt: new Date() }));

      if (readByUpdates.length > 0) {
        const readByMessageUpdate = await Message.findByIdAndUpdate(_id, {
          $addToSet: { readBy: { $each: readByUpdates } }
        }, { new: true }).populate({ path: 'readBy.readerId', select: 'username profilePicture' }).exec();

        newMessageReceived = readByMessageUpdate;
      }

      // Emit the new message to the chat room
      io.to(chatId).emit('new message', newMessageReceived);

      io.to(chatId).emit('reset');

      // Emit updates and notifications to users
      updatedChat.users.forEach(user => {
        const userIdString = user._id.toString();

        // Emit updates to all users
        io.to(userIdString).emit('update last message', updatedChat);
        io.to(userIdString).emit('add new contact', updatedChat);


        // Send notification to users not in the room and not the sender
        if (!usersInRoom.includes(userIdString) && userIdString !== sender) {
          const unreadCount = updatedChat.unreadCount.find(u => u.userId.toString() === userIdString)?.count || 0;
          io.to(userIdString).emit('new message notification', {
            chatId,
            count: unreadCount
          });
        }
      });

    } catch (error) {
      console.error('Error handling new message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');

    // Find the user ID associated with the disconnected socket
    const disconnectedUserId = connectedUsers.get(socket.id);

    // Remove user from connected users map when they disconnect
    if (disconnectedUserId) {
      connectedUsers.delete(socket.id);

      // Send updated list of connected users to all clients
      io.emit('connectedUsers', Array.from(connectedUsers.values()));
    }
  });
});