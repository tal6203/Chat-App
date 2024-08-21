const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticate = (req, res, next) => {
  const authorizationHeader = req.header('Authorization');

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    console.error('Authorization header is missing or malformed');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authorizationHeader.replace('Bearer ', '');

  if (!token) {
    console.error('Token is missing or malformed');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('Error verifying JWT token:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = { authenticate };