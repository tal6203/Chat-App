const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  chatName: { type: String, trim: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  createdAt: { type: Date, default: Date.now },
  isGroupChat: { type: Boolean, default: false },
  groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  unreadCount: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    count: { type: Number, required: true, default: 0 }
  }],
  groupPicture: {
    type: String,
    required: function () { return this.isGroupChat; }
  },
  usersLeftOrDeleted: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  deleteHistoryTimestamp: {
    type: Map,
    of: Date
  }
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;