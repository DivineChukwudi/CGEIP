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
    console.log('🔐 checkRole middleware - user:', req.user?.uid, 'role:', req.user?.role, 'allowed:', allowedRoles);
    
    if (!req.user) {
      console.error('❌ No user in request');
      return res.status(401).json({ error: 'No user context' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      console.error(`❌ User role '${req.user.role}' not in allowed roles:`, allowedRoles);
      return res.status(403).json({ error: 'Access denied', userRole: req.user.role });
    }
    
    console.log('✅ Role check passed');
    next();
  };
};

module.exports = { verifyToken, checkRole };