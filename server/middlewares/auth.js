// server/middlewares/auth.js
const jwt = require('jsonwebtoken');
const { db, collections } = require('../config/firebase');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from Firestore
    const userDoc = await db.collection(collections.USERS).doc(decoded.uid).get();
    
    if (!userDoc.exists) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = { uid: decoded.uid, ...userDoc.data() };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Check user role
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

module.exports = { verifyToken, checkRole };