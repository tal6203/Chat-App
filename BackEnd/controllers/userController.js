const User = require('../models/user');
const mongoose = require('mongoose');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and retrieval
 */
const userController = {
 /**
   * @swagger
   * /users:
   *   get:
   *     summary: Retrieve a list of users
   *     tags: [Users]
   *     responses:
   *       200:
   *         description: A list of users
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   _id:
   *                     type: string
   *                   username:
   *                     type: string
   *                   password:
   *                     type: string
   *                   profilePicture:
   *                     type: string
   *                   status:
   *                     type: string
   */
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

  /**
   * @swagger
   * /users/{userId}:
   *   get:
   *     summary: Retrieve a user by ID
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: userId
   *         schema:
   *           type: string
   *         required: true
   *         description: The user ID
   *     responses:
   *       200:
   *         description: A single user
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 _id:
   *                   type: string
   *                 username:
   *                   type: string
   *                 password:
   *                   type: string
   *                 profilePicture:
   *                   type: string
   *                 status:
   *                   type: string
   *       404:
   *         description: User not found
   */
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

  /**
   * @swagger
   * /users/search/{username}:
   *   get:
   *     summary: Search for users by username
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: username
   *         schema:
   *           type: string
   *         required: true
   *         description: The username to search for
   *     responses:
   *       200:
   *         description: A list of matching users
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   _id:
   *                     type: string
   *                   username:
   *                     type: string
   *                   profilePicture:
   *                     type: string
   *                   status:
   *                     type: string
   */
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

   /**
   * @swagger
   * /users/{userId}:
   *   put:
   *     summary: Update a user's profile
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: userId
   *         schema:
   *           type: string
   *         required: true
   *         description: The user ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               profilePicture:
   *                 type: string
   *               status:
   *                 type: string
   *     responses:
   *       200:
   *         description: The updated user profile
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 _id:
   *                   type: string
   *                 username:
   *                   type: string
   *                 profilePicture:
   *                   type: string
   *                 status:
   *                   type: string
   */
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

   /**
   * @swagger
   * /users/{userId}:
   *   delete:
   *     summary: Delete a user's account
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: userId
   *         schema:
   *           type: string
   *         required: true
   *         description: The user ID
   *     responses:
   *       200:
   *         description: Information about the deleted user
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 _id:
   *                   type: string
   *                 username:
   *                   type: string
   *                 profilePicture:
   *                   type: string
   *                 status:
   *                   type: string
   *       404:
   *         description: User not found
   */
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
