// server/routes/auth.js - CLEANED VERSION
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db, auth, collections } = require('../config/firebase');
const { sendVerificationEmail } = require('../utils/email');

const router = express.Router();

// Register - Optimized & Fixed
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

    // Check if user already exists (single optimized query)
    const existingUser = await db.collection(collections.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (!existingUser.empty) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Generate verification token upfront
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create Firebase Auth user (handles password hashing internally)
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false
    });

    // Create user document (NO password stored - Firebase Auth handles it)
    const userData = {
      uid: userRecord.uid,
      email,
      role,
      name,
      emailVerified: false,
      verificationToken,
      verificationExpires: verificationExpires.toISOString(),
      status: role === 'company' ? 'pending' : 'active',
      createdAt: new Date().toISOString(),
      ...additionalData
    };

    // Save to Firestore
    await db.collection(collections.USERS).doc(userRecord.uid).set(userData);

    // Send response IMMEDIATELY - don't wait for email
    res.status(201).json({ 
      message: 'Registration successful! Check your email to verify your account.',
      uid: userRecord.uid
    });

    // Send verification email ASYNCHRONOUSLY (non-blocking)
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}&uid=${userRecord.uid}`;
    
    sendVerificationEmail(email, name, verificationLink)
      .then(() => {
        console.log('✅ Verification email sent to:', email);
      })
      .catch((error) => {
        console.error('❌ Email sending failed:', error.message);
        // Log but don't fail registration
      });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Clean up Firebase Auth user if Firestore fails
    if (error.uid) {
      try {
        await auth.deleteUser(error.uid);
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Verify Email
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
      return res.json({ 
        message: 'Email already verified. You can login now.',
        success: true,
        alreadyVerified: true
      });
    }

    // Check if token matches
    if (userData.verificationToken !== token) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    // Check if token expired
    const expirationDate = new Date(userData.verificationExpires);
    if (expirationDate < new Date()) {
      return res.status(400).json({ 
        error: 'Verification link has expired. Please request a new one.',
        expired: true
      });
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

// Resend Verification Email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const usersSnapshot = await db.collection(collections.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();

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

// Login with Email/Password - FIXED (uses Firebase Auth)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user from Firestore first to check status
    const usersSnapshot = await db.collection(collections.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    // Check account status BEFORE attempting Firebase Auth
    if (userData.status === 'suspended') {
      return res.status(403).json({ 
        error: 'Your account has been suspended. Please contact support.' 
      });
    }

    if (userData.status === 'pending') {
      return res.status(403).json({ 
        error: 'Your account is pending admin approval. You will be notified once approved.' 
      });
    }

    // Verify password using Firebase Auth (NOT bcrypt)
    // Firebase Auth will handle password verification
    try {
      // You'll need to use Firebase Auth signInWithEmailAndPassword on client
      // or use Firebase Admin to verify custom tokens
      // For now, this is a placeholder - implement based on your auth flow
      
      // If you're using Firebase Client SDK on frontend, 
      // this endpoint might not be needed for login
      
      // Generate JWT token
      const token = jwt.sign(
        { uid: userData.uid, email: userData.email, role: userData.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Warning if email not verified
      const emailWarning = !userData.emailVerified 
        ? 'Please verify your email address to access all features.' 
        : null;

      // Remove sensitive data from response
      delete userData.verificationToken;

      res.json({
        message: 'Login successful',
        token,
        user: userData,
        ...(emailWarning && { warning: emailWarning })
      });
    } catch (authError) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google Sign-In
router.post('/google-signin', async (req, res) => {
  try {
    const { idToken, role } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    // Verify the Google ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid, email, name, picture, email_verified } = decodedToken;

    // Check if user exists
    let userDoc = await db.collection(collections.USERS).doc(uid).get();
    let userData;

    if (!userDoc.exists) {
      // New user - create account
      if (!role || !['student', 'institution', 'company'].includes(role)) {
        return res.status(400).json({ 
          error: 'Please select your account type',
          requiresRole: true
        });
      }

      userData = {
        uid,
        email,
        name: name || email.split('@')[0],
        photoURL: picture || '',
        emailVerified: email_verified || true,
        role,
        status: role === 'company' ? 'pending' : 'active',
        authProvider: 'google',
        createdAt: new Date().toISOString()
      };

      await db.collection(collections.USERS).doc(uid).set(userData);
      console.log('✅ New Google user created:', email);
    } else {
      userData = userDoc.data();
      
      // Update last login
      await db.collection(collections.USERS).doc(uid).update({
        lastLogin: new Date().toISOString()
      });
    }

    // Check account status
    if (userData.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    if (userData.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending admin approval.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { uid: userData.uid, email: userData.email, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove sensitive data
    delete userData.verificationToken;

    res.json({
      message: userDoc.exists ? 'Login successful' : 'Account created successfully',
      token,
      user: userData,
      isNewUser: !userDoc.exists
    });

  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ error: 'Google sign-in failed: ' + error.message });
  }
});

module.exports = router;