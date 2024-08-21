const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true, minlength: 6 },
  profilePicture: { type: "String", required: true, default: "https://res.cloudinary.com/dfa7zee9i/image/upload/v1715111941/anonymous-avatar_wcrklv_u0kzbb.png", },
  status: { type: String, required: true, default: "Welcome to ChatApp" },
});

const User = mongoose.model('User', userSchema);

module.exports = User;