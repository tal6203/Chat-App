const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authController = {
  register: async (req, res) => {
    try {
      const { username, password, profilePicture } = req.body;
      let errors = [];

      // Check password criteria
      if (password.length < 6) {
        errors.push("Password must be at least 6 characters long.");
      }
      if (!/(?=.*[a-z])/.test(password)) {
        errors.push("Password must contain at least one lowercase letter.");
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        errors.push("Password must contain at least one uppercase letter.");
      }
      if (!/(?=.*\W)/.test(password)) {
        errors.push("Password must contain at least one special character.");
      }
      if (!/(?=.*\d)/.test(password)) {
        errors.push("Password must contain at least one number.");
      }

      // If there are any errors, return them
      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(" ") });
      }

      // Check if the username is already taken
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user with or without a custom profile picture
      const newUser = new User({
        username,
        password: hashedPassword,
        profilePicture: profilePicture || "https://res.cloudinary.com/dfa7zee9i/image/upload/v1715111941/anonymous-avatar_wcrklv_u0kzbb.png" // Default if not provided
      });

      // Save the user to the database
      console.log('Saving user to the database...');
      await newUser.save();

      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      // Check if the user exists
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(401).json({ error: 'This username does not exist' });
      }

      // Compare the provided password with the stored hashed password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Incorrect password' });
      }

      // Generate a JWT token for authentication
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

      res.status(200).json({ user, token });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  loginGuest: async (req, res) => {
    try {
      const guestUser = await User.findOne({ username: 'guest' });
      const token = jwt.sign({ userId: guestUser._id }, process.env.JWT_SECRET, {
        expiresIn: '1h'
      });

      res.json({ user: guestUser, token });
    } catch (error) {
      res.status(500).json({ error: 'Guest login failed' });
    }
  },

  logout: async (req, res) => {
    try {
      req.header('Authorization').replace('Bearer ', '');

      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Error logging out:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

module.exports = authController;
