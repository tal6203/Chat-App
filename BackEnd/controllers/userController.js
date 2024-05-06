const User = require('../models/user');
const mongoose = require('mongoose');

const userController = {

  getAllUsers: async (req, res) => {
    try {
      const users = await User.find();

      // Return all users
      res.status(200).json({ users });
    } catch (error) {
      console.error('Error fetching all users:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  getUserById: async (req, res) => {
    try {
      const { userId } = req.params;

      // Validate that userId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid userId' });
      }

      // Fetch user details by ID from the database
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return user profile
      res.status(200).json({ user });
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
  searchUsers: async (req, res) => {
    try {
      const { username } = req.params;
      const userId = req.userId;
   
      const results = await User.find({ username: { $regex: username, $options: 'i' } ,
       _id: { $ne: userId } }).select('-password');
  
      // Return the search results
      res.status(200).json({ results });
    } catch (error) {
      console.error('Error searching for users:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { userId } = req.params;
      const { profilePicture, status } = req.body;

      // Update user details in the database
      const updatedUser = await User.findByIdAndUpdate(userId, { status , profilePicture }).select('-password');;


      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return the updated user profile
      res.status(200).json({ user: updatedUser });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  deleteOwnAccount: async (req, res) => {
    try {
      const userId = req.params.userId;

      // Delete the user from the database
      const deletedUser = await User.findByIdAndDelete(userId);

      if (!deletedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return information about the deleted user
      res.status(200).json({ user: deletedUser });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

module.exports = userController;
