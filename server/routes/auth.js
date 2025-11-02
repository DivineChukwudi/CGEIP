// server/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, auth, collections } = require('../config/firebase');
const { sendVerificationEmail } = require('../utils/email');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, name, ...additionalData } = req.body;

    // Validate required fields
    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate role
    const validRoles = ['admin', 'institution', 'student', 'company'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await db.collection(collections.USERS)
      .where('email', '==', email).get();
    
    if (!existingUser.empty) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Hash password for Firestore
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user document
    const userData = {
      uid: userRecord.uid,
      email,
      password: hashedPassword,
      role,
      name,
      emailVerified: false,
      status: role === 'company' ? 'pending' : 'active', // Companies need admin approval
      createdAt: new Date().toISOString(),
      ...additionalData
    };

    await db.collection(collections.USERS).doc(userRecord.uid).set(userData);

    // OPTION B: Email sending temporarily disabled for testing
    // Send verification email
    // try {
    //   const verificationLink = await auth.generateEmailVerificationLink(email);
    //   await sendVerificationEmail(email, name, verificationLink);
    // } catch (emailError) {
    //   console.log('Email sending failed:', emailError.message);
    //   // Continue without blocking registration
    // }

    res.status(201).json({ 
      message: 'Registration successful! You can now login.',
      uid: userRecord.uid 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user from Firestore
    const usersSnapshot = await db.collection(collections.USERS)
      .where('email', '==', email).get();

    if (usersSnapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    // Check if account is active (for companies)
    if (userData.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended' });
    }

    if (userData.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending admin approval' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userData.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { uid: userData.uid, email: userData.email, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    delete userData.password;

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { uid } = req.body;

    await db.collection(collections.USERS).doc(uid).update({
      emailVerified: true
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;