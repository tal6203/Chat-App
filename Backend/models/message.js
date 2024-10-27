const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderUsername: { type: String, ref: 'User', required: true },
  content: { type: String, required: false },
  fileUrl: { type: String, default: null },
  fileType: { type: String, default: null },
  recordingDuration: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
  readBy: [{
    readerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  deletedForEveryone: { type: Boolean, default: false },
  deletedForUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  systemMessage: { type: Boolean, default: false },
});

const message = mongoose.model('Message', messageSchema);

module.exports = message;
