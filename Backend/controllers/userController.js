const User = require('../models/user');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

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

      const results = await User.find({
        username: { $regex: username, $options: 'i' },
        _id: { $ne: userId }
      }).select('-password');

      // Return the search results
      res.status(200).json({ results });
    } catch (error) {
      console.error('Error searching for users:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
   * @swagger
   * /users/rest-password:
   *   post:
   *     summary: Reset a user's password
   *     tags: [Users]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               token:
   *                 type: string
   *                 description: The JWT reset token
   *               newPassword:
   *                 type: string
   *                 description: The new password
   *     responses:
   *       200:
   *         description: Password reset successful
   *       400:
   *         description: Bad request, e.g., password does not meet criteria or invalid/expired token
   *       500:
   *         description: Internal server error
   */
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      let errors = [];

      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
      }

      // Check password criteria
      if (newPassword.length < 6) {
        errors.push("Password must be at least 6 characters long.");
      }
      if (!/(?=.*[a-z])/.test(newPassword)) {
        errors.push("Password must contain at least one lowercase letter.");
      }
      if (!/(?=.*[A-Z])/.test(newPassword)) {
        errors.push("Password must contain at least one uppercase letter.");
      }
      if (!/(?=.*\W)/.test(newPassword)) {
        errors.push("Password must contain at least one special character.");
      }
      if (!/(?=.*\d)/.test(newPassword)) {
        errors.push("Password must contain at least one number.");
      }

      // If there are any errors, return them
      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(" ") });
      }

      // Verify the token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      // Find the user by email
      const user = await User.findOne({ email: decoded.email });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password in the database
      user.password = hashedPassword;
      await user.save();

      // Create a transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER, // Your email address
          pass: process.env.EMAIL_PASS, // Your email password
        },
      });

      // Define email options
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: decoded.email,
        subject: 'Chat-App, Password Reset Successful!',
        html: `
          <p>You can now log in with your new password.</p>
        `,
      };

      // Send the email
      await transporter.sendMail(mailOptions);


      res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
      console.error('Error resetting password:', error);
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
      const updatedUser = await User.findByIdAndUpdate(userId, { status, profilePicture }).select('-password');;


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
