// server/routes/auth.js - UPDATED WITH EMAIL VERIFICATION
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user document
    const userData = {
      uid: userRecord.uid,
      email,
      password: hashedPassword,
      role,
      name,
      emailVerified: false,
      verificationToken,
      verificationExpires: verificationExpires.toISOString(),
      status: role === 'company' ? 'pending' : 'active',
      createdAt: new Date().toISOString(),
      ...additionalData
    };

    await db.collection(collections.USERS).doc(userRecord.uid).set(userData);

    // Send verification email
    try {
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}&uid=${userRecord.uid}`;
      await sendVerificationEmail(email, name, verificationLink);
      
      res.status(201).json({ 
        message: 'Registration successful! Please check your email to verify your account.',
        uid: userRecord.uid,
        emailSent: true
      });
    } catch (emailError) {
      console.log('Email sending failed:', emailError.message);
      
      // Still allow registration but notify user
      res.status(201).json({ 
        message: 'Registration successful! Email verification temporarily unavailable. You can still login.',
        uid: userRecord.uid,
        emailSent: false,
        warning: 'Email service unavailable'
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify Email - NEW ENDPOINT
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { uid } = req.query;

    if (!token || !uid) {
      return res.status(400).json({ error: 'Invalid verification link' });
    }

    // Get user document
    const userDoc = await db.collection(collections.USERS).doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Check if already verified
    if (userData.emailVerified) {
      return res.json({ message: 'Email already verified. You can login now.' });
    }

    // Check if token matches
    if (userData.verificationToken !== token) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    // Check if token expired
    const expirationDate = new Date(userData.verificationExpires);
    if (expirationDate < new Date()) {
      return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
    }

    // Verify email in Firebase Auth
    await auth.updateUser(uid, { emailVerified: true });

    // Update Firestore
    await db.collection(collections.USERS).doc(uid).update({
      emailVerified: true,
      verificationToken: null,
      verificationExpires: null,
      verifiedAt: new Date().toISOString()
    });

    res.json({ 
      message: 'Email verified successfully! You can now login.',
      success: true 
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resend Verification Email - NEW ENDPOINT
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const usersSnapshot = await db.collection(collections.USERS)
      .where('email', '==', email).get();

    if (usersSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    // Check if already verified
    if (userData.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Update user document
    await db.collection(collections.USERS).doc(userData.uid).update({
      verificationToken,
      verificationExpires: verificationExpires.toISOString()
    });

    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}&uid=${userData.uid}`;
    await sendVerificationEmail(email, userData.name, verificationLink);

    res.json({ 
      message: 'Verification email sent! Please check your inbox.',
      success: true 
    });
  } catch (error) {
    console.error('Resend verification error:', error);
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

    // Check if account is active
    if (userData.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    if (userData.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending admin approval. You will be notified once approved.' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userData.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Warning if email not verified (but still allow login for testing)
    const emailWarning = !userData.emailVerified 
      ? 'Please verify your email address to access all features.' 
      : null;

    // Generate JWT token
    const token = jwt.sign(
      { uid: userData.uid, email: userData.email, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    delete userData.password;
    delete userData.verificationToken;

    res.json({
      message: 'Login successful',
      token,
      user: userData,
      ...(emailWarning && { warning: emailWarning })
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;